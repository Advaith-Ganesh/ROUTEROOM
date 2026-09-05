import { api } from './client';
import type { Activity, ActivityStatus, DayAnalysis } from './types';

export interface ActivityInput {
  placeId: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  notes?: string;
  category?: string;
  status?: ActivityStatus;
}

export const activitiesApi = {
  list: (tripId: string) => api.get<{ activities: Activity[] }>(`/trips/${tripId}/activities`),
  analysis: (tripId: string) => api.get<{ days: DayAnalysis[] }>(`/trips/${tripId}/activities/analysis`),
  create: (tripId: string, input: ActivityInput) =>
    api.post<{ activity: Activity }>(`/trips/${tripId}/activities`, input),
  update: (activityId: string, input: Partial<ActivityInput>) =>
    api.patch<{ activity: Activity }>(`/activities/${activityId}`, input),
  remove: (activityId: string) => api.delete<void>(`/activities/${activityId}`),
  reorder: (tripId: string, order: { id: string; orderIndex: number }[]) =>
    api.post<{ activities: Activity[] }>(`/trips/${tripId}/activities/reorder`, { order }),
};
