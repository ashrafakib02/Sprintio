import { describe, it, expect } from 'vitest';
import {
  sessionKey,
  userSessionsKey,
  blacklistAccessKey,
  blacklistRefreshKey,
  userBlacklistMarker,
} from '../../../utils/redis-keys.js';

describe('redis-keys utils', () => {
  describe('sessionKey', () => {
    it('should return "session:{sessionId}"', () => {
      expect(sessionKey('sess-123')).toBe('session:sess-123');
    });

    it('should handle UUID-style session IDs', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      expect(sessionKey(id)).toBe(`session:${id}`);
    });
  });

  describe('userSessionsKey', () => {
    it('should return "user_sessions:{userId}"', () => {
      expect(userSessionsKey('user-456')).toBe('user_sessions:user-456');
    });
  });

  describe('blacklistAccessKey', () => {
    it('should return "blacklist:access:{jti}"', () => {
      expect(blacklistAccessKey('jti-abc')).toBe('blacklist:access:jti-abc');
    });
  });

  describe('blacklistRefreshKey', () => {
    it('should return "blacklist:refresh:{jti}"', () => {
      expect(blacklistRefreshKey('jti-xyz')).toBe('blacklist:refresh:jti-xyz');
    });
  });

  describe('userBlacklistMarker', () => {
    it('should return "blacklist:user:{userId}"', () => {
      expect(userBlacklistMarker('user-789')).toBe('blacklist:user:user-789');
    });
  });

  describe('key uniqueness', () => {
    it('should produce distinct keys for different inputs', () => {
      expect(sessionKey('a')).not.toBe(sessionKey('b'));
      expect(userSessionsKey('a')).not.toBe(userSessionsKey('b'));
      expect(blacklistAccessKey('a')).not.toBe(blacklistAccessKey('b'));
      expect(blacklistRefreshKey('a')).not.toBe(blacklistRefreshKey('b'));
      expect(userBlacklistMarker('a')).not.toBe(userBlacklistMarker('b'));
    });

    it('should have no key prefix collisions across types', () => {
      const id = 'same-id';
      const keys = [
        sessionKey(id),
        userSessionsKey(id),
        blacklistAccessKey(id),
        blacklistRefreshKey(id),
        userBlacklistMarker(id),
      ];
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(5);
    });
  });
});
