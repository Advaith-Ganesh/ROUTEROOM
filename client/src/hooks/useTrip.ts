import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripsApi, type TripInput } from '../api/trips';

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => tripsApi.get(tripId),
  });
}

export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<TripInput>) => tripsApi.update(tripId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
