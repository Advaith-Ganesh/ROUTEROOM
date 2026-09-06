import http from 'node:http';
import { createApp } from './app.js';
import { createRealtimeServer } from './realtime/ws.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = createApp();
const server = http.createServer(app);
createRealtimeServer(server);

server.listen(env.PORT, () => {
  logger.info(`RouteRoom API listening on http://localhost:${env.PORT}`);
});

// Let a deploy/restart (SIGTERM) or Ctrl+C (SIGINT) finish in-flight
// requests and close the DB pool cleanly instead of dropping connections
// mid-request.
let isShuttingDown = false;
function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${signal} received, shutting down`);

  server.close(() => {
    prisma
      .$disconnect()
      .catch((err) => logger.error({ err }, 'Error disconnecting Prisma during shutdown'))
      .finally(() => process.exit(0));
  });

  // Don't hang forever if a connection refuses to close.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A rejected promise with no .catch(), or a synchronous throw outside any
// request handler, would otherwise crash the process silently (or not at
// all, leaving it in an undefined state). Log it with a stack trace before
// exiting so it shows up in whatever's watching stdout/stderr.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception, exiting');
  process.exit(1);
});
