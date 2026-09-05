import { PrismaClient } from '@prisma/client';

// Reused across hot-reloads in dev (tsx watch) so we don't exhaust the
// Postgres connection pool by creating a new client on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
