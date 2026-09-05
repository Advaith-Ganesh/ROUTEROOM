import { ActivityStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';

export interface CreateActivityInput {
  placeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string | null; // HH:mm
  notes?: string;
  category?: string;
  status?: ActivityStatus;
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00.000Z`);
}

async function assertWithinTripRange(tripId: string, date: string) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  const day = new Date(`${date}T00:00:00.000Z`);
  if (day < trip.startDate || day > trip.endDate) {
    throw HttpError.badRequest("This date falls outside the trip's date range");
  }
}

function assertValidTimes(startTime: string, endTime?: string | null) {
  if (endTime && endTime <= startTime) {
    throw HttpError.badRequest('End time must be after the start time');
  }
}

export async function listActivities(tripId: string) {
  return prisma.activity.findMany({
    where: { tripId },
    include: { place: true },
    orderBy: [{ date: 'asc' }, { orderIndex: 'asc' }, { startTime: 'asc' }],
  });
}

export async function createActivity(tripId: string, input: CreateActivityInput) {
  await assertWithinTripRange(tripId, input.date);
  assertValidTimes(input.startTime, input.endTime);

  const place = await prisma.place.findUnique({ where: { id: input.placeId } });
  if (!place || place.tripId !== tripId) {
    throw HttpError.badRequest('That place has not been saved to this trip yet');
  }

  const siblingCount = await prisma.activity.count({
    where: { tripId, date: new Date(`${input.date}T00:00:00.000Z`) },
  });

  return prisma.activity.create({
    data: {
      tripId,
      placeId: input.placeId,
      date: new Date(`${input.date}T00:00:00.000Z`),
      startTime: toDateTime(input.date, input.startTime),
      endTime: input.endTime ? toDateTime(input.date, input.endTime) : null,
      notes: input.notes,
      category: input.category,
      status: input.status ?? 'PLANNED',
      orderIndex: siblingCount,
    },
    include: { place: true },
  });
}

export interface UpdateActivityInput {
  placeId?: string;
  date?: string;
  startTime?: string;
  endTime?: string | null;
  notes?: string;
  category?: string;
  status?: ActivityStatus;
}

export async function updateActivity(activityId: string, input: UpdateActivityInput) {
  const existing = await prisma.activity.findUniqueOrThrow({ where: { id: activityId } });
  const date = input.date ?? existing.date.toISOString().slice(0, 10);
  const startTime = input.startTime ?? existing.startTime.toISOString().slice(11, 16);
  const endTime =
    input.endTime !== undefined ? input.endTime : existing.endTime?.toISOString().slice(11, 16);

  await assertWithinTripRange(existing.tripId, date);
  assertValidTimes(startTime, endTime ?? null);

  if (input.placeId) {
    const place = await prisma.place.findUnique({ where: { id: input.placeId } });
    if (!place || place.tripId !== existing.tripId) {
      throw HttpError.badRequest('That place has not been saved to this trip yet');
    }
  }

  return prisma.activity.update({
    where: { id: activityId },
    data: {
      placeId: input.placeId,
      date: input.date ? new Date(`${date}T00:00:00.000Z`) : undefined,
      startTime: toDateTime(date, startTime),
      endTime: endTime ? toDateTime(date, endTime) : null,
      notes: input.notes,
      category: input.category,
      status: input.status,
    },
    include: { place: true },
  });
}

export async function deleteActivity(activityId: string) {
  await prisma.activity.delete({ where: { id: activityId } });
}

export async function getActivityWithTrip(activityId: string) {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) {
    throw HttpError.notFound('Activity not found');
  }
  return activity;
}

export interface ReorderInput {
  id: string;
  orderIndex: number;
}

export async function reorderActivities(tripId: string, order: ReorderInput[]) {
  await prisma.$transaction(
    order.map(({ id, orderIndex }) =>
      prisma.activity.updateMany({ where: { id, tripId }, data: { orderIndex } }),
    ),
  );
  return listActivities(tripId);
}
