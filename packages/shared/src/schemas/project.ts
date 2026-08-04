/**
 * @deprecated Import from '../hierarchy-types.js' instead.
 * This file re-exports for backwards compatibility.
 */
export {
  ProjectStatusSchema,
  ProjectPrioritySchema,
  ProjectVisibilitySchema,
  SprintStatusSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  CreateSprintSchema,
  UpdateSprintSchema,
  type CreateSprintInput,
  type UpdateSprintInput,
} from '../hierarchy-types.js';

import { z } from 'zod';
import { CreateProjectSchema } from '../hierarchy-types.js';

// ── Workspace-scoped creation (workspaceId from URL param) ─────
export const CreateProjectForWorkspaceSchema = CreateProjectSchema.omit({ workspaceId: true });
export type CreateProjectForWorkspaceInput = z.infer<typeof CreateProjectForWorkspaceSchema>;

// ── Query / filter schemas ─────────────────────────────────────
export const ProjectListQuerySchema = z.object({
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional(),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']).optional(),
  visibility: z.enum(['workspace', 'public']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ProjectListQueryInput = z.infer<typeof ProjectListQuerySchema>;

// ── Slug generation helper ─────────────────────────────────────
/**
 * Generate a URL-safe slug from a project name.
 * Converts to lowercase, replaces spaces with hyphens,
 * strips non-alphanumeric characters (except hyphens),
 * and collapses consecutive hyphens.
 */
export function generateProjectSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
