import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { activitiesApi, type ActivityInput } from '../api/activities';

export function useActivities(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId, 'activities'],
    queryFn: () => activitiesApi.list(tripId).then((r) => r.activities),
  });
}

export function useItineraryAnalysis(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId, 'activities', 'analysis'],
    queryFn: () => activitiesApi.analysis(tripId).then((r) => r.days),
  });
}

function invalidateItinerary(queryClient: ReturnType<typeof useQueryClient>, tripId: string) {
  queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'activities'] });
}

export function useCreateActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityInput) => activitiesApi.create(tripId, input),
    onSuccess: () => invalidateItinerary(queryClient, tripId),
  });
}

export function useUpdateActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, input }: { activityId: string; input: Partial<ActivityInput> }) =>
      activitiesApi.update(activityId, input),
    onSuccess: () => invalidateItinerary(queryClient, tripId),
  });
}

export function useDeleteActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) => activitiesApi.remove(activityId),
    onSuccess: () => invalidateItinerary(queryClient, tripId),
  });
}

export function useReorderActivities(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (order: { id: string; orderIndex: number }[]) => activitiesApi.reorder(tripId, order),
    onSuccess: () => invalidateItinerary(queryClient, tripId),
  });
}
