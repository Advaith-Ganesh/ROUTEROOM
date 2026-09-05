import { Router } from 'express';
import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTripRole } from '../middleware/tripAccess.js';
import * as expenses from '../services/expenses.service.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';
import { broadcastTripUpdate } from '../realtime/ws.js';

const expenseInputSchema = z.object({
  description: z.string().min(1).max(200),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  paidByUserId: z.string().uuid(),
  participants: z
    .array(z.object({ userId: z.string().uuid(), shareCents: z.number().int().nonnegative().optional() }))
    .min(1),
});

/** Trip-scoped: list expenses + balances, and create a new expense. */
export const tripExpensesRouter = Router({ mergeParams: true });

tripExpensesRouter.get(
  '/',
  requireTripRole('VIEWER'),
  asyncHandler(async (req, res) => {
    const tripId = req.params.tripId as string;
    const [list, balances] = await Promise.all([
      expenses.listExpenses(tripId),
      expenses.calculateBalances(tripId),
    ]);
    res.json({ expenses: list, ...balances });
  }),
);

tripExpensesRouter.post(
  '/',
  requireTripRole('EDITOR'),
  asyncHandler(async (req, res) => {
    const tripId = req.params.tripId as string;
    const input = expenseInputSchema.parse(req.body);

    const memberIds = new Set(
      (await prisma.tripMember.findMany({ where: { tripId }, select: { userId: true } })).map(
        (m) => m.userId,
      ),
    );
    for (const p of [input.paidByUserId, ...input.participants.map((x) => x.userId)]) {
      if (!memberIds.has(p)) {
        throw HttpError.badRequest('All payers and participants must be members of this trip');
      }
    }

    const expense = await expenses.createExpense(tripId, input);
    broadcastTripUpdate(tripId, 'expense:created');
    res.status(201).json({ expense });
  }),
);

/** Not nested: DELETE by expense id, resolving the trip role via the expense's own tripId. */
export const expenseRouter = Router();
expenseRouter.use(requireAuth);

async function loadExpenseRole(req: Request, _res: Response, next: NextFunction) {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.expenseId as string } });
  if (!expense) {
    return next(HttpError.notFound('Expense not found'));
  }
  req.params.tripId = expense.tripId;
  next();
}

expenseRouter.delete(
  '/:expenseId',
  asyncHandler(loadExpenseRole),
  requireTripRole('EDITOR'),
  asyncHandler(async (req, res) => {
    await expenses.deleteExpense(req.params.tripId as string, req.params.expenseId as string);
    broadcastTripUpdate(req.params.tripId as string, 'expense:deleted');
    res.status(204).send();
  }),
);
