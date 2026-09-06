import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export async function registerUser(rawEmail: string, password: string, name: string) {
  const email = rawEmail.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw HttpError.conflict('An account with this email already exists');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}

export async function verifyCredentials(rawEmail: string, password: string) {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw HttpError.unauthorized('Invalid email or password');
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw HttpError.unauthorized('Invalid email or password');
  }
  return user;
}

/** Issues a new refresh session for a user and returns the raw (unhashed) token to send as a cookie. */
export async function createSession(userId: string, userAgent?: string) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(rawToken),
      userAgent,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return rawToken;
}

export async function rotateSession(rawRefreshToken: string, userAgent?: string) {
  const hash = hashRefreshToken(rawRefreshToken);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: hash } });
  if (!session || session.expiresAt < new Date()) {
    throw HttpError.unauthorized('Session expired, please log in again');
  }
  await prisma.session.delete({ where: { id: session.id } });
  const newRawToken = await createSession(session.userId, userAgent);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  return { user, newRawToken };
}

export async function revokeSession(rawRefreshToken: string) {
  const hash = hashRefreshToken(rawRefreshToken);
  await prisma.session.deleteMany({ where: { refreshTokenHash: hash } });
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export const accessTokenCookie = {
  name: 'access_token',
  options: { ...authCookieOptions, maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000 },
};

export const refreshTokenCookie = {
  name: 'refresh_token',
  options: { ...authCookieOptions, maxAge: REFRESH_TOKEN_TTL_MS, path: '/api/auth' },
};
