export type { User, UserRole, UserProfile } from './user.js';
export type {
  AuthTokens,
  TokenPair,
  TokenPayload,
  RefreshTokenPayload,
  AccessTokenFullPayload,
  RefreshTokenFullPayload,
  AuthResponse,
} from './auth.js';

// ── Hierarchy types (canonical source) ──────────────────────
export type {
  // Organization
  Organization,
  OrganizationMembership,
  OrganizationRole,
  // Workspace
  Workspace,
  WorkspaceMembership,
  WorkspaceRole,
  // Project
  Project,
  ProjectMembership,
  ProjectRole,
  ProjectStatus,
  ProjectPriority,
  ProjectVisibility,
  Sprint,
  SprintStatus,
  // Task
  Task,
  TaskStatus,
  TaskPriority,
  Subtask,
  TaskComment,
  // Board
  Board,
  BoardViewType,
  Column,
  Card,
  BoardView,
  // Document
  Document,
  DocumentBlock,
  // Notification
  Notification,
  NotificationPreference,
  // Common
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from '../hierarchy-types.js';

// ── Re-exports from legacy files (backwards compat) ─────────
export type {
  WorkspaceSettings,
  WorkspaceRoleDefinition,
  WorkspacePermission,
  UserRoleAssignment,
} from './workspace.js';
