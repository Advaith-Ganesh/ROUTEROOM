import { api } from './client';
import type { TripMember, TripRole } from './types';

export const membersApi = {
  list: (tripId: string) => api.get<{ members: TripMember[] }>(`/trips/${tripId}/members`),
  invite: (tripId: string, email: string, role: Exclude<TripRole, 'OWNER'>) =>
    api.post<{ member: TripMember }>(`/trips/${tripId}/members`, { email, role }),
  updateRole: (tripId: string, memberId: string, role: Exclude<TripRole, 'OWNER'>) =>
    api.patch<{ member: TripMember }>(`/trips/${tripId}/members/${memberId}`, { role }),
  remove: (tripId: string, memberId: string) => api.delete<void>(`/trips/${tripId}/members/${memberId}`),
};
