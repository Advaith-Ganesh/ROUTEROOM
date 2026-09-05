import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireTripRole } from '../middleware/tripAccess.js';
import * as members from '../services/members.service.js';

export const membersRouter = Router({ mergeParams: true });

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['EDITOR', 'VIEWER']),
});

const roleSchema = z.object({ role: z.enum(['EDITOR', 'VIEWER']) });

membersRouter.get(
  '/',
  requireTripRole('VIEWER'),
  asyncHandler(async (req, res) => {
    const list = await members.listMembers(req.params.tripId as string);
    res.json({ members: list });
  }),
);

membersRouter.post(
  '/',
  requireTripRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = inviteSchema.parse(req.body);
    const member = await members.inviteMember(req.params.tripId as string, input.email, input.role);
    res.status(201).json({ member });
  }),
);

membersRouter.patch(
  '/:memberId',
  requireTripRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = roleSchema.parse(req.body);
    const member = await members.updateMemberRole(
      req.params.tripId as string,
      req.params.memberId as string,
      input.role,
    );
    res.json({ member });
  }),
);

membersRouter.delete(
  '/:memberId',
  requireTripRole('OWNER'),
  asyncHandler(async (req, res) => {
    await members.removeMember(req.params.tripId as string, req.params.memberId as string);
    res.status(204).send();
  }),
);
