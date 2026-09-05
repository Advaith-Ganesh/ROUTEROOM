import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { getRoute } from '../services/routing.service.js';
import { HttpError } from '../utils/httpError.js';

/** Ad-hoc route lookup between any two coordinates (e.g. destination -> a place before saving it). */
export const routingRouter = Router();
routingRouter.use(requireAuth);

const routeQuerySchema = z.object({
  fromLat: z.coerce.number().min(-90).max(90),
  fromLon: z.coerce.number().min(-180).max(180),
  toLat: z.coerce.number().min(-90).max(90),
  toLon: z.coerce.number().min(-180).max(180),
  profile: z.enum(['walking', 'driving']).default('walking'),
});

routingRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = routeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw HttpError.badRequest('Invalid route query', parsed.error.flatten().fieldErrors);
    }
    const { fromLat, fromLon, toLat, toLon, profile } = parsed.data;
    const route = await getRoute(fromLat, fromLon, toLat, toLon, profile);
    res.json({ route });
  }),
);
