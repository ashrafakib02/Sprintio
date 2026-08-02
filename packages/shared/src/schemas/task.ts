/**
 * @deprecated Import from '../hierarchy-types.js' instead.
 * This file re-exports for backwards compatibility.
 */
export {
  TaskStatusSchema,
  TaskPrioritySchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '../hierarchy-types.js';

import { z } from 'zod';
import { CreateTaskSchema } from '../hierarchy-types.js';

// Nested creation: projectId comes from URL param, not request body
export const CreateTaskForProjectSchema = CreateTaskSchema.omit({
  boardId: true,
  columnId: true,
}).extend({
  boardId: z.string().uuid().nullable().optional(),
  columnId: z.string().uuid().nullable().optional(),
});
export type CreateTaskForProjectInput = z.infer<typeof CreateTaskForProjectSchema>;
