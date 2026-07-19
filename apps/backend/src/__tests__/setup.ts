/**
 * Global test setup for the Sprintio backend auth test suite.
 *
 * This file is designed to be used as a Vitest setup file.
 * It sets up all required environment variables and mocks
 * for the database and Redis connections.
 *
 * Usage in vitest.config.ts (per-package override):
 * ```ts
 * // In a backend-specific vitest config or via workspace config:
 * test: {
 *   setupFiles: ['./src/__tests__/setup.ts'],
 * }
 * ```
 *
 * IMPORTANT: Each test file should still use vi.mock() for module-specific
 * mocking. This setup provides a baseline configuration.
 */

import { vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

// ── Generate ES256 Keys for Tests ─────────────────────────────

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

export const TEST_KEYS = {
  privateKeyBase64: Buffer.from(privatePem).toString('base64'),
  publicKeyBase64: Buffer.from(publicPem).toString('base64'),
};

// ── Required Environment Variables ────────────────────────────

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_PRIVATE_KEY = TEST_KEYS.privateKeyBase64;
process.env.JWT_ACCESS_PUBLIC_KEY = TEST_KEYS.publicKeyBase64;
process.env.JWT_REFRESH_PRIVATE_KEY = TEST_KEYS.privateKeyBase64;
process.env.JWT_REFRESH_PUBLIC_KEY = TEST_KEYS.publicKeyBase64;
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.JWT_ACCESS_EXPIRY_MS = '900000';
process.env.JWT_REFRESH_EXPIRY_MS = '604800000';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_DOMAIN = 'localhost';
process.env.COOKIE_SECURE = 'false';
process.env.DEVICE_COOKIE_NAME = 'device_id';
process.env.DEVICE_COOKIE_MAX_AGE = '31536000';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.EMAIL_FROM = 'test@test.com';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.BACKEND_URL = 'http://localhost:3001';
process.env.EMAIL_VERIFICATION_EXPIRY_MS = '86400000';
process.env.PASSWORD_RESET_EXPIRY_MS = '3600000';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/auth/google/callback';

// ── Database Mock ─────────────────────────────────────────────
// These are reference mocks. Individual test files should define
// their own mocks using vi.mock() for precise control.

export const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  returning: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
};

// ── Redis Mock ────────────────────────────────────────────────

export const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  sadd: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),
  expire: vi.fn().mockResolvedValue(1),
  pipeline: vi.fn().mockReturnValue({
    del: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  }),
  quit: vi.fn().mockResolvedValue('OK'),
};
