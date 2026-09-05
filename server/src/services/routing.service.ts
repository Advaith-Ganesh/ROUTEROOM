import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days -- road/path geometry rarely changes.

export type TravelProfile = 'walking' | 'driving';

export interface RouteResult {
  profile: TravelProfile;
  durationSec: number;
  distanceM: number;
}

interface OsrmResponse {
  code: string;
  routes?: { duration: number; distance: number }[];
}

// FOSSGIS's public OSRM deployment splits profiles across subpaths, unlike
// the single-profile router.project-osrm.org demo -- this is why we use it.
const PROFILE_PATHS: Record<TravelProfile, string> = {
  walking: 'routed-foot/route/v1/foot',
  driving: 'routed-car/route/v1/driving',
};

function round(value: number) {
  return Math.round(value * 1e5) / 1e5; // ~1m precision, plenty for cache bucketing.
}

function cacheKey(fromLat: number, fromLon: number, toLat: number, toLon: number, profile: TravelProfile) {
  return `${profile}:${round(fromLat)},${round(fromLon)}:${round(toLat)},${round(toLon)}`;
}

export async function getRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  profile: TravelProfile,
): Promise<RouteResult> {
  const key = cacheKey(fromLat, fromLon, toLat, toLon, profile);
  const cached = await prisma.routeCache.findUnique({ where: { cacheKey: key } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return { profile, durationSec: cached.durationSec, distanceM: cached.distanceM };
  }

  const url = new URL(
    `/${PROFILE_PATHS[profile]}/${fromLon},${fromLat};${toLon},${toLat}`,
    env.OSRM_BASE_URL,
  );
  url.searchParams.set('overview', 'false');

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw HttpError.badGateway('Route information is temporarily unavailable.');
  }

  if (!response.ok) {
    throw HttpError.badGateway('Route information is temporarily unavailable.');
  }

  const data = (await response.json()) as OsrmResponse;
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw HttpError.badGateway('No route could be found between these locations.');
  }

  const result: RouteResult = {
    profile,
    durationSec: data.routes[0].duration,
    distanceM: data.routes[0].distance,
  };

  await prisma.routeCache.upsert({
    where: { cacheKey: key },
    create: { cacheKey: key, durationSec: result.durationSec, distanceM: result.distanceM },
    update: { durationSec: result.durationSec, distanceM: result.distanceM, fetchedAt: new Date() },
  });

  return result;
}
