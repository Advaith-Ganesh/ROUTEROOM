import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days -- place metadata rarely changes.
const USER_AGENT = 'RouteRoom-Student-Project/0.1 (https://github.com; contact via repo issues)';

export interface GeocodeResult {
  externalId: string;
  name: string;
  address: string;
  category: string | null;
  lat: number;
  lon: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  name?: string;
  address?: Record<string, string>;
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function toGeocodeResult(raw: NominatimResult): GeocodeResult {
  return {
    externalId: String(raw.place_id),
    name: raw.name || raw.display_name.split(',')[0] || raw.display_name,
    address: raw.display_name,
    category: raw.type ?? raw.class ?? null,
    lat: Number.parseFloat(raw.lat),
    lon: Number.parseFloat(raw.lon),
  };
}

/**
 * Searches places via Nominatim (OpenStreetMap), with a DB-backed cache.
 * Nominatim's usage policy caps public clients at ~1 request/second and
 * requires a descriptive User-Agent -- the cache keeps repeat searches for
 * the same query from re-hitting the API at all.
 */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  const cached = await prisma.geocodeCache.findUnique({ where: { query: normalized } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cached.resultsJson as unknown as GeocodeResult[];
  }

  const url = new URL('/search', env.NOMINATIM_BASE_URL);
  url.searchParams.set('q', normalized);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('limit', '10');

  let response: Response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  } catch {
    throw HttpError.badGateway('Place search is temporarily unavailable. Please try again shortly.');
  }

  if (!response.ok) {
    throw HttpError.badGateway('Place search is temporarily unavailable. Please try again shortly.');
  }

  const raw = (await response.json()) as NominatimResult[];
  const results = raw.map(toGeocodeResult);

  await prisma.geocodeCache.upsert({
    where: { query: normalized },
    create: { query: normalized, resultsJson: results as unknown as object },
    update: { resultsJson: results as unknown as object, fetchedAt: new Date() },
  });

  return results;
}
