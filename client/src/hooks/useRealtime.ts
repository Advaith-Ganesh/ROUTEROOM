import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_URL } from '../api/client';

/**
 * Subscribes to this trip's WebSocket room and invalidates the relevant
 * React Query caches when a collaborator's change is broadcast. We
 * deliberately don't merge the pushed payload into cache directly -- the
 * server just says "something changed", and the client re-fetches via the
 * same REST endpoints it already uses. That keeps one source of truth
 * (the API) instead of maintaining two update paths.
 */
export function useRealtime(tripId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}/ws?tripId=${tripId}`);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as { event: string };
        if (payload.event.startsWith('activity:')) {
          queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'activities'] });
        } else if (payload.event.startsWith('expense:')) {
          queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'expenses'] });
        } else if (payload.event.startsWith('place:')) {
          queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'places'] });
        }
      } catch {
        // Ignore malformed messages.
      }
    };

    return () => socket.close();
  }, [tripId, queryClient]);
}
