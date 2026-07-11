export const PLAN_LIMITS = {
  free: { maxMembers: 5, maxBoards: 3, maxStorage: 100 * 1024 * 1024, maxDocuments: 10 },
  pro: { maxMembers: 50, maxBoards: 100, maxStorage: 10 * 1024 * 1024 * 1024, maxDocuments: 1000 },
  enterprise: {
    maxMembers: Infinity,
    maxBoards: Infinity,
    maxStorage: Infinity,
    maxDocuments: Infinity,
  },
} as const;

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
