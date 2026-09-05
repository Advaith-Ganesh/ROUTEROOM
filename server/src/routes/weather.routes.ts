import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTripRole } from '../middleware/tripAccess.js';
import { getWeatherForDate } from '../services/weather.service.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';

/** Trip-scoped: weather forecast for every day of the trip, at the destination's coordinates. */
export const tripWeatherRouter = Router({ mergeParams: true });

tripWeatherRouter.get(
  '/',
  requireTripRole('VIEWER'),
  asyncHandler(async (req, res) => {
    const trip = await prisma.trip.findUniqueOrThrow({ where: { id: req.params.tripId as string } });
    const days: string[] = [];
    const cursor = new Date(trip.startDate);
    while (cursor <= trip.endDate) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const forecasts = await Promise.all(
      days.map((date) => getWeatherForDate(trip.destinationLat, trip.destinationLon, date)),
    );
    res.json({ forecasts });
  }),
);

/** Not trip-scoped: ad-hoc weather lookup for any coordinates/date (e.g. a single activity). */
export const weatherRouter = Router();
weatherRouter.use(requireAuth);

const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  date: z.string().date(),
});

weatherRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = weatherQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw HttpError.badRequest('Invalid weather query', parsed.error.flatten().fieldErrors);
    }
    const forecast = await getWeatherForDate(parsed.data.lat, parsed.data.lon, parsed.data.date);
    res.json({ forecast });
  }),
);
