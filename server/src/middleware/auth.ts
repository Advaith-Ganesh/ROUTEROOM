import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/auth.service.js';
import { HttpError } from '../utils/httpError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) {
    return next(HttpError.unauthorized());
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(HttpError.unauthorized('Session expired, please log in again'));
  }
}
