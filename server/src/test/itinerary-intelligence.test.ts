import { describe, expect, it, vi } from 'vitest';

// The itinerary analysis calls the real routing service internally; for a
// fast, deterministic unit test of the *scheduling logic* itself, we mock
// that one external boundary rather than hitting OSRM over the network.
vi.mock('../services/routing.service.js', () => ({
  getRoute: vi.fn(async (_fromLat: number, _fromLon: number, _toLat: number, _toLon: number) => ({
    profile: 'walking',
    durationSec: 45 * 60,
    distanceM: 3500,
  })),
}));

const { analyzeItinerary } = await import('../services/itinerary.service.js');
const { prisma } = await import('../lib/prisma.js');
const { createTestPlace, createTestTrip, createTestUser, buildApp } = await import('./helpers.js');

describe('itinerary intelligence', () => {
  it('flags an overlap between two activities on the same day', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-03-01', endDate: '2027-03-05' });
    const placeA = await createTestPlace(owner, trip.id, { name: 'A' });
    const placeB = await createTestPlace(owner, trip.id, { name: 'B' });

    await owner.agent
      .post(`/api/trips/${trip.id}/activities`)
      .send({ placeId: placeA.id, date: '2027-03-02', startTime: '10:00', endTime: '12:00' });
    await owner.agent
      .post(`/api/trips/${trip.id}/activities`)
      .send({ placeId: placeB.id, date: '2027-03-02', startTime: '11:00', endTime: '13:00' });

    const days = await analyzeItinerary(trip.id);
    expect(days[0]?.warnings.some((w) => w.type === 'OVERLAP')).toBe(true);
  });

  it('flags a travel-time conflict when the gap is shorter than the route duration', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-03-01', endDate: '2027-03-05' });
    const placeA = await createTestPlace(owner, trip.id, { name: 'A' });
    const placeB = await createTestPlace(owner, trip.id, { name: 'B' });

    // Mocked route takes 45 minutes; only a 10 minute gap is left between activities.
    await owner.agent
      .post(`/api/trips/${trip.id}/activities`)
      .send({ placeId: placeA.id, date: '2027-03-02', startTime: '10:00', endTime: '12:00' });
    await owner.agent
      .post(`/api/trips/${trip.id}/activities`)
      .send({ placeId: placeB.id, date: '2027-03-02', startTime: '12:10' });

    const days = await analyzeItinerary(trip.id);
    const conflict = days[0]?.warnings.find((w) => w.type === 'TRAVEL_CONFLICT');
    expect(conflict).toBeDefined();
    expect(conflict?.message).toContain('45 min');
  });

  it('does not flag a travel-time conflict when the gap is long enough', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-03-01', endDate: '2027-03-05' });
    const placeA = await createTestPlace(owner, trip.id, { name: 'A' });
    const placeB = await createTestPlace(owner, trip.id, { name: 'B' });

    await owner.agent
      .post(`/api/trips/${trip.id}/activities`)
      .send({ placeId: placeA.id, date: '2027-03-02', startTime: '10:00', endTime: '12:00' });
    await owner.agent
      .post(`/api/trips/${trip.id}/activities`)
      .send({ placeId: placeB.id, date: '2027-03-02', startTime: '13:00' });

    const days = await analyzeItinerary(trip.id);
    expect(days[0]?.warnings.some((w) => w.type === 'TRAVEL_CONFLICT')).toBe(false);
  });

  it('flags a packed day once activity count crosses the threshold', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-03-01', endDate: '2027-03-05' });
    const place = await createTestPlace(owner, trip.id);

    const times = ['08:00', '09:30', '11:00', '12:30', '14:00'];
    for (const startTime of times) {
      await owner.agent
        .post(`/api/trips/${trip.id}/activities`)
        .send({ placeId: place.id, date: '2027-03-02', startTime });
    }

    const days = await analyzeItinerary(trip.id);
    expect(days[0]?.isPacked).toBe(true);
    expect(days[0]?.warnings.some((w) => w.type === 'PACKED_DAY')).toBe(true);
  });

  it('flags an activity whose date falls outside the trip range', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-03-01', endDate: '2027-03-05' });
    const place = await createTestPlace(owner, trip.id);
    await owner.agent
      .post(`/api/trips/${trip.id}/activities`)
      .send({ placeId: place.id, date: '2027-03-02', startTime: '10:00' });

    // Simulate a trip whose dates were edited *after* the activity was created.
    await prisma.trip.update({
      where: { id: trip.id },
      data: { startDate: new Date('2027-03-03'), endDate: new Date('2027-03-05') },
    });

    const days = await analyzeItinerary(trip.id);
    expect(days[0]?.warnings.some((w) => w.type === 'OUT_OF_RANGE')).toBe(true);
  });
});
