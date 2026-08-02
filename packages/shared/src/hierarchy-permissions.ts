/**
 * Hierarchy Permissions — Organization → Workspace → Project → Task
 *
 * This module defines the authorization model for Sprintio's resource
 * hierarchy. Permissions are scoped to the level at which they are
 * granted and can cascade downward:
 *
 *   Organization-level permissions apply to all workspaces and projects
 *   the user can access within that organization.
 *
 *   Workspace-level permissions apply to all projects within that
 *   workspace (but NOT across other workspaces).
 *
 *   Project-level permissions apply only to the specific project and
 *   its tasks, sprints, and boards.
 *
 * Resource ownership chain:
 *   User → OrganizationMembership → WorkspaceMembership → ProjectMembership → Task
 *
 * The backend middleware validates the full chain:
 *   requireOrganizationPermission  (DB-backed, org-level)
 *   requireWorkspacePermission     (DB-backed, workspace-level)
 *   requireProjectPermission       (DB-backed, project-level)
 *   requireResourceOwner           (ownership or admin override)
 */

import type {
  OrganizationRole,
  WorkspaceRole,
  ProjectRole,
} from './hierarchy-types.js';

// ═══════════════════════════════════════════════════════════════
// 1. Permission constants — every permission string in the system
// ═══════════════════════════════════════════════════════════════

