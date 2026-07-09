import { z } from 'zod';

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']);
export const TaskPrioritySchema = z.enum(['none', 'low', 'medium', 'high', 'urgent']);

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  priority: TaskPrioritySchema.default('none'),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().uuid()).optional(),
  sprintId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().optional(),
  position: z.number().optional(),
  boardId: z.string().uuid(),
  columnId: z.string().uuid(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
