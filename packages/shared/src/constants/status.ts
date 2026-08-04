export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'] as const;
export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;
export const BOARD_VIEW_TYPES = ['board', 'list', 'calendar', 'timeline', 'spreadsheet'] as const;

// ── Project ────────────────────────────────────────────────────
export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'archived'] as const;
export const PROJECT_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;
export const PROJECT_VISIBILITIES = ['workspace', 'public'] as const;
