import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // 32 chars is the minimum recommended key size for HMAC-SHA256 (what
  // jsonwebtoken uses by default) -- anything shorter is brute-forceable.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NOMINATIM_BASE_URL: z.string().default('https://nominatim.openstreetmap.org'),
  OSRM_BASE_URL: z.string().default('https://routing.openstreetmap.de'),
  OPEN_METEO_BASE_URL: z.string().default('https://api.open-meteo.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed. Check your .env file against .env.example.');
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
