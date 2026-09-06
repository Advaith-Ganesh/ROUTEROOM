import { prisma } from '../lib/prisma.js';
import { getRoute } from './routing.service.js';

const DEFAULT_ACTIVITY_DURATION_MIN = 60; // Assumed length when an activity has no end time.
const PACKED_DAY_ACTIVITY_THRESHOLD = 5;
const PACKED_DAY_TRAVEL_MINUTES_THRESHOLD = 120;

interface ActivityWithPlace {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date | null;
  place: { lat: number; lon: number; name: string };
}

export interface TravelSegment {
  fromActivityId: string;
  toActivityId: string;
  available: boolean;
  reason?: string;
  durationMin?: number;
  distanceKm?: number;
  gapMin?: number;
  conflict?: boolean;
}

export interface DayWarning {
  type: 'OUT_OF_RANGE' | 'OVERLAP' | 'TRAVEL_CONFLICT' | 'PACKED_DAY';
  message: string;
  activityIds: string[];
}

export interface DayAnalysis {
  date: string;
  activityCount: number;
  totalTravelMinutes: number;
  isPacked: boolean;
  travelSegments: TravelSegment[];
  warnings: DayWarning[];
}

function effectiveEndMs(activity: ActivityWithPlace) {
  return activity.endTime
    ? activity.endTime.getTime()
    : activity.startTime.getTime() + DEFAULT_ACTIVITY_DURATION_MIN * 60_000;
}

/**
 * Recomputes every scheduling signal for a trip's itinerary: date-range
 * violations, overlapping activities, travel time vs. available gap
 * (calling the routing service per consecutive pair, walking profile), and
 * "packed day" flags. Nothing here is hard-coded -- it's derived fresh from
 * the stored activities and a live routing lookup each time it's requested.
 */
export async function analyzeItinerary(tripId: string): Promise<DayAnalysis[]> {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  const activities = await prisma.activity.findMany({
    where: { tripId },
    include: { place: { select: { lat: true, lon: true, name: true } } },
    orderBy: [{ date: 'asc' }, { orderIndex: 'asc' }, { startTime: 'asc' }],
  });

  const byDate = new Map<string, ActivityWithPlace[]>();
  for (const activity of activities) {
    const dateKey = activity.date.toISOString().slice(0, 10);
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(activity);
  }

  // Each day's analysis is independent, and within a day every consecutive
  // pair's routing lookup is independent too -- both loops used to await
  // getRoute() one call at a time, so a day with N activities made N-1
  // round trips to OSRM in series. Running them concurrently turns that
  // into one round-trip's worth of latency regardless of itinerary size
  // (routing.service's own cache still dedupes repeated pairs).
  const results = await Promise.all(
    Array.from(byDate.entries()).map(([dateKey, dayActivities]) =>
      analyzeDay(dateKey, dayActivities, trip),
    ),
  );

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

async function analyzeDay(
  dateKey: string,
  dayActivities: ActivityWithPlace[],
  trip: { startDate: Date; endDate: Date },
): Promise<DayAnalysis> {
  const sorted = [...dayActivities].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const warnings: DayWarning[] = [];

  const dayStart = new Date(`${dateKey}T00:00:00.000Z`);
  if (dayStart < trip.startDate || dayStart > trip.endDate) {
    warnings.push({
      type: 'OUT_OF_RANGE',
      message: `${dateKey} falls outside the trip's ${trip.startDate.toISOString().slice(0, 10)} - ${trip.endDate.toISOString().slice(0, 10)} date range.`,
      activityIds: sorted.map((a) => a.id),
    });
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    if (effectiveEndMs(current) > next.startTime.getTime()) {
      warnings.push({
        type: 'OVERLAP',
        message: `"${current.place.name}" overlaps with "${next.place.name}".`,
        activityIds: [current.id, next.id],
      });
    }
  }

  const pairs = sorted.slice(0, -1).map((current, i) => ({ current, next: sorted[i + 1]! }));
  const travelSegments = await Promise.all(pairs.map(({ current, next }) => computeTravelSegment(current, next)));

  let totalTravelMinutes = 0;
  travelSegments.forEach((segment, i) => {
    if (!segment.available) return;
    totalTravelMinutes += segment.durationMin!;
    if (segment.conflict) {
      const { current, next } = pairs[i]!;
      warnings.push({
        type: 'TRAVEL_CONFLICT',
        message: `Travel from "${current.place.name}" to "${next.place.name}" takes about ${Math.round(segment.durationMin!)} min, but only ${Math.max(0, Math.round(segment.gapMin!))} min is available.`,
        activityIds: [current.id, next.id],
      });
    }
  });

  const isPacked =
    sorted.length >= PACKED_DAY_ACTIVITY_THRESHOLD ||
    totalTravelMinutes >= PACKED_DAY_TRAVEL_MINUTES_THRESHOLD;

  if (isPacked) {
    const hours = Math.floor(totalTravelMinutes / 60);
    const minutes = Math.round(totalTravelMinutes % 60);
    warnings.push({
      type: 'PACKED_DAY',
      message: `This day contains ${sorted.length} scheduled activities and approximately ${hours}h ${minutes}m of travel.`,
      activityIds: sorted.map((a) => a.id),
    });
  }

  return {
    date: dateKey,
    activityCount: sorted.length,
    totalTravelMinutes,
    isPacked,
    travelSegments,
    warnings,
  };
}

async function computeTravelSegment(
  current: ActivityWithPlace,
  next: ActivityWithPlace,
): Promise<TravelSegment> {
  const gapMin = (next.startTime.getTime() - effectiveEndMs(current)) / 60_000;

  try {
    const route = await getRoute(current.place.lat, current.place.lon, next.place.lat, next.place.lon, 'walking');
    const durationMin = route.durationSec / 60;
    return {
      fromActivityId: current.id,
      toActivityId: next.id,
      available: true,
      durationMin,
      distanceKm: route.distanceM / 1000,
      gapMin,
      conflict: durationMin > gapMin,
    };
  } catch {
    return {
      fromActivityId: current.id,
      toActivityId: next.id,
      available: false,
      reason: 'Route information is temporarily unavailable.',
      gapMin,
    };
  }
}
