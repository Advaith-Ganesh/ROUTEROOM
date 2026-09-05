import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTripRole } from '../middleware/tripAccess.js';
import * as trips from '../services/trips.service.js';
import { membersRouter } from './members.routes.js';
import { placesRouter } from './places.routes.js';
import { tripActivitiesRouter } from './activities.routes.js';
import { tripExpensesRouter } from './expenses.routes.js';
import { tripWeatherRouter } from './weather.routes.js';

export const tripsRouter = Router();
tripsRouter.use(requireAuth);

const tripInputSchema = z.object({
  name: z.string().min(1).max(200),
  destinationName: z.string().min(1).max(200),
  destinationLat: z.number().min(-90).max(90),
  destinationLon: z.number().min(-180).max(180),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

tripsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const list = await trips.listTripsForUser(req.user!.id);
    res.json({ trips: list });
  }),
);

tripsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = tripInputSchema.parse(req.body);
    const trip = await trips.createTrip(req.user!.id, input);
    res.status(201).json({ trip });
  }),
);

tripsRouter.get(
  '/:tripId',
  requireTripRole('VIEWER'),
  asyncHandler(async (req, res) => {
    const trip = await trips.getTrip(req.params.tripId as string);
    res.json({ trip, role: req.tripMembership!.role });
  }),
);

tripsRouter.patch(
  '/:tripId',
  requireTripRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = tripInputSchema.partial().parse(req.body);
    const trip = await trips.updateTrip(req.params.tripId as string, input);
    res.json({ trip });
  }),
);

tripsRouter.delete(
  '/:tripId',
  requireTripRole('OWNER'),
  asyncHandler(async (req, res) => {
    await trips.deleteTrip(req.params.tripId as string);
    res.status(204).send();
  }),
);

tripsRouter.post(
  '/:tripId/duplicate',
  requireTripRole('VIEWER'),
  asyncHandler(async (req, res) => {
    const trip = await trips.duplicateTrip(req.params.tripId as string, req.user!.id);
    res.status(201).json({ trip });
  }),
);

tripsRouter.use('/:tripId/members', membersRouter);
tripsRouter.use('/:tripId/places', placesRouter);
tripsRouter.use('/:tripId/activities', tripActivitiesRouter);
tripsRouter.use('/:tripId/expenses', tripExpensesRouter);
tripsRouter.use('/:tripId/weather', tripWeatherRouter);
