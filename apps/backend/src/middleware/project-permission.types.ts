import type { RequestHandler } from 'express';
import type { ProjectRole } from '@sprintio/shared';

// ============================================================
// Request Augmentation
// ============================================================

declare global {
  namespace Express {
    interface Request {
      /** Resolved project role for the authenticated user (e.g. 'admin', 'member', 'viewer'). */
      projectRole?: ProjectRole;
      /** Resolved project membership ID (if user is a project member). */
      projectMembershipId?: string;
    }
  }
}

// ============================================================
// Middleware Signatures
// ============================================================

/**
 * requireProjectMember()
 *
 * Lightweight middleware that verifies the authenticated user has
 * any membership (viewer, member, or admin) in the project.
 *
 * Does NOT check specific permissions — use requireProjectPermission
 * for granular access control.
 *
 * Pipeline position:
 *   authenticate → requireProject → requireProjectMember
 *
 * Behavior:
 *   1. Reads projectId from req.params.projectId (set by requireProject)
 *   2. Queries project_memberships for (projectId, userId)
 *   3. If no row found → 403
 *   4. Attaches req.projectRole and req.projectMembershipId
 *   5. Calls next()
 */
export type RequireProjectMember = () => RequestHandler;

/**
 * requireProjectPermission(...permissions)
 *
 * Express middleware that enforces project-scoped RBAC.
 * Checks the user's effective permissions across the full
 * hierarchy chain (org → workspace → project).
 *
 * Pipeline position:
 *   authenticate → requireProject → requireProjectMember → requireProjectPermission(...)
 *
 * Behavior:
 *   1. Reads projectId from req.params.projectId
 *   2. Looks up Project → gets workspaceId
 *   3. Looks up Workspace → gets organizationId
 *   4. Checks membership at project, workspace, and org levels
 *   5. Computes effective permissions (orgRole + workspaceRole + projectRole)
 *   6. Verifies all required perms are present
 *   7. If user is org owner/admin → bypass project-level checks (org cascade)
 *
 * @param permissions - One or more permission strings (e.g. 'project:update', 'task:create')
 * @returns Express RequestHandler
 */
export type RequireProjectPermission = (...permissions: string[]) => RequestHandler;

// ============================================================
// Permission Check Strategy (design doc — not implemented)
// ============================================================

/**
 * The permission resolution follows a bottom-up cascade:
 *
 *   1. PROJECT level: Check project_memberships → project_role
 *      If user has a project role, use PROJECT_ROLE_PERMISSIONS[role].
 *
 *   2. WORKSPACE level: If no project role, fall back to
 *      workspace_members → workspace_role → WORKSPACE_ROLE_PERMISSIONS[role].
 *      Workspace roles cascade to all projects in the workspace.
 *
 *   3. ORGANIZATION level: If no workspace role, fall back to
 *      organization_members → organization_role → ORG_ROLE_PERMISSIONS[role].
 *      Org roles cascade to all workspaces and projects.
 *
 *   4. OWNER BYPASS: Org owners and workspace owners bypass all
 *       permission checks at their level and below.
 *
 * The effective permission set is the union of all three levels,
 * deduplicated. The middleware checks that ALL required permissions
 * are present in the effective set.
 */

// ============================================================
// Route Registration Pattern (design doc — not implemented)
// ============================================================

/**
 * Example route registration using the permission middleware:
 *
 *   import { requireProjectMember, requireProjectPermission } from '../../middleware/project-permission.js';
 *
 *   // Read-only: any project member (viewer, member, admin)
 *   router.get('/:projectId', authenticate, requireProject, requireProjectMember, getProject);
 *
 *   // Write: requires specific permission
 *   router.patch('/:projectId', authenticate, requireProject, requireProjectMember,
 *     requireProjectPermission('project:update'), updateProject);
 *
 *   // Destructive: requires specific permission
 *   router.delete('/:projectId', authenticate, requireProject, requireProjectMember,
 *     requireProjectPermission('project:delete'), deleteProject);
 *
 *   // Member management: requires specific permission
 *   router.post('/:projectId/members', authenticate, requireProject, requireProjectMember,
 *     requireProjectPermission('project:manage_members'), addProjectMember);
 *
 *   // Task operations: project permission cascades to child resources
 *   router.post('/:projectId/tasks', authenticate, requireProject, requireProjectMember,
 *     requireProjectPermission('task:create'), createTask);
 */