export const PERMISSIONS = {
  // ── Organization ───────────────────────────────────────────
  ORGANIZATION: {
    CREATE: 'organization:create',
    UPDATE: 'organization:update',
    DELETE: 'organization:delete',
    MANAGE_MEMBERS: 'organization:manage_members',
    MANAGE_BILLING: 'organization:manage_billing',
    SETTINGS: 'organization:settings',
  },

  // ── Workspace ──────────────────────────────────────────────
  WORKSPACE: {
    CREATE: 'workspace:create',
    UPDATE: 'workspace:update',
    DELETE: 'workspace:delete',
    MANAGE_MEMBERS: 'workspace:manage_members',
    MANAGE_BILLING: 'workspace:manage_billing',
    SETTINGS: 'workspace:settings',
    MANAGE_ROLES: 'workspace:manage_roles',
  },

  // ── Project (NEW) ──────────────────────────────────────────
  PROJECT: {
    CREATE: 'project:create',
    READ: 'project:read',
    UPDATE: 'project:update',
    DELETE: 'project:delete',
    MANAGE_MEMBERS: 'project:manage_members',
  },

  // ── Board ──────────────────────────────────────────────────
  BOARD: {
    CREATE: 'board:create',
    UPDATE: 'board:update',
    DELETE: 'board:delete',
  },

  // ── Task ───────────────────────────────────────────────────
  TASK: {
    CREATE: 'task:create',
    UPDATE: 'task:update',
    DELETE: 'task:delete',
    ASSIGN: 'task:assign',
  },

  // ── Document ───────────────────────────────────────────────
  DOCUMENT: {
    CREATE: 'document:create',
    UPDATE: 'document:update',
    DELETE: 'document:delete',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// 2. Organization role → permissions
//
// Org owners/admins can manage workspaces and projects across the
// org. Members get workspace create. Guests have no org perms.
// ═══════════════════════════════════════════════════════════════

export const ORG_ROLE_PERMISSIONS: Record<OrganizationRole, readonly string[]> = {
  owner: [
    // Org management
    PERMISSIONS.ORGANIZATION.UPDATE,
    PERMISSIONS.ORGANIZATION.DELETE,
    PERMISSIONS.ORGANIZATION.MANAGE_MEMBERS,
    PERMISSIONS.ORGANIZATION.MANAGE_BILLING,
    PERMISSIONS.ORGANIZATION.SETTINGS,
    // Cascades to all workspaces in this org
    PERMISSIONS.WORKSPACE.CREATE,
    PERMISSIONS.WORKSPACE.UPDATE,
    PERMISSIONS.WORKSPACE.DELETE,
    PERMISSIONS.WORKSPACE.MANAGE_MEMBERS,
    PERMISSIONS.WORKSPACE.MANAGE_BILLING,
    PERMISSIONS.WORKSPACE.SETTINGS,
    PERMISSIONS.WORKSPACE.MANAGE_ROLES,
    // Cascades to all projects in this org's workspaces
    PERMISSIONS.PROJECT.CREATE,
    PERMISSIONS.PROJECT.READ,
    PERMISSIONS.PROJECT.UPDATE,
    PERMISSIONS.PROJECT.DELETE,
    PERMISSIONS.PROJECT.MANAGE_MEMBERS,
    // Cascades to boards, tasks, documents
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  admin: [
    // Org management (no delete)
    PERMISSIONS.ORGANIZATION.UPDATE,
    PERMISSIONS.ORGANIZATION.MANAGE_MEMBERS,
    PERMISSIONS.ORGANIZATION.MANAGE_BILLING,
    PERMISSIONS.ORGANIZATION.SETTINGS,
    // Workspace management
    PERMISSIONS.WORKSPACE.CREATE,
    PERMISSIONS.WORKSPACE.UPDATE,
    PERMISSIONS.WORKSPACE.MANAGE_MEMBERS,
    PERMISSIONS.WORKSPACE.MANAGE_BILLING,
    PERMISSIONS.WORKSPACE.SETTINGS,
    PERMISSIONS.WORKSPACE.MANAGE_ROLES,
    // Project management
    PERMISSIONS.PROJECT.CREATE,
    PERMISSIONS.PROJECT.READ,
    PERMISSIONS.PROJECT.UPDATE,
    PERMISSIONS.PROJECT.DELETE,
    PERMISSIONS.PROJECT.MANAGE_MEMBERS,
    // Boards, tasks, documents
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  member: [
    // Can create workspaces
    PERMISSIONS.WORKSPACE.CREATE,
    // Read-only project access at org level (actual access gated by workspace)
    PERMISSIONS.PROJECT.READ,
    // Basic task/board/document ops (gated by workspace membership)
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.DOCUMENT.CREATE,
  ],
  guest: [],
};

// ═══════════════════════════════════════════════════════════════
// 3. Workspace role → permissions
//
// These apply within a single workspace. They do NOT grant org-level
// actions like managing the org itself.
// ═══════════════════════════════════════════════════════════════

export const WORKSPACE_ROLE_PERMISSIONS: Record<WorkspaceRole, readonly string[]> = {
  owner: [
    // Workspace management
    PERMISSIONS.WORKSPACE.UPDATE,
    PERMISSIONS.WORKSPACE.DELETE,
    PERMISSIONS.WORKSPACE.MANAGE_MEMBERS,
    PERMISSIONS.WORKSPACE.MANAGE_BILLING,
    PERMISSIONS.WORKSPACE.SETTINGS,
    PERMISSIONS.WORKSPACE.MANAGE_ROLES,
    // Project management (all projects in this workspace)
    PERMISSIONS.PROJECT.CREATE,
    PERMISSIONS.PROJECT.READ,
    PERMISSIONS.PROJECT.UPDATE,
    PERMISSIONS.PROJECT.DELETE,
    PERMISSIONS.PROJECT.MANAGE_MEMBERS,
    // Boards
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    // Tasks
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    // Documents
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  admin: [
    // Workspace management (no delete)
    PERMISSIONS.WORKSPACE.UPDATE,
    PERMISSIONS.WORKSPACE.MANAGE_MEMBERS,
    PERMISSIONS.WORKSPACE.MANAGE_BILLING,
    PERMISSIONS.WORKSPACE.SETTINGS,
    PERMISSIONS.WORKSPACE.MANAGE_ROLES,
    // Project management
    PERMISSIONS.PROJECT.CREATE,
    PERMISSIONS.PROJECT.READ,
    PERMISSIONS.PROJECT.UPDATE,
    PERMISSIONS.PROJECT.DELETE,
    PERMISSIONS.PROJECT.MANAGE_MEMBERS,
    // Boards
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    // Tasks
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    // Documents
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  member: [
    // Can create and manage projects
    PERMISSIONS.PROJECT.CREATE,
    PERMISSIONS.PROJECT.READ,
    PERMISSIONS.PROJECT.UPDATE,
    // Boards
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    // Tasks
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    // Documents
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  guest: [
    PERMISSIONS.PROJECT.READ,
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.DOCUMENT.CREATE,
  ],
};

// ═══════════════════════════════════════════════════════════════
// 4. Project role → permissions
//
// Finest-grained access control. Project roles apply within a
// single project and its tasks/sprints/boards.
// ═══════════════════════════════════════════════════════════════

export const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, readonly string[]> = {
  admin: [
    PERMISSIONS.PROJECT.READ,
    PERMISSIONS.PROJECT.UPDATE,
    PERMISSIONS.PROJECT.DELETE,
    PERMISSIONS.PROJECT.MANAGE_MEMBERS,
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  member: [
    PERMISSIONS.PROJECT.READ,
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
  ],
  viewer: [
    PERMISSIONS.PROJECT.READ,
  ],
};

// ═══════════════════════════════════════════════════════════════
// 5. Resource ownership chain
//
// Encodes the path from a leaf resource back to the organization.
// The middleware walks this chain to validate that a user has
// sufficient access at any level.
// ═══════════════════════════════════════════════════════════════

/**
 * Defines the parent relationship for each resource type.
 * Used by `requireResourceOwner` to walk the ownership chain.
 *
 * Example: to verify a user can access a Task, the middleware:
 *   1. Looks up Task → gets projectId
 *   2. Looks up Project → gets workspaceId
 *   3. Looks up Workspace → gets organizationId
 *   4. Checks OrganizationMembership for the user
 */
export const RESOURCE_PARENT: Record<string, string> = {
  task: 'project',
  sprint: 'project',
  board: 'workspace',
  project: 'workspace',
  workspace: 'organization',
  document: 'project',
  column: 'board',
  card: 'board',
} as const;

/**
 * Returns the full ancestor chain for a resource type.
 * E.g. chainForResource('task') → ['project', 'workspace', 'organization']
 */
export function chainForResource(resourceType: string): string[] {
  const chain: string[] = [];
  let current = resourceType;
  while (current in RESOURCE_PARENT) {
    const parent = RESOURCE_PARENT[current]!;
    chain.push(parent);
    current = parent;
  }
  return chain;
}

// ═══════════════════════════════════════════════════════════════
// 6. Helper — collect all permissions for a role at any level
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the set of permission strings a user holds, given their
 * role at a specific hierarchy level. The result does NOT include
 * permissions from parent levels — the caller must merge as needed.
 */
export function permissionsForOrgRole(role: OrganizationRole): readonly string[] {
  return ORG_ROLE_PERMISSIONS[role] ?? [];
}

export function permissionsForWorkspaceRole(role: WorkspaceRole): readonly string[] {
  return WORKSPACE_ROLE_PERMISSIONS[role] ?? [];
}

export function permissionsForProjectRole(role: ProjectRole): readonly string[] {
  return PROJECT_ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Effective permissions for a user across the full hierarchy.
 * The caller provides the user's roles at each level; this merges
 * all permission sets, deduplicated.
 */
export function effectivePermissions(args: {
  orgRole?: OrganizationRole;
  workspaceRole?: WorkspaceRole;
  projectRole?: ProjectRole;
}): string[] {
  const set = new Set<string>();
  if (args.orgRole) {
    for (const p of ORG_ROLE_PERMISSIONS[args.orgRole]) set.add(p);
  }
  if (args.workspaceRole) {
    for (const p of WORKSPACE_ROLE_PERMISSIONS[args.workspaceRole]) set.add(p);
  }
  if (args.projectRole) {
    for (const p of PROJECT_ROLE_PERMISSIONS[args.projectRole]) set.add(p);
  }
  return [...set];
}

/**
 * Checks whether a set of effective permissions includes ALL of the
 * required permissions.
 */
export function hasAllPermissions(
  effective: string[],
  required: readonly string[],
): boolean {
  const set = new Set(effective);
  return required.every((p) => set.has(p));
}

/**
 * Checks whether a set of effective permissions includes ANY of the
 * required permissions.
 */
export function hasAnyPermission(
  effective: string[],
  required: readonly string[],
): boolean {
  const set = new Set(effective);
  return required.some((p) => set.has(p));
}

// ═══════════════════════════════════════════════════════════════
// 7. Middleware design (types & comments — implement in backend)
//
// The following describe the contract for new backend middleware.
// Implementation lives in apps/backend/src/middleware/.
// ═══════════════════════════════════════════════════════════════

/**
 * requireProjectPermission(...perms: string[])
 *
 * Express middleware that:
 *   1. Reads projectId from req.params.projectId (or req.body.projectId)
 *   2. Looks up the Project → gets workspaceId
 *   3. Looks up the Workspace → gets organizationId
 *   4. Checks the user's membership at project, workspace, and org levels
 *   5. Computes effective permissions (orgRole + workspaceRole + projectRole)
 *   6. Verifies all required `perms` are present
 *
 *   If the user is an org owner or admin, they bypass project-level checks
 *   (org cascade).
 *
 * Signature:
 *   function requireProjectPermission(...perms: string[]): RequestHandler
 */

/**
 * requireProjectMember()
 *
 * Lightweight middleware that verifies the user has any membership
 * (viewer, member, or admin) in the project. Does NOT check specific
 * permissions — use requireProjectPermission for granular access.
 *
 * Implementation:
 *   1. Reads projectId from params
 *   2. Queries project_memberships for (projectId, userId)
 *   3. If no row found, returns 403
 *   4. Attaches projectMembership to req for downstream use
 *
 * Signature:
 *   function requireProjectMember(): RequestHandler
 */

/**
 * Full authorization check flow for a task operation:
 *
 *   1. authenticate()         — verify JWT, attach user
 *   2. requireProjectMember() — user is at least a viewer in the project
 *   3. requireProjectPermission('task:create')
 *                            — user has the specific permission
 *   4. [optional] requireResourceOwner('task')
 *                            — for update/delete: user owns the task OR
 *                              is project/workspace/org admin
 *
 * For organization-wide operations:
 *   1. authenticate()
 *   2. requireOrganizationMember()
 *   3. requireOrganizationPermission('workspace:create')
 */
