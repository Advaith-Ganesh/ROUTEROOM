import { describe, expect, it } from 'vitest';
import { buildApp, createTestPlace, createTestTrip, createTestUser } from './helpers.js';

describe('activities / itinerary CRUD', () => {
  it('creates an activity for a saved place within the trip date range', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-02-01', endDate: '2027-02-05' });
    const place = await createTestPlace(owner, trip.id);

    const res = await owner.agent.post(`/api/trips/${trip.id}/activities`).send({
      placeId: place.id,
      date: '2027-02-02',
      startTime: '10:00',
      endTime: '11:00',
      category: 'Museum',
    });

    expect(res.status).toBe(201);
    expect(res.body.activity.orderIndex).toBe(0);
  });

  it('rejects an activity scheduled outside the trip date range', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-02-01', endDate: '2027-02-05' });
    const place = await createTestPlace(owner, trip.id);

    const res = await owner.agent.post(`/api/trips/${trip.id}/activities`).send({
      placeId: place.id,
      date: '2027-03-01',
      startTime: '10:00',
    });

    expect(res.status).toBe(400);
  });

  it('rejects an end time that is not after the start time', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-02-01', endDate: '2027-02-05' });
    const place = await createTestPlace(owner, trip.id);

    const res = await owner.agent.post(`/api/trips/${trip.id}/activities`).send({
      placeId: place.id,
      date: '2027-02-02',
      startTime: '10:00',
      endTime: '09:00',
    });

    expect(res.status).toBe(400);
  });

  it('rejects a place that was not saved to this trip', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const tripA = await createTestTrip(owner, { name: 'Trip A' });
    const tripB = await createTestTrip(owner, { name: 'Trip B' });
    const placeInB = await createTestPlace(owner, tripB.id);

    const res = await owner.agent.post(`/api/trips/${tripA.id}/activities`).send({
      placeId: placeInB.id,
      date: tripA.startDate.slice(0, 10),
      startTime: '10:00',
    });

    expect(res.status).toBe(400);
  });

  it('rejects updating an activity to reference a place from a different trip', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const tripA = await createTestTrip(owner, { name: 'Trip A' });
    const tripB = await createTestTrip(owner, { name: 'Trip B' });
    const placeInA = await createTestPlace(owner, tripA.id);
    const placeInB = await createTestPlace(owner, tripB.id);

    const created = await owner.agent.post(`/api/trips/${tripA.id}/activities`).send({
      placeId: placeInA.id,
      date: tripA.startDate.slice(0, 10),
      startTime: '10:00',
    });

    const res = await owner.agent
      .patch(`/api/activities/${created.body.activity.id}`)
      .send({ placeId: placeInB.id });

    expect(res.status).toBe(400);
  });

  it('updates and deletes an activity, enforcing EDITOR role via the parent trip', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const viewer = await createTestUser(app, { email: 'viewer3@example.com' });
    const trip = await createTestTrip(owner, { startDate: '2027-02-01', endDate: '2027-02-05' });
    await owner.agent.post(`/api/trips/${trip.id}/members`).send({ email: viewer.email, role: 'VIEWER' });
    const place = await createTestPlace(owner, trip.id);

    const created = await owner.agent.post(`/api/trips/${trip.id}/activities`).send({
      placeId: place.id,
      date: '2027-02-02',
      startTime: '10:00',
    });
    const activityId = created.body.activity.id;

    const viewerUpdate = await viewer.agent.patch(`/api/activities/${activityId}`).send({ notes: 'nope' });
    expect(viewerUpdate.status).toBe(403);

    const ownerUpdate = await owner.agent.patch(`/api/activities/${activityId}`).send({ notes: 'Bring camera' });
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.body.activity.notes).toBe('Bring camera');

    const deleteRes = await owner.agent.delete(`/api/activities/${activityId}`);
    expect(deleteRes.status).toBe(204);
  });

  it('reorders activities within a day', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner, { startDate: '2027-02-01', endDate: '2027-02-05' });
    const place = await createTestPlace(owner, trip.id);

    const first = await owner.agent.post(`/api/trips/${trip.id}/activities`).send({
      placeId: place.id,
      date: '2027-02-02',
      startTime: '09:00',
    });
    const second = await owner.agent.post(`/api/trips/${trip.id}/activities`).send({
      placeId: place.id,
      date: '2027-02-02',
      startTime: '11:00',
    });

    const res = await owner.agent.post(`/api/trips/${trip.id}/activities/reorder`).send({
      order: [
        { id: first.body.activity.id, orderIndex: 1 },
        { id: second.body.activity.id, orderIndex: 0 },
      ],
    });

    expect(res.status).toBe(200);
    const byId = Object.fromEntries(
      res.body.activities.map((a: { id: string; orderIndex: number }) => [a.id, a.orderIndex]),
    );
    expect(byId[first.body.activity.id]).toBe(1);
    expect(byId[second.body.activity.id]).toBe(0);
  });

  it('ignores an activity id from a different trip when reordering', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const tripA = await createTestTrip(owner, { name: 'Trip A', startDate: '2027-02-01', endDate: '2027-02-05' });
    const tripB = await createTestTrip(owner, { name: 'Trip B', startDate: '2027-02-01', endDate: '2027-02-05' });
    const placeA = await createTestPlace(owner, tripA.id);
    const placeB = await createTestPlace(owner, tripB.id);

    const inTripA = await owner.agent.post(`/api/trips/${tripA.id}/activities`).send({
      placeId: placeA.id,
      date: '2027-02-02',
      startTime: '09:00',
    });
    const inTripB = await owner.agent.post(`/api/trips/${tripB.id}/activities`).send({
      placeId: placeB.id,
      date: '2027-02-02',
      startTime: '09:00',
    });

    // Attempting to reorder tripB's activity through tripA's endpoint must not
    // touch it -- the update is scoped by tripId at the database level.
    await owner.agent.post(`/api/trips/${tripA.id}/activities/reorder`).send({
      order: [{ id: inTripB.body.activity.id, orderIndex: 5 }],
    });

    const unchanged = await owner.agent.get(`/api/trips/${tripB.id}/activities`);
    expect(unchanged.body.activities[0].orderIndex).toBe(inTripB.body.activity.orderIndex);

    const tripAActivities = await owner.agent.get(`/api/trips/${tripA.id}/activities`);
    expect(tripAActivities.body.activities).toHaveLength(1);
    expect(tripAActivities.body.activities[0].id).toBe(inTripA.body.activity.id);
  });
});
