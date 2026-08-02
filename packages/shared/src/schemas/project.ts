/**
 * @deprecated Import from '../hierarchy-types.js' instead.
 * This file re-exports for backwards compatibility.
 */
export {
  ProjectStatusSchema,
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

import type { z } from 'zod';
import { CreateProjectSchema } from '../hierarchy-types.js';

// Nested creation: workspaceId comes from URL param, not request body
export const CreateProjectForWorkspaceSchema = CreateProjectSchema.omit({ workspaceId: true });
export type CreateProjectForWorkspaceInput = z.infer<typeof CreateProjectForWorkspaceSchema>;
