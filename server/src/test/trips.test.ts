import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildApp, createTestTrip, createTestUser } from './helpers.js';

describe('trips', () => {
  it('creates a trip and makes the creator its OWNER', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner);

    const res = await owner.agent.get(`/api/trips/${trip.id}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('OWNER');
  });

  it('rejects a trip whose end date is before its start date', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const res = await owner.agent.post('/api/trips').send({
      name: 'Backwards Trip',
      destinationName: 'Paris',
      destinationLat: 48.8566,
      destinationLon: 2.3522,
      startDate: '2027-05-10',
      endDate: '2027-05-01',
    });
    expect(res.status).toBe(400);
  });

  it('lists only trips the caller is a member of', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const stranger = await createTestUser(app);
    await createTestTrip(owner);

    const ownerList = await owner.agent.get('/api/trips');
    expect(ownerList.body.trips).toHaveLength(1);

    const strangerList = await stranger.agent.get('/api/trips');
    expect(strangerList.body.trips).toHaveLength(0);
  });

  it('lets the owner update and delete the trip', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner);

    const updateRes = await owner.agent.patch(`/api/trips/${trip.id}`).send({ name: 'Renamed Trip' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.trip.name).toBe('Renamed Trip');

    const deleteRes = await owner.agent.delete(`/api/trips/${trip.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await owner.agent.get(`/api/trips/${trip.id}`);
    expect(getRes.status).toBe(404);
  });

  it('blocks a non-member from reading a trip (404, not 403, to avoid leaking existence)', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const stranger = await createTestUser(app);
    const trip = await createTestTrip(owner);

    const res = await stranger.agent.get(`/api/trips/${trip.id}`);
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated access entirely', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner);

    const res = await request(app).get(`/api/trips/${trip.id}`);
    expect(res.status).toBe(401);
  });

  it('duplicates a trip, copying its saved places into a new trip owned by the caller', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner);
    await owner.agent.post(`/api/trips/${trip.id}/places`).send({
      externalId: 'ext-1',
      name: 'Eiffel Tower',
      address: 'Paris',
      category: 'attraction',
      lat: 48.8584,
      lon: 2.2945,
    });

    const res = await owner.agent.post(`/api/trips/${trip.id}/duplicate`);
    expect(res.status).toBe(201);
    expect(res.body.trip.name).toContain('copy');

    const places = await owner.agent.get(`/api/trips/${res.body.trip.id}/places`);
    expect(places.body.places).toHaveLength(1);
  });
});
