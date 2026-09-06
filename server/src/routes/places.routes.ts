import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTripRole } from '../middleware/tripAccess.js';
import { searchPlaces } from '../services/geocoding.service.js';
import * as places from '../services/places.service.js';
import { HttpError } from '../utils/httpError.js';
import { broadcastTripUpdate } from '../realtime/ws.js';

/** Trip-scoped: list saved places / save a search result / remove a saved place. */
export const placesRouter = Router({ mergeParams: true });

const saveSchema = z.object({
  externalId: z.string(),
  name: z.string().min(1),
  address: z.string(),
  category: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
});

placesRouter.get(
  '/',
  requireTripRole('VIEWER'),
  asyncHandler(async (req, res) => {
    const list = await places.listPlaces(req.params.tripId as string);
    res.json({ places: list });
  }),
);

placesRouter.post(
  '/',
  requireTripRole('EDITOR'),
  asyncHandler(async (req, res) => {
    const input = saveSchema.parse(req.body);
    const place = await places.savePlace(req.params.tripId as string, input);
    broadcastTripUpdate(req.params.tripId as string, 'place:created');
    res.status(201).json({ place });
  }),
);

placesRouter.delete(
  '/:placeId',
  requireTripRole('EDITOR'),
  asyncHandler(async (req, res) => {
    await places.deletePlace(req.params.tripId as string, req.params.placeId as string);
    broadcastTripUpdate(req.params.tripId as string, 'place:deleted');
    res.status(204).send();
  }),
);

/** Not trip-scoped: proxies a live place search to Nominatim. */
export const placeSearchRouter = Router();
placeSearchRouter.use(requireAuth);

const searchQuerySchema = z.object({ q: z.string().min(2, 'Search query must be at least 2 characters') });

placeSearchRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw HttpError.badRequest('Invalid search query', parsed.error.flatten().fieldErrors);
    }
    const results = await searchPlaces(parsed.data.q);
    res.json({ results });
  }),
);
