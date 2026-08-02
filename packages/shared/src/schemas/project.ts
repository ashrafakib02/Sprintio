import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/status.js';

export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export const SprintStatusSchema = z.enum(['planned', 'active', 'completed']);

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  workspaceId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ workspaceId: true });

// Nested creation: workspaceId comes from URL param, not request body
export const CreateProjectForWorkspaceSchema = CreateProjectSchema.omit({ workspaceId: true });
export type CreateProjectForWorkspaceInput = z.infer<typeof CreateProjectForWorkspaceSchema>;

export const CreateSprintSchema = z.object({
  name: z.string().min(1).max(100),
  projectId: z.string().uuid(),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const UpdateSprintSchema = CreateSprintSchema.partial().omit({ projectId: true });

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateSprintInput = z.infer<typeof CreateSprintSchema>;
export type UpdateSprintInput = z.infer<typeof UpdateSprintSchema>;
