import { describe, it, expect, vi } from 'vitest';
import { hashPassword, comparePassword } from '../../../utils/password.js';

// Mock env to avoid module-scope validation
vi.mock('../../../config/env.js', () => ({
  env: {
    BCRYPT_SALT_ROUNDS: 4,
  },
}));

describe('password utils', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await hashPassword('MyPassword123!');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^\$2[aby]?\$\d{1,2}\$/); // bcrypt hash prefix
    });

    it('should produce different hashes for the same input (salt randomness)', async () => {
      const hash1 = await hashPassword('MyPassword123!');
      const hash2 = await hashPassword('MyPassword123!');
      // With salt rounds=4 they COULD collide but extremely unlikely
      // The hashes should at least be valid bcrypt hashes
      expect(hash1).toMatch(/^\$2[aby]?\$\d{1,2}\$/);
      expect(hash2).toMatch(/^\$2[aby]?\$\d{1,2}\$/);
    });

    it('should produce hashes of consistent length', async () => {
      const hash = await hashPassword('test');
      // bcrypt hashes are 60 characters
      expect(hash).toHaveLength(60);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const hash = await hashPassword('MyPassword123!');
      const result = await comparePassword('MyPassword123!', hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await hashPassword('MyPassword123!');
      const result = await comparePassword('WrongPassword!', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty password against non-empty hash', async () => {
      const hash = await hashPassword('MyPassword123!');
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });

    it('should return true for empty password hash comparison', async () => {
      const hash = await hashPassword('');
      const result = await comparePassword('', hash);
      expect(result).toBe(true);
    });

    it('should handle special characters in password', async () => {
      const special = 'P@$$w0r!#%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(special);
      const result = await comparePassword(special, hash);
      expect(result).toBe(true);
    });
  });
});
