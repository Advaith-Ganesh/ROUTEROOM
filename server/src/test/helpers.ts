import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';

export function buildApp(): Express {
  return createApp();
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  agent: ReturnType<typeof request.agent>;
}

/** Registers a fresh user against the given app and returns a cookie-persisting agent for them. */
export async function createTestUser(
  app: Express,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `user-${Math.random().toString(36).slice(2)}@example.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? 'Test User';

  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ email, password, name });
  if (res.status !== 201) {
    throw new Error(`Failed to create test user: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.user.id, email, name, agent };
}

export async function createTestTrip(
  owner: TestUser,
  overrides: Partial<{
    name: string;
    destinationName: string;
    destinationLat: number;
    destinationLon: number;
    startDate: string;
    endDate: string;
  }> = {},
) {
  const res = await owner.agent.post('/api/trips').send({
    name: overrides.name ?? 'Test Trip',
    destinationName: overrides.destinationName ?? 'London, UK',
    destinationLat: overrides.destinationLat ?? 51.5074,
    destinationLon: overrides.destinationLon ?? -0.1278,
    startDate: overrides.startDate ?? '2027-01-10',
    endDate: overrides.endDate ?? '2027-01-15',
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create test trip: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.trip as { id: string; startDate: string; endDate: string };
}

export async function createTestPlace(
  owner: TestUser,
  tripId: string,
  overrides: Partial<{ name: string; lat: number; lon: number }> = {},
) {
  const res = await owner.agent.post(`/api/trips/${tripId}/places`).send({
    externalId: `ext-${Math.random().toString(36).slice(2)}`,
    name: overrides.name ?? 'Test Place',
    address: '1 Test Street',
    category: 'test',
    lat: overrides.lat ?? 51.5194,
    lon: overrides.lon ?? -0.1269,
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create test place: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.place as { id: string; lat: number; lon: number };
}
