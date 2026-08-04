/**
 * Route constants for navigation throughout the app.
 *
 * Routes are file-based via TanStack Router, but these constants
 * provide a single source of truth for programmatic navigation
 * (navigate(), <Link to=...>, redirect()) so that typos are caught
 * at build time.
 */

export const ROUTES = {
  // ── Public / Guest ────────────────────────────────────────────
  landing: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  resetPasswordSuccess: '/reset-password-success',
  verifyEmail: '/verify-email',
  verifyEmailExpired: '/verify-email-expired',
  verified: '/verified',
  authCallback: '/auth/callback',

  // ── Authenticated ─────────────────────────────────────────────
  dashboard: '/dashboard',
  settings: '/settings',

  // ── Organization ──────────────────────────────────────────────
  organization: (orgId: string) => `/organization/${orgId}` as const,
  organizationSettings: (orgId: string) => `/organization/${orgId}/settings` as const,
  organizationSettingsTab: (orgId: string, tab: string) =>
    `/organization/${orgId}/settings/${tab}` as const,
  organizationMembers: (orgId: string) => `/organization/${orgId}/settings/members` as const,

  // ── Workspace ─────────────────────────────────────────────────
  workspace: (wsId: string) => `/workspace/${wsId}` as const,
  workspaceMembers: (wsId: string) => `/workspace/${wsId}/members` as const,
  workspaceSettings: (wsId: string) => `/workspace/${wsId}/settings` as const,
  workspaceSettingsTab: (wsId: string, tab: string) =>
    `/workspace/${wsId}/settings/${tab}` as const,

  // ── Project ───────────────────────────────────────────────────
  project: (wsId: string, projId: string) =>
    `/workspace/${wsId}/project/${projId}` as const,
  projectBoards: (wsId: string, projId: string) =>
    `/workspace/${wsId}/project/${projId}/boards` as const,
  projectSprints: (wsId: string, projId: string) =>
    `/workspace/${wsId}/project/${projId}/sprints` as const,
  projectSettings: (wsId: string, projId: string) =>
    `/workspace/${wsId}/project/${projId}/settings` as const,
  projectSettingsTab: (wsId: string, projId: string, tab: string) =>
    `/workspace/${wsId}/project/${projId}/settings/${tab}` as const,
  projectMembers: (wsId: string, projId: string) =>
    `/workspace/${wsId}/project/${projId}/settings/members` as const,
} as const;
