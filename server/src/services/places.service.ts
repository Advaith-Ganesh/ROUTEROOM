import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';
import type { GeocodeResult } from './geocoding.service.js';

export async function listPlaces(tripId: string) {
  return prisma.place.findMany({ where: { tripId }, orderBy: { createdAt: 'asc' } });
}

/** Persists a chosen search result to the trip so we never re-query Nominatim for it. */
export async function savePlace(tripId: string, result: GeocodeResult) {
  return prisma.place.create({
    data: {
      tripId,
      externalId: result.externalId,
      name: result.name,
      address: result.address,
      category: result.category,
      lat: result.lat,
      lon: result.lon,
      source: 'nominatim',
    },
  });
}

export async function deletePlace(tripId: string, placeId: string) {
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place || place.tripId !== tripId) {
    throw HttpError.notFound('Place not found on this trip');
  }
  const activityCount = await prisma.activity.count({ where: { placeId } });
  if (activityCount > 0) {
    throw HttpError.conflict('Remove this place from the itinerary before deleting it');
  }
  await prisma.place.delete({ where: { id: placeId } });
}
