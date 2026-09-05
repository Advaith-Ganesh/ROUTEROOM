import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripsApi, type TripInput } from '../api/trips';

export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => tripsApi.list().then((r) => r.trips),
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TripInput) => tripsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.remove(tripId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useDuplicateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.duplicate(tripId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });
}
