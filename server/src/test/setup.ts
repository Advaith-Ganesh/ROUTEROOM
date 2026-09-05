import { beforeEach } from 'vitest';
import { prisma } from '../lib/prisma.js';

// Truncates every application table between tests so each test starts from
// a clean slate without paying for a full migrate reset each time.
beforeEach(async () => {
  const tables = [
    'expense_participants',
    'expenses',
    'activities',
    'places',
    'trip_members',
    'trips',
    'sessions',
    'users',
    'geocode_cache',
    'route_cache',
    'weather_cache',
  ];
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE`);
});
