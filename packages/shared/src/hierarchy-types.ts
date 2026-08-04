/**
 * Hierarchy Types — Organization → Workspace → Project → Task
 *
 * This module defines the canonical shared types for the Sprintio hierarchy.
 * Tasks live in Projects, which belong to Workspaces, which belong to
 * Organizations. Boards are an optional visual layer on top of projects.
 *
 * Design decisions:
 *   - Task.boardId / Task.columnId are optional: tasks are placed on boards
 *     after creation, not during. A task always belongs to a project.
 *   - Task.sprintId is optional: sprints are temporal groupings within a
 *     project, not required for every task.
 *   - Board.spaceId is optional: not all boards belong to a space.
 *   - Milestone was removed: no DB table backing it.
 */

import { z } from 'zod';

// ── Re-use existing constants ────────────────────────────────
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_VISIBILITIES,
  BOARD_VIEW_TYPES,
} from './constants/status.js';

// ═══════════════════════════════════════════════════════════════
// Enums / union types
// ═══════════════════════════════════════════════════════════════

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];
export type BoardViewType = (typeof BOARD_VIEW_TYPES)[number];
export type SprintStatus = 'planned' | 'active' | 'completed';

// ═══════════════════════════════════════════════════════════════
// Organization
// ═══════════════════════════════════════════════════════════════

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'guest';

// ═══════════════════════════════════════════════════════════════
// Workspace
// ═══════════════════════════════════════════════════════════════

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  organizationId: string;
  plan: 'free' | 'pro' | 'enterprise';
  brandColor: string | null;
  customDomain: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

// ═══════════════════════════════════════════════════════════════
// Project
// ═══════════════════════════════════════════════════════════════

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspaceId: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  visibility: ProjectVisibility;
  startDate: string | null;
  endDate: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
}

export type ProjectRole = 'admin' | 'member' | 'viewer';

// ═══════════════════════════════════════════════════════════════
// Sprint
// ═══════════════════════════════════════════════════════════════

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// Task — lives in a Project, optionally placed on a Board
// ═══════════════════════════════════════════════════════════════

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** The project this task belongs to (always required). */
  projectId: string;
  /** Board this task is displayed on (optional — tasks can exist without a board). */
  boardId: string | null;
  /** Column on the board (optional — only set when boardId is set). */
  columnId: string | null;
  /** Sprint this task is planned for (optional). */
  sprintId: string | null;
  assigneeId: string | null;
  position: number;
  labels: string[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// Board — visual layer, belongs to a Workspace
// ═══════════════════════════════════════════════════════════════

export interface Board {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  spaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  boardId: string;
  position: number;
  color: string | null;
}

export interface Card {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  boardId: string;
  position: number;
  priority: string;
  assigneeIds: string[];
  labelIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardView {
  id: string;
  name: string;
  type: BoardViewType;
  boardId: string;
  isDefault: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Zod Schemas — Create / Update DTOs
// ═══════════════════════════════════════════════════════════════

// ── Task ──────────────────────────────────────────────────────

export const TaskStatusSchema = z.enum(TASK_STATUSES);
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES);
export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export const ProjectPrioritySchema = z.enum(PROJECT_PRIORITIES);
export const ProjectVisibilitySchema = z.enum(PROJECT_VISIBILITIES);
export const SprintStatusSchema = z.enum(['planned', 'active', 'completed'] as const);

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  /** Project is required — tasks always belong to a project. */
  projectId: z.string().uuid(),
  /** Optional: place on a board after creation. */
  boardId: z.string().uuid().nullable().optional(),
  /** Optional: place in a column (only valid when boardId is set). */
  columnId: z.string().uuid().nullable().optional(),
  /** Optional: assign to a sprint. */
  sprintId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  priority: TaskPrioritySchema.default('none'),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().uuid()).optional(),
  parentId: z.string().uuid().optional(),
  position: z.number().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().omit({ projectId: true });

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// ── Project ───────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000).optional(),
  /** Workspace is required — projects always belong to a workspace. */
  workspaceId: z.string().uuid(),
  priority: ProjectPrioritySchema.default('none'),
  visibility: ProjectVisibilitySchema.default('workspace'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ workspaceId: true });

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ── Sprint ────────────────────────────────────────────────────

export const CreateSprintSchema = z.object({
  name: z.string().min(1).max(100),
  projectId: z.string().uuid(),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const UpdateSprintSchema = CreateSprintSchema.partial().omit({ projectId: true });

export type CreateSprintInput = z.infer<typeof CreateSprintSchema>;
export type UpdateSprintInput = z.infer<typeof UpdateSprintSchema>;

// ── Board ─────────────────────────────────────────────────────

export const BoardViewTypeSchema = z.enum(BOARD_VIEW_TYPES);

export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  spaceId: z.string().uuid().optional(),
});

export const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;
export type UpdateBoardInput = z.infer<typeof UpdateBoardSchema>;

// ═══════════════════════════════════════════════════════════════
// Document (unchanged, kept for completeness)
// ═══════════════════════════════════════════════════════════════

export interface Document {
  id: string;
  title: string;
  content: string | null;
  projectId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentBlock {
  id: string;
  documentId: string;
  type: string;
  content: string | null;
  position: number;
}

// ═══════════════════════════════════════════════════════════════
// Notification (unchanged, kept for completeness)
// ═══════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: string;
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Common API types (unchanged)
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
