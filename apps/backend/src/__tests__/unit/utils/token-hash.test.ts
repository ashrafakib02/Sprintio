import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { hashToken, verifyTokenHash } from '../../../utils/token-hash.js';

describe('token-hash utils', () => {
  describe('hashToken', () => {
    it('should return a SHA-256 hex digest', () => {
      const token = 'my-secret-token-abc123';
      const hash = hashToken(token);
      // SHA-256 hex is 64 characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic — same input produces same output', () => {
      const token = 'test-token-value';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token-a');
      const hash2 = hashToken('token-b');
      expect(hash1).not.toBe(hash2);
    });

    it('should match a manually computed SHA-256 hash', () => {
      const token = 'verify-this';
      const expected = createHash('sha256').update(token).digest('hex');
      expect(hashToken(token)).toBe(expected);
    });

    it('should handle empty string input', () => {
      const hash = hashToken('');
      expect(hash).toHaveLength(64);
    });

    it('should handle very long token strings', () => {
      const longToken = 'x'.repeat(10000);
      const hash = hashToken(longToken);
      expect(hash).toHaveLength(64);
    });
  });

  describe('verifyTokenHash', () => {
    it('should return true when token matches the hash', () => {
      const token = 'valid-refresh-token';
      const hash = hashToken(token);
      expect(verifyTokenHash(token, hash)).toBe(true);
    });

    it('should return false when token does not match the hash', () => {
      const token = 'valid-refresh-token';
      const wrongToken = 'different-token';
      const hash = hashToken(token);
      expect(verifyTokenHash(wrongToken, hash)).toBe(false);
    });

    it('should return false for empty token against non-empty hash', () => {
      const hash = hashToken('something');
      expect(verifyTokenHash('', hash)).toBe(false);
    });

    it('should return true for empty token against empty token hash', () => {
      const hash = hashToken('');
      expect(verifyTokenHash('', hash)).toBe(true);
    });

    it('should return false for a completely unrelated hash', () => {
      expect(verifyTokenHash('token', 'not-a-valid-hash')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const token = 'CaseSensitiveToken';
      const hash = hashToken(token);
      expect(verifyTokenHash('casesensitivetoken', hash)).toBe(false);
    });
  });
});
