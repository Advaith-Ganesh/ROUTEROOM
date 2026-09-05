import { describe, expect, it } from 'vitest';
import { buildApp, createTestTrip, createTestUser } from './helpers.js';

describe('trip membership + permissions', () => {
  it('lets the owner invite an existing user with a role', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const invitee = await createTestUser(app, { email: 'invitee@example.com' });
    const trip = await createTestTrip(owner);

    const res = await owner.agent
      .post(`/api/trips/${trip.id}/members`)
      .send({ email: invitee.email, role: 'EDITOR' });

    expect(res.status).toBe(201);
    expect(res.body.member.role).toBe('EDITOR');
  });

  it('rejects inviting an email with no RouteRoom account', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner);

    const res = await owner.agent
      .post(`/api/trips/${trip.id}/members`)
      .send({ email: 'nobody@example.com', role: 'VIEWER' });

    expect(res.status).toBe(404);
  });

  it('prevents a non-owner from inviting members', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const editor = await createTestUser(app, { email: 'editor@example.com' });
    const outsider = await createTestUser(app, { email: 'outsider@example.com' });
    const trip = await createTestTrip(owner);
    await owner.agent.post(`/api/trips/${trip.id}/members`).send({ email: editor.email, role: 'EDITOR' });

    const res = await editor.agent
      .post(`/api/trips/${trip.id}/members`)
      .send({ email: outsider.email, role: 'VIEWER' });

    expect(res.status).toBe(403);
  });

  it('enforces VIEWER cannot write, EDITOR can', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const viewer = await createTestUser(app, { email: 'viewer@example.com' });
    const editor = await createTestUser(app, { email: 'editor2@example.com' });
    const trip = await createTestTrip(owner);
    await owner.agent.post(`/api/trips/${trip.id}/members`).send({ email: viewer.email, role: 'VIEWER' });
    await owner.agent.post(`/api/trips/${trip.id}/members`).send({ email: editor.email, role: 'EDITOR' });

    const viewerAttempt = await viewer.agent.post(`/api/trips/${trip.id}/places`).send({
      externalId: 'x',
      name: 'Place',
      address: 'Addr',
      category: null,
      lat: 1,
      lon: 1,
    });
    expect(viewerAttempt.status).toBe(403);

    const editorAttempt = await editor.agent.post(`/api/trips/${trip.id}/places`).send({
      externalId: 'x',
      name: 'Place',
      address: 'Addr',
      category: null,
      lat: 1,
      lon: 1,
    });
    expect(editorAttempt.status).toBe(201);
  });

  it("cannot change or remove the owner's role", async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner);
    const members = await owner.agent.get(`/api/trips/${trip.id}/members`);
    const ownerMembership = members.body.members.find((m: { role: string }) => m.role === 'OWNER');

    const res = await owner.agent
      .delete(`/api/trips/${trip.id}/members/${ownerMembership.id}`);
    expect(res.status).toBe(400);
  });
});
