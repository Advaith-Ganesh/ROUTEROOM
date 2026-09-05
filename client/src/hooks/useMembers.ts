import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../api/members';
import type { TripRole } from '../api/types';

export function useMembers(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId, 'members'],
    queryFn: () => membersApi.list(tripId).then((r) => r.members),
  });
}

export function useInviteMember(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: Exclude<TripRole, 'OWNER'> }) =>
      membersApi.invite(tripId, email, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'members'] }),
  });
}

export function useUpdateMemberRole(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Exclude<TripRole, 'OWNER'> }) =>
      membersApi.updateRole(tripId, memberId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'members'] }),
  });
}

export function useRemoveMember(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => membersApi.remove(tripId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'members'] }),
  });
}
