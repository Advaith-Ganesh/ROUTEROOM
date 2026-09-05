export type TripRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type ActivityStatus = 'PLANNED' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Trip {
  id: string;
  name: string;
  destinationName: string;
  destinationLat: number;
  destinationLon: number;
  startDate: string;
  endDate: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripSummary extends Trip {
  role: TripRole;
  activityCount: number;
  memberCount: number;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  role: TripRole;
  user: { id: string; name: string; email: string };
}

export interface Place {
  id: string;
  tripId: string;
  externalId: string | null;
  name: string;
  address: string | null;
  category: string | null;
  lat: number;
  lon: number;
  source: string;
}

export interface PlaceSearchResult {
  externalId: string;
  name: string;
  address: string;
  category: string | null;
  lat: number;
  lon: number;
}

export interface Activity {
  id: string;
  tripId: string;
  placeId: string;
  place: Place;
  date: string;
  startTime: string;
  endTime: string | null;
  notes: string | null;
  category: string | null;
  status: ActivityStatus;
  orderIndex: number;
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

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amountCents: number;
  currency: string;
  paidByUserId: string;
  paidBy: { id: string; name: string };
  participants: { id: string; userId: string; shareCents: number; user: { id: string; name: string } }[];
  createdAt: string;
}

export interface Balance {
  userId: string;
  name: string;
  netCents: number;
}

export interface Settlement {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
}

export type WeatherForecast =
  | {
      available: true;
      date: string;
      tempMaxC: number;
      tempMinC: number;
      precipitationProbabilityMax: number | null;
      windSpeedMaxKmh: number;
      weatherCode: number;
      description: string;
    }
  | { available: false; date: string; reason: string };
