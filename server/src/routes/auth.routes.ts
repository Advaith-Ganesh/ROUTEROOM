import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  accessTokenCookie,
  createSession,
  refreshTokenCookie,
  registerUser,
  revokeSession,
  rotateSession,
  signAccessToken,
  verifyCredentials,
} from '../services/auth.service.js';
import { HttpError } from '../utils/httpError.js';

export const authRouter = Router();

// Emails are case-insensitive per RFC 5321 in practice, and the unique
// constraint on User.email is case-sensitive at the DB level -- normalizing
// here is what actually enforces "one account per email address" and lets
// a user log back in regardless of how they capitalize it.
const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

// Beyond a bare length check: require at least one letter and one number so
// registration rejects the weakest common passwords (e.g. "12345678") while
// staying simple -- no mandatory symbols/casing, which mostly just push
// people toward "Password1!" and a sticky note.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((value) => /[a-zA-Z]/.test(value), 'Password must contain at least one letter')
  .refine((value) => /[0-9]/.test(value), 'Password must contain at least one number');

const registerSchema = z.object({
  email: normalizedEmail,
  password: passwordSchema,
  name: z.string().trim().min(1, 'Name is required').max(100),
});

const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1),
});

function issueTokens(res: import('express').Response, userId: string, email: string, userAgent?: string) {
  return createSession(userId, userAgent).then((refreshToken) => {
    const accessToken = signAccessToken({ sub: userId, email });
    res.cookie(accessTokenCookie.name, accessToken, accessTokenCookie.options);
    res.cookie(refreshTokenCookie.name, refreshToken, refreshTokenCookie.options);
  });
}

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input.email, input.password, input.name);
    await issueTokens(res, user.id, user.email, req.headers['user-agent']);
    res.status(201).json({ user });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await verifyCredentials(input.email, input.password);
    await issueTokens(res, user.id, user.email, req.headers['user-agent']);
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.refresh_token as string | undefined;
    if (!rawRefreshToken) {
      throw HttpError.unauthorized();
    }
    const { user, newRawToken } = await rotateSession(rawRefreshToken, req.headers['user-agent']);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    res.cookie(accessTokenCookie.name, accessToken, accessTokenCookie.options);
    res.cookie(refreshTokenCookie.name, newRawToken, refreshTokenCookie.options);
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.refresh_token as string | undefined;
    if (rawRefreshToken) {
      await revokeSession(rawRefreshToken);
    }
    const { maxAge: _accessMaxAge, ...accessClearOptions } = accessTokenCookie.options;
    const { maxAge: _refreshMaxAge, ...refreshClearOptions } = refreshTokenCookie.options;
    res.clearCookie(accessTokenCookie.name, accessClearOptions);
    res.clearCookie(refreshTokenCookie.name, refreshClearOptions);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json({ user });
  }),
);
