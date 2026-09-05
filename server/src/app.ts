import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { corsOrigins } from './config/env.js';
import { logger } from './lib/logger.js';
import { authRouter } from './routes/auth.routes.js';
import { tripsRouter } from './routes/trips.routes.js';
import { activityRouter } from './routes/activities.routes.js';
import { expenseRouter } from './routes/expenses.routes.js';
import { placeSearchRouter } from './routes/places.routes.js';
import { routingRouter } from './routes/routing.routes.js';
import { weatherRouter } from './routes/weather.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { HttpError } from './utils/httpError.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Auth endpoints are the most valuable brute-force target, so they get a
  // tighter limit than the general API.
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true });
  const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/trips', apiLimiter, tripsRouter);
  app.use('/api/activities', apiLimiter, activityRouter);
  app.use('/api/expenses', apiLimiter, expenseRouter);
  app.use('/api/places', apiLimiter, placeSearchRouter);
  app.use('/api/routes', apiLimiter, routingRouter);
  app.use('/api/weather', apiLimiter, weatherRouter);

  app.use((_req, _res, next) => next(HttpError.notFound('Route not found')));
  app.use(errorHandler);

  return app;
}
