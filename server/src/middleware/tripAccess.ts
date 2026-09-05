import type { NextFunction, Request, Response } from 'express';
import { TripRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tripMembership?: { tripId: string; role: TripRole };
    }
  }
}

const roleRank: Record<TripRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

/**
 * Loads the caller's membership for req.params.tripId and rejects if they
 * aren't a member, or don't hold at least `minRole`. This is the single
 * authorization gate every trip-scoped route relies on -- the frontend
 * hiding buttons is not treated as access control anywhere in this API.
 */
export function requireTripRole(minRole: TripRole) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const tripId = req.params.tripId ?? req.params.id;
    if (!tripId) {
      return next(HttpError.badRequest('Missing trip id'));
    }
    if (!req.user) {
      return next(HttpError.unauthorized());
    }

    const membership = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: req.user.id } },
    });

    if (!membership) {
      return next(HttpError.notFound('Trip not found'));
    }

    if (roleRank[membership.role] < roleRank[minRole]) {
      return next(HttpError.forbidden('Your role on this trip does not allow this action'));
    }

    req.tripMembership = { tripId, role: membership.role };
    next();
  };
}
