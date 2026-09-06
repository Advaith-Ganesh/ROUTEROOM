import { describe, expect, it } from 'vitest';
import { buildApp, createTestTrip, createTestUser } from './helpers.js';
import { splitEqually } from '../services/expenses.service.js';

describe('splitEqually', () => {
  it('splits evenly when the amount divides cleanly', () => {
    expect(splitEqually(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it('hands the leftover cent(s) to the first participants so shares always sum to the total', () => {
    const shares = splitEqually(1000, 3);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(shares).toEqual([334, 333, 333]);
  });
});

describe('expenses API', () => {
  it('creates an equal-split expense and computes correct balances', async () => {
    const app = buildApp();
    const alice = await createTestUser(app, { email: 'alice2@example.com', name: 'Alice' });
    const bob = await createTestUser(app, { email: 'bob2@example.com', name: 'Bob' });
    const carol = await createTestUser(app, { email: 'carol@example.com', name: 'Carol' });
    const trip = await createTestTrip(alice);
    await alice.agent.post(`/api/trips/${trip.id}/members`).send({ email: bob.email, role: 'EDITOR' });
    await alice.agent.post(`/api/trips/${trip.id}/members`).send({ email: carol.email, role: 'VIEWER' });

    const res = await alice.agent.post(`/api/trips/${trip.id}/expenses`).send({
      description: 'Dinner',
      amountCents: 9000,
      paidByUserId: alice.id,
      participants: [{ userId: alice.id }, { userId: bob.id }, { userId: carol.id }],
    });
    expect(res.status).toBe(201);

    const listRes = await alice.agent.get(`/api/trips/${trip.id}/expenses`);
    const balances: { userId: string; netCents: number }[] = listRes.body.balances;
    const aliceBalance = balances.find((b) => b.userId === alice.id)!;
    const bobBalance = balances.find((b) => b.userId === bob.id)!;
    const carolBalance = balances.find((b) => b.userId === carol.id)!;

    expect(aliceBalance.netCents).toBe(6000); // paid 9000, owes 3000 of it herself
    expect(bobBalance.netCents).toBe(-3000);
    expect(carolBalance.netCents).toBe(-3000);
    expect(listRes.body.settlements).toHaveLength(2);
  });

  it('accepts a custom split whose shares sum to the total', async () => {
    const app = buildApp();
    const alice = await createTestUser(app, { email: 'alice3@example.com' });
    const bob = await createTestUser(app, { email: 'bob3@example.com' });
    const trip = await createTestTrip(alice);
    await alice.agent.post(`/api/trips/${trip.id}/members`).send({ email: bob.email, role: 'EDITOR' });

    const res = await alice.agent.post(`/api/trips/${trip.id}/expenses`).send({
      description: 'Taxi',
      amountCents: 2000,
      paidByUserId: alice.id,
      participants: [
        { userId: alice.id, shareCents: 500 },
        { userId: bob.id, shareCents: 1500 },
      ],
    });
    expect(res.status).toBe(201);
  });

  it('rejects a custom split with a negative individual share', async () => {
    const app = buildApp();
    const alice = await createTestUser(app, { email: 'alice3b@example.com' });
    const bob = await createTestUser(app, { email: 'bob3b@example.com' });
    const trip = await createTestTrip(alice);
    await alice.agent.post(`/api/trips/${trip.id}/members`).send({ email: bob.email, role: 'EDITOR' });

    const res = await alice.agent.post(`/api/trips/${trip.id}/expenses`).send({
      description: 'Taxi',
      amountCents: 2000,
      paidByUserId: alice.id,
      participants: [
        { userId: alice.id, shareCents: 2500 },
        { userId: bob.id, shareCents: -500 },
      ],
    });
    expect(res.status).toBe(400);
  });

  it('rejects a custom split whose shares do not sum to the total', async () => {
    const app = buildApp();
    const alice = await createTestUser(app, { email: 'alice4@example.com' });
    const trip = await createTestTrip(alice);

    const res = await alice.agent.post(`/api/trips/${trip.id}/expenses`).send({
      description: 'Taxi',
      amountCents: 2000,
      paidByUserId: alice.id,
      participants: [{ userId: alice.id, shareCents: 500 }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects a zero-participant expense', async () => {
    const app = buildApp();
    const alice = await createTestUser(app, { email: 'alice5@example.com' });
    const trip = await createTestTrip(alice);

    const res = await alice.agent.post(`/api/trips/${trip.id}/expenses`).send({
      description: 'Nothing',
      amountCents: 1000,
      paidByUserId: alice.id,
      participants: [],
    });
    expect(res.status).toBe(400);
  });

  it('rejects a negative or zero amount', async () => {
    const app = buildApp();
    const alice = await createTestUser(app, { email: 'alice6@example.com' });
    const trip = await createTestTrip(alice);

    const res = await alice.agent.post(`/api/trips/${trip.id}/expenses`).send({
      description: 'Refund?',
      amountCents: -500,
      paidByUserId: alice.id,
      participants: [{ userId: alice.id }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects a participant who is not a member of the trip', async () => {
    const app = buildApp();
    const alice = await createTestUser(app, { email: 'alice7@example.com' });
    const outsider = await createTestUser(app, { email: 'outsider2@example.com' });
    const trip = await createTestTrip(alice);

    const res = await alice.agent.post(`/api/trips/${trip.id}/expenses`).send({
      description: 'Dinner',
      amountCents: 2000,
      paidByUserId: alice.id,
      participants: [{ userId: alice.id }, { userId: outsider.id }],
    });
    expect(res.status).toBe(400);
  });

  it('only allows an EDITOR or above to delete an expense', async () => {
    const app = buildApp();
    const alice = await createTestUser(app, { email: 'alice8@example.com' });
    const viewer = await createTestUser(app, { email: 'viewer4@example.com' });
    const trip = await createTestTrip(alice);
    await alice.agent.post(`/api/trips/${trip.id}/members`).send({ email: viewer.email, role: 'VIEWER' });

    const created = await alice.agent.post(`/api/trips/${trip.id}/expenses`).send({
      description: 'Snacks',
      amountCents: 500,
      paidByUserId: alice.id,
      participants: [{ userId: alice.id }],
    });

    const viewerDelete = await viewer.agent.delete(`/api/expenses/${created.body.expense.id}`);
    expect(viewerDelete.status).toBe(403);

    const ownerDelete = await alice.agent.delete(`/api/expenses/${created.body.expense.id}`);
    expect(ownerDelete.status).toBe(204);
  });
});
