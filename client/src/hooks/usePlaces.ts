import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { placesApi } from '../api/places';
import type { PlaceSearchResult } from '../api/types';

export function usePlaces(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId, 'places'],
    queryFn: () => placesApi.list(tripId).then((r) => r.places),
  });
}

export function useSavePlace(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (result: PlaceSearchResult) => placesApi.save(tripId, result),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'places'] }),
  });
}

export function useDeletePlace(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (placeId: string) => placesApi.remove(tripId, placeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'places'] }),
  });
}
