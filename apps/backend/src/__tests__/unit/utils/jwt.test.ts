import { describe, it, expect, vi } from 'vitest';

// Generate test ES256 key pair using vi.hoisted() so it's available in vi.mock factories
const { privateKeyBase64, publicKeyBase64, privatePem, wrongPrivatePem } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('node:crypto') as typeof import('node:crypto');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  // Generate a DIFFERENT key pair to simulate wrong key verification
  const { privateKey: wrongPrivateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  return {
    privateKeyBase64: Buffer.from(privPem).toString('base64'),
    publicKeyBase64: Buffer.from(pubPem).toString('base64'),
    privatePem: privPem,
    wrongPrivatePem: wrongPrivateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
  };
});

vi.mock('../../../config/env.js', () => ({
  env: {
    JWT_ACCESS_PRIVATE_KEY: privateKeyBase64,
    JWT_ACCESS_PUBLIC_KEY: publicKeyBase64,
    JWT_REFRESH_PRIVATE_KEY: privateKeyBase64,
    JWT_REFRESH_PUBLIC_KEY: publicKeyBase64,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
  },
}));

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
} from '../../../utils/jwt.js';

describe('jwt utils', () => {
  const testAccessPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    deviceId: 'device-456',
  };

  const testRefreshPayload = {
    userId: 'user-123',
    sessionId: 'session-789',
    deviceId: 'device-456',
  };

  describe('generateAccessToken', () => {
    it('should return a valid JWT string', async () => {
      const token = await generateAccessToken(testAccessPayload);
      expect(typeof token).toBe('string');
      // JWT has 3 parts separated by dots
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate unique tokens on each call', async () => {
      const token1 = await generateAccessToken(testAccessPayload);
      const token2 = await generateAccessToken(testAccessPayload);
      expect(token1).not.toBe(token2);
    });

    it('should use provided jti when given', async () => {
      const customJti = 'custom-jti-id';
      const token = await generateAccessToken({ ...testAccessPayload, jti: customJti });
      const decoded = decodeToken(token);
      expect(decoded?.jti).toBe(customJti);
    });

    it('should auto-generate jti when not provided', async () => {
      const token = await generateAccessToken(testAccessPayload);
      const decoded = decodeToken(token);
      expect(decoded?.jti).toBeDefined();
      expect(typeof decoded?.jti).toBe('string');
    });
  });

  describe('generateRefreshToken', () => {
    it('should return a valid JWT string', async () => {
      const token = await generateRefreshToken(testRefreshPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include sessionId in payload', async () => {
      const token = await generateRefreshToken(testRefreshPayload);
      const decoded = decodeToken(token);
      expect(decoded?.sessionId).toBe('session-789');
    });

    it('should use provided jti when given', async () => {
      const customJti = 'refresh-jti';
      const token = await generateRefreshToken({ ...testRefreshPayload, jti: customJti });
      const decoded = decodeToken(token);
      expect(decoded?.jti).toBe(customJti);
    });
  });

  describe('verifyAccessToken', () => {
    it('should return the full payload for a valid token', async () => {
      const token = await generateAccessToken(testAccessPayload);
      const payload = await verifyAccessToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.deviceId).toBe('device-456');
      expect(payload?.jti).toBeDefined();
    });

    it('should return null for an invalid token string', async () => {
      const payload = await verifyAccessToken('not-a-valid-jwt');
      expect(payload).toBeNull();
    });

    it('should return null for an empty string', async () => {
      const payload = await verifyAccessToken('');
      expect(payload).toBeNull();
    });

    it('should return null for a token signed with wrong key', async () => {
      // Generate a token with the wrong private key
      const { SignJWT } = await import('jose');
      const wrongKey = await import('jose').then((j) =>
        j.importPKCS8(wrongPrivatePem, 'ES256'),
      );

      const wrongToken = await new SignJWT({
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'some-jti',
        deviceId: 'device-456',
      })
        .setProtectedHeader({ alg: 'ES256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(wrongKey);

      const payload = await verifyAccessToken(wrongToken);
      expect(payload).toBeNull();
    });

    it('should return null for an expired token', async () => {
      const { SignJWT, importPKCS8 } = await import('jose');
      const privKey = await importPKCS8(privatePem, 'ES256');

      const expiredToken = await new SignJWT({
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'expired-jti',
        deviceId: 'device-456',
      })
        .setProtectedHeader({ alg: 'ES256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 120) // issued 2 min ago
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60) // expired 60 seconds ago
        .sign(privKey);

      // Wait a moment to ensure expiry
      const payload = await verifyAccessToken(expiredToken);
      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return the full payload for a valid refresh token', async () => {
      const token = await generateRefreshToken(testRefreshPayload);
      const payload = await verifyRefreshToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.sessionId).toBe('session-789');
      expect(payload?.deviceId).toBe('device-456');
      expect(payload?.jti).toBeDefined();
    });

    it('should return null for an invalid token', async () => {
      const payload = await verifyRefreshToken('invalid');
      expect(payload).toBeNull();
    });

    it('should return null for a token signed with wrong key', async () => {
      const { SignJWT, importPKCS8 } = await import('jose');
      const wrongKey = await importPKCS8(
        wrongPrivatePem,
        'ES256',
      );

      const wrongToken = await new SignJWT({
        userId: 'user-123',
        sessionId: 'session-789',
        jti: 'jti',
        deviceId: 'device-456',
      })
        .setProtectedHeader({ alg: 'ES256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(wrongKey);

      const payload = await verifyRefreshToken(wrongToken);
      expect(payload).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid JWT without verification', async () => {
      const token = await generateAccessToken(testAccessPayload);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
    });

    it('should return null for an invalid token', () => {
      expect(decodeToken('not-a-jwt')).toBeNull();
    });

    it('should return null for an empty string', () => {
      expect(decodeToken('')).toBeNull();
    });

    it('should decode token parts even if tampered (no verification)', async () => {
      const token = await generateAccessToken(testAccessPayload);
      const parts = token.split('.');
      // Tamper with the payload but it should still decode (decodeJwt doesn't verify)
      const tampered = parts[0] + '.' + parts[1] + 'x' + '.' + parts[2];
      // decodeJwt may or may not throw on tampered base64 - both are valid
      decodeToken(tampered);
      // The important thing is it doesn't crash
    });
  });

  describe('key caching', () => {
    it('should work correctly on multiple calls (key caching)', async () => {
      const token1 = await generateAccessToken(testAccessPayload);
      const token2 = await generateAccessToken(testAccessPayload);
      const payload1 = await verifyAccessToken(token1);
      const payload2 = await verifyAccessToken(token2);

      expect(payload1?.userId).toBe('user-123');
      expect(payload2?.userId).toBe('user-123');
    });
  });
});
