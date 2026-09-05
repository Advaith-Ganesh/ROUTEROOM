import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';

export interface ExpenseParticipantInput {
  userId: string;
  shareCents?: number;
}

export interface CreateExpenseInput {
  description: string;
  amountCents: number;
  currency?: string;
  paidByUserId: string;
  participants: ExpenseParticipantInput[];
}

/** Splits an amount evenly across participants, handing any leftover cent(s) to the first participants so the shares always sum exactly to the total. */
export function splitEqually(amountCents: number, participantCount: number): number[] {
  const base = Math.floor(amountCents / participantCount);
  const remainder = amountCents - base * participantCount;
  return Array.from({ length: participantCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

function assertValidExpenseInput(input: CreateExpenseInput) {
  if (input.amountCents <= 0) {
    throw HttpError.badRequest('Expense amount must be greater than zero');
  }
  if (input.participants.length === 0) {
    throw HttpError.badRequest('An expense needs at least one participant');
  }
  const userIds = input.participants.map((p) => p.userId);
  if (new Set(userIds).size !== userIds.length) {
    throw HttpError.badRequest('Each participant can only appear once on an expense');
  }
  const hasCustomShares = input.participants.some((p) => p.shareCents !== undefined);
  if (hasCustomShares) {
    if (!input.participants.every((p) => p.shareCents !== undefined)) {
      throw HttpError.badRequest('Provide a share for every participant, or none for an equal split');
    }
    const total = input.participants.reduce((sum, p) => sum + (p.shareCents ?? 0), 0);
    if (total !== input.amountCents) {
      throw HttpError.badRequest('Participant shares must add up to the total expense amount');
    }
    if (input.participants.some((p) => (p.shareCents ?? 0) < 0)) {
      throw HttpError.badRequest('A participant share cannot be negative');
    }
  }
}

export async function createExpense(tripId: string, input: CreateExpenseInput) {
  assertValidExpenseInput(input);

  const hasCustomShares = input.participants.some((p) => p.shareCents !== undefined);
  const shares = hasCustomShares
    ? input.participants.map((p) => p.shareCents as number)
    : splitEqually(input.amountCents, input.participants.length);

  return prisma.expense.create({
    data: {
      tripId,
      description: input.description,
      amountCents: input.amountCents,
      currency: input.currency ?? 'GBP',
      paidByUserId: input.paidByUserId,
      participants: {
        create: input.participants.map((p, i) => ({ userId: p.userId, shareCents: shares[i] as number })),
      },
    },
    include: { participants: { include: { user: { select: { id: true, name: true } } } } },
  });
}

export async function listExpenses(tripId: string) {
  return prisma.expense.findMany({
    where: { tripId },
    include: {
      paidBy: { select: { id: true, name: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteExpense(tripId: string, expenseId: string) {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.tripId !== tripId) {
    throw HttpError.notFound('Expense not found on this trip');
  }
  await prisma.expense.delete({ where: { id: expenseId } });
}

export interface Balance {
  userId: string;
  name: string;
  netCents: number;
}

export interface Settlement {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
}

/**
 * Nets every expense into a per-user balance, then greedily matches the
 * largest debtor against the largest creditor to produce the smallest
 * possible set of settle-up transactions (classic debt-simplification).
 */
export async function calculateBalances(tripId: string): Promise<{ balances: Balance[]; settlements: Settlement[] }> {
  const expenses = await listExpenses(tripId);

  const netByUser = new Map<string, { name: string; net: number }>();
  const touch = (userId: string, name: string) => {
    if (!netByUser.has(userId)) netByUser.set(userId, { name, net: 0 });
    return netByUser.get(userId)!;
  };

  for (const expense of expenses) {
    touch(expense.paidByUserId, expense.paidBy.name).net += expense.amountCents;
    for (const participant of expense.participants) {
      touch(participant.userId, participant.user.name).net -= participant.shareCents;
    }
  }

  const balances: Balance[] = Array.from(netByUser.entries()).map(([userId, v]) => ({
    userId,
    name: v.name,
    netCents: v.net,
  }));

  const creditors = balances.filter((b) => b.netCents > 0).map((b) => ({ ...b })).sort((a, b) => b.netCents - a.netCents);
  const debtors = balances.filter((b) => b.netCents < 0).map((b) => ({ ...b, netCents: -b.netCents })).sort((a, b) => b.netCents - a.netCents);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.netCents, creditor.netCents);
    if (amount > 0) {
      settlements.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amountCents: amount,
      });
    }
    debtor.netCents -= amount;
    creditor.netCents -= amount;
    if (debtor.netCents === 0) i += 1;
    if (creditor.netCents === 0) j += 1;
  }

  return { balances, settlements };
}
