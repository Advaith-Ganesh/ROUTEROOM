import type { IncomingMessage } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { verifyAccessToken } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

/**
 * Design decision: this is deliberately a thin, single-process pub/sub, not
 * a full realtime sync engine. Every trip mutation broadcasts a
 * "trip:updated" event to everyone watching that trip; clients react by
 * re-fetching via React Query rather than merging a patch payload. That
 * keeps the client's state management simple (one source of truth: the
 * REST API) while still giving collaborators live updates without a manual
 * refresh. A CRDT/OT-based live-editing layer would be overkill for a
 * day-planning app where conflicting edits are rare and low-stakes.
 */

const tripRooms = new Map<string, Set<WebSocket>>();

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const [key, ...rest] = pair.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
}

export function createRealtimeServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/ws')) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', async (ws, req: IncomingMessage) => {
    const cookies = parseCookies(req);
    const token = cookies.access_token;
    const url = new URL(req.url ?? '', 'http://localhost');
    const tripId = url.searchParams.get('tripId');

    if (!token || !tripId) {
      ws.close(4001, 'Missing credentials or tripId');
      return;
    }

    let userId: string;
    try {
      userId = verifyAccessToken(token).sub;
    } catch {
      ws.close(4001, 'Invalid session');
      return;
    }

    const membership = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId } },
    });
    if (!membership) {
      ws.close(4003, 'Not a member of this trip');
      return;
    }

    if (!tripRooms.has(tripId)) tripRooms.set(tripId, new Set());
    tripRooms.get(tripId)!.add(ws);
    logger.info({ tripId, userId }, 'WebSocket client joined trip room');

    ws.on('close', () => {
      tripRooms.get(tripId)?.delete(ws);
    });
  });

  return wss;
}

export function broadcastTripUpdate(tripId: string, event: string) {
  const room = tripRooms.get(tripId);
  if (!room) return;
  const payload = JSON.stringify({ event, tripId, at: new Date().toISOString() });
  for (const client of room) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}
