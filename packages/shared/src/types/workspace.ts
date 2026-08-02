import type { User } from './user.js';
import { WORKSPACE_ROLES } from '../constants/roles.js';

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

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
  user?: User;
  createdAt: string;
}

// ── Workspace Settings Types ────────────────────────────────

export interface WorkspaceSettings {
  workspace: Workspace;
  userRole: WorkspaceRole;
}

// ── Role Management Types ───────────────────────────────────

export interface WorkspaceRoleDefinition {
  id: string;
  name: string;
  description: string | null;
  scope: 'workspace' | 'organization';
  isSystem: boolean;
  permissions: WorkspacePermission[];
  createdAt: string;
}

export interface WorkspacePermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  scope: 'global' | 'organization' | 'workspace';
  scopeId: string | null;
  createdAt: string;
}
