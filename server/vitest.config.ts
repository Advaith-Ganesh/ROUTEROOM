import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://routeroom:routeroom@localhost:5432/routeroom_test?schema=public',
      JWT_SECRET: 'test_only_secret_used_for_vitest_runs_1234567890',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
