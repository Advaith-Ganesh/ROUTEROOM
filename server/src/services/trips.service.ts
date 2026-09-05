import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';

export interface CreateTripInput {
  name: string;
  destinationName: string;
  destinationLat: number;
  destinationLon: number;
  startDate: string;
  endDate: string;
}

function assertValidDateRange(startDate: string, endDate: string) {
  if (new Date(endDate) < new Date(startDate)) {
    throw HttpError.badRequest('Trip end date must be on or after the start date');
  }
}

export async function listTripsForUser(userId: string) {
  const memberships = await prisma.tripMember.findMany({
    where: { userId },
    include: {
      trip: {
        include: {
          _count: { select: { activities: true, members: true } },
        },
      },
    },
    orderBy: { trip: { startDate: 'desc' } },
  });

  return memberships.map((m) => ({
    ...m.trip,
    role: m.role,
    activityCount: m.trip._count.activities,
    memberCount: m.trip._count.members,
  }));
}

export async function createTrip(ownerId: string, input: CreateTripInput) {
  assertValidDateRange(input.startDate, input.endDate);

  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        name: input.name,
        destinationName: input.destinationName,
        destinationLat: input.destinationLat,
        destinationLon: input.destinationLon,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        ownerId,
      },
    });
    await tx.tripMember.create({
      data: { tripId: trip.id, userId: ownerId, role: 'OWNER' },
    });
    return trip;
  });
}

export async function getTrip(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!trip) {
    throw HttpError.notFound('Trip not found');
  }
  return trip;
}

export interface UpdateTripInput {
  name?: string;
  destinationName?: string;
  destinationLat?: number;
  destinationLon?: number;
  startDate?: string;
  endDate?: string;
}

export async function updateTrip(tripId: string, input: UpdateTripInput) {
  const existing = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  const startDate = input.startDate ?? existing.startDate.toISOString();
  const endDate = input.endDate ?? existing.endDate.toISOString();
  assertValidDateRange(startDate, endDate);

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
  });
}

export async function deleteTrip(tripId: string) {
  await prisma.trip.delete({ where: { id: tripId } });
}

/** Copies a trip's core details and saved places into a brand-new trip owned by the caller. */
export async function duplicateTrip(tripId: string, newOwnerId: string) {
  const source = await prisma.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: { places: true },
  });

  return prisma.$transaction(async (tx) => {
    const copy = await tx.trip.create({
      data: {
        name: `${source.name} (copy)`,
        destinationName: source.destinationName,
        destinationLat: source.destinationLat,
        destinationLon: source.destinationLon,
        startDate: source.startDate,
        endDate: source.endDate,
        ownerId: newOwnerId,
        places: {
          create: source.places.map((p) => ({
            externalId: p.externalId,
            name: p.name,
            address: p.address,
            category: p.category,
            lat: p.lat,
            lon: p.lon,
            source: p.source,
          })),
        },
      },
    });
    await tx.tripMember.create({
      data: { tripId: copy.id, userId: newOwnerId, role: 'OWNER' },
    });
    return copy;
  });
}
