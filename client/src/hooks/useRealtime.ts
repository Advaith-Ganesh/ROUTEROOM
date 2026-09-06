import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_URL } from '../api/client';

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;
// Server closes with these codes when reconnecting can't help (missing/invalid
// session, not a trip member) -- retrying would just loop on the same error.
const NON_RETRYABLE_CLOSE_CODES = new Set([4001, 4003]);

/**
 * Subscribes to this trip's WebSocket room and invalidates the relevant
 * React Query caches when a collaborator's change is broadcast. We
 * deliberately don't merge the pushed payload into cache directly -- the
 * server just says "something changed", and the client re-fetches via the
 * same REST endpoints it already uses. That keeps one source of truth
 * (the API) instead of maintaining two update paths.
 *
 * The connection reconnects with capped exponential backoff on an
 * unexpected drop (server restart, network blip) so a collaborator doesn't
 * silently stop receiving live updates until they reload the page.
 */
export function useRealtime(tripId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let isCancelled = false;
    let socket: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;

    function connect() {
      socket = new WebSocket(`${WS_URL}/ws?tripId=${tripId}`);

      socket.onopen = () => {
        reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      };

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

      socket.onclose = (event) => {
        if (isCancelled || NON_RETRYABLE_CLOSE_CODES.has(event.code)) return;
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      isCancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [tripId, queryClient]);
}
