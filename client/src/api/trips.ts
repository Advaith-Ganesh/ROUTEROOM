import { api } from './client';
import type { Trip, TripRole, TripSummary } from './types';

export interface TripInput {
  name: string;
  destinationName: string;
  destinationLat: number;
  destinationLon: number;
  startDate: string;
  endDate: string;
}

export const tripsApi = {
  list: () => api.get<{ trips: TripSummary[] }>('/trips'),
  get: (tripId: string) => api.get<{ trip: Trip; role: TripRole }>(`/trips/${tripId}`),
  create: (input: TripInput) => api.post<{ trip: Trip }>('/trips', input),
  update: (tripId: string, input: Partial<TripInput>) =>
    api.patch<{ trip: Trip }>(`/trips/${tripId}`, input),
  remove: (tripId: string) => api.delete<void>(`/trips/${tripId}`),
  duplicate: (tripId: string) => api.post<{ trip: Trip }>(`/trips/${tripId}/duplicate`),
};
