import type { User } from './user.js';
import { WORKSPACE_ROLES } from '../constants/roles.js';

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  user?: User;
  createdAt: string;
}
