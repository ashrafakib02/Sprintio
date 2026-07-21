import { PROJECT_STATUSES } from '../constants/status.js';

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type SprintStatus = 'planned' | 'active' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

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
