import { Router } from 'express';
import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTripRole } from '../middleware/tripAccess.js';
import * as activities from '../services/activities.service.js';
import { analyzeItinerary } from '../services/itinerary.service.js';
import { broadcastTripUpdate } from '../realtime/ws.js';

const activityInputSchema = z.object({
  placeId: z.string().uuid(),
  date: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  notes: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(['PLANNED', 'CONFIRMED', 'CANCELLED']).optional(),
});

const reorderSchema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), orderIndex: z.number().int().min(0) })),
});

/** Trip-scoped: list/create/reorder activities, and the computed itinerary analysis. */
export const tripActivitiesRouter = Router({ mergeParams: true });

tripActivitiesRouter.get(
  '/',
  requireTripRole('VIEWER'),
  asyncHandler(async (req, res) => {
    const list = await activities.listActivities(req.params.tripId as string);
    res.json({ activities: list });
  }),
);

tripActivitiesRouter.post(
  '/',
  requireTripRole('EDITOR'),
  asyncHandler(async (req, res) => {
    const input = activityInputSchema.parse(req.body);
    const activity = await activities.createActivity(req.params.tripId as string, input);
    broadcastTripUpdate(req.params.tripId as string, 'activity:created');
    res.status(201).json({ activity });
  }),
);

tripActivitiesRouter.post(
  '/reorder',
  requireTripRole('EDITOR'),
  asyncHandler(async (req, res) => {
    const input = reorderSchema.parse(req.body);
    const list = await activities.reorderActivities(req.params.tripId as string, input.order);
    broadcastTripUpdate(req.params.tripId as string, 'activity:reordered');
    res.json({ activities: list });
  }),
);

tripActivitiesRouter.get(
  '/analysis',
  requireTripRole('VIEWER'),
  asyncHandler(async (req, res) => {
    const days = await analyzeItinerary(req.params.tripId as string);
    res.json({ days });
  }),
);

/** Not nested: PATCH/DELETE by activity id, resolving the trip role via the activity's own tripId. */
export const activityRouter = Router();
activityRouter.use(requireAuth);

async function loadActivityRole(req: Request, _res: Response, next: NextFunction) {
  const activity = await activities.getActivityWithTrip(req.params.activityId as string);
  req.params.tripId = activity.tripId;
  next();
}

activityRouter.patch(
  '/:activityId',
  asyncHandler(loadActivityRole),
  requireTripRole('EDITOR'),
  asyncHandler(async (req, res) => {
    const input = activityInputSchema.partial().parse(req.body);
    const activity = await activities.updateActivity(req.params.activityId as string, input);
    broadcastTripUpdate(req.params.tripId as string, 'activity:updated');
    res.json({ activity });
  }),
);

activityRouter.delete(
  '/:activityId',
  asyncHandler(loadActivityRole),
  requireTripRole('EDITOR'),
  asyncHandler(async (req, res) => {
    await activities.deleteActivity(req.params.activityId as string);
    broadcastTripUpdate(req.params.tripId as string, 'activity:deleted');
    res.status(204).send();
  }),
);
