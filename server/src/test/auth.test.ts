import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildApp, createTestUser } from './helpers.js';

describe('auth', () => {
  it('registers a new user and sets auth cookies', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123', name: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects registration with a duplicate email', async () => {
    const app = buildApp();
    await createTestUser(app, { email: 'dup@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Someone Else' });

    expect(res.status).toBe(409);
  });

  it('rejects registration with a short password', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: '123', name: 'Short' });

    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const app = buildApp();
    await createTestUser(app, { email: 'login@example.com', password: 'correct-password' });

    const good = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'correct-password' });
    expect(good.status).toBe(200);

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  it('rejects /me without a session', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('stays authenticated across requests using the session cookie', async () => {
    const app = buildApp();
    const user = await createTestUser(app);
    const res = await user.agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('logs out and invalidates the refresh token', async () => {
    const app = buildApp();
    const user = await createTestUser(app);

    const logoutRes = await user.agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(204);

    const refreshRes = await user.agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(401);
  });

  it('rotates the session on refresh', async () => {
    const app = buildApp();
    const user = await createTestUser(app);

    const refreshRes = await user.agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.user.id).toBe(user.id);

    const meRes = await user.agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
  });
});
