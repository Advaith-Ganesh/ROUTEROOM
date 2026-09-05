import { api } from './client';
import type { Place, PlaceSearchResult } from './types';

export const placesApi = {
  search: (query: string) =>
    api.get<{ results: PlaceSearchResult[] }>(`/places/search?q=${encodeURIComponent(query)}`),
  list: (tripId: string) => api.get<{ places: Place[] }>(`/trips/${tripId}/places`),
  save: (tripId: string, result: PlaceSearchResult) =>
    api.post<{ place: Place }>(`/trips/${tripId}/places`, result),
  remove: (tripId: string, placeId: string) => api.delete<void>(`/trips/${tripId}/places/${placeId}`),
};
