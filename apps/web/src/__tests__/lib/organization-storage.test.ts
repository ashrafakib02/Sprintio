import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredOrganizationId,
  setStoredOrganizationId,
  clearStoredOrganizationId,
} from '@/lib/organization-storage';

const STORAGE_KEY = 'sprintio:activeOrganizationId';

describe('organization-storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getStoredOrganizationId', () => {
    it('returns null when localStorage is empty', () => {
      expect(getStoredOrganizationId()).toBeNull();
    });

    it('returns stored value after setStoredOrganizationId', () => {
      setStoredOrganizationId('org-abc-123');
      expect(getStoredOrganizationId()).toBe('org-abc-123');
    });

    it('returns null when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(getStoredOrganizationId()).toBeNull();
    });
  });

  describe('setStoredOrganizationId', () => {
    it('stores the organization ID', () => {
      setStoredOrganizationId('org-abc-123');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('org-abc-123');
    });

    it('overwrites previous value', () => {
      setStoredOrganizationId('org-111');
      setStoredOrganizationId('org-222');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('org-222');
    });

    it('does not throw when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(() => setStoredOrganizationId('org-123')).not.toThrow();
    });
  });

  describe('clearStoredOrganizationId', () => {
    it('removes the stored value', () => {
      setStoredOrganizationId('org-abc-123');
      clearStoredOrganizationId();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('some error');
      });
      expect(() => clearStoredOrganizationId()).not.toThrow();
    });
  });
});
