import http from 'node:http';
import { createApp } from './app.js';
import { createRealtimeServer } from './realtime/ws.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();
const server = http.createServer(app);
createRealtimeServer(server);

server.listen(env.PORT, () => {
  logger.info(`RouteRoom API listening on http://localhost:${env.PORT}`);
});
