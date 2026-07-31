import { repoDb } from '../../config/db-for-repos.js';
import { rbacRepo } from '@sprintio/db/repositories';
import { redis } from '../../config/redis.js';
import { rbacPermissionsKey, rbacRoleKey } from '../../utils/redis-keys.js';
import { PERMISSIONS, AppError, ROLE_HIERARCHY } from '@sprintio/shared';

const PERMISSION_CACHE_TTL = 300; // 5 minutes
const ROLE_CACHE_TTL = 300;

// ============================================================
// Cache Helpers
// ============================================================

function permissionCacheKey(userId: string, scope: string, scopeId?: string | null): string {
  return rbacPermissionsKey(userId, scope, scopeId);
}

function roleCacheKey(userId: string, scope: string, scopeId?: string | null): string {
  return rbacRoleKey(userId, scope, scopeId);
}

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function setCache(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    // Cache write failure is non-fatal
  }
}

async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-fatal
  }
}

// ============================================================
// Permission Resolution
// ============================================================

/**
 * Get all permission names for a user within a scope.
 * Uses Redis cache with 5-minute TTL.
 * Falls back to hardcoded PERMISSIONS map if DB has no roles (MVP compatibility).
 */
export async function getUserPermissions(
  userId: string,
  scope: string,
  scopeId?: string | null,
): Promise<string[]> {
  const cacheKey = permissionCacheKey(userId, scope, scopeId);

  // Check cache
  const cached = await getCached<string[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Query DB
  let permissions = await rbacRepo.getUserPermissionNames(repoDb, userId, scope, scopeId);

  // MVP fallback: if no DB roles assigned, resolve from membership role + hardcoded map
  if (permissions.length === 0) {
    permissions = await resolveFallbackPermissions(userId, scope, scopeId);
  }

  // Cache result
  await setCache(cacheKey, permissions, PERMISSION_CACHE_TTL);

  return permissions;
}

/**
 * Fallback permission resolution for MVP compatibility.
 * Reads the user's role from the membership table and maps it to permissions
 * using the static ROLE_PERMISSIONS map.
 */
async function resolveFallbackPermissions(
  userId: string,
  scope: string,
  scopeId?: string | null,
): Promise<string[]> {
  let roleName: string | undefined;

  if (scope === 'workspace' && scopeId) {
    const { workspaceRepo } = await import('@sprintio/db/repositories');
    roleName = await workspaceRepo.getMemberRole(repoDb, scopeId, userId);
  } else if (scope === 'organization' && scopeId) {
    const { organizationRepo } = await import('@sprintio/db/repositories');
    roleName = await organizationRepo.getMemberRole(repoDb, scopeId, userId);
  }

  if (!roleName) {
    return [];
  }

  return getStaticPermissions(roleName, scope);
}

/**
 * Get permissions from the static ROLE_PERMISSIONS map (MVP fallback).
 */
function getStaticPermissions(role: string, scope: string): string[] {
  if (role === 'owner') {
    // Owner bypasses all — return all permissions for the scope
    return scope === 'organization'
      ? [
          ...Object.values(PERMISSIONS.ORGANIZATION),
          ...Object.values(PERMISSIONS.WORKSPACE),
          ...Object.values(PERMISSIONS.BOARD),
          ...Object.values(PERMISSIONS.TASK),
          ...Object.values(PERMISSIONS.DOCUMENT),
        ]
      : [
          ...Object.values(PERMISSIONS.WORKSPACE),
          ...Object.values(PERMISSIONS.BOARD),
          ...Object.values(PERMISSIONS.TASK),
          ...Object.values(PERMISSIONS.DOCUMENT),
        ];
  }

  const ROLE_MAP: Record<string, Record<string, string[]>> = {
    organization: {
      admin: [
        ...(PERMISSIONS.ORGANIZATION.UPDATE
          ? ['organization:update', 'organization:manage_members', 'organization:settings']
          : []),
        ...(PERMISSIONS.WORKSPACE.UPDATE ? ['workspace:update', 'workspace:manage_members'] : []),
        ...Object.values(PERMISSIONS.BOARD),
        ...Object.values(PERMISSIONS.TASK),
        ...Object.values(PERMISSIONS.DOCUMENT),
      ],
      member: [
        ...Object.values(PERMISSIONS.BOARD),
        ...Object.values(PERMISSIONS.TASK),
        ...Object.values(PERMISSIONS.DOCUMENT),
      ],
      guest: ['board:create', 'task:create', 'document:create'],
    },
    workspace: {
      admin: [
        'workspace:update',
        'workspace:manage_members',
        ...Object.values(PERMISSIONS.BOARD),
        ...Object.values(PERMISSIONS.TASK),
        ...Object.values(PERMISSIONS.DOCUMENT),
      ],
      member: [
        ...Object.values(PERMISSIONS.BOARD),
        ...Object.values(PERMISSIONS.TASK),
        ...Object.values(PERMISSIONS.DOCUMENT),
      ],
      guest: ['board:create', 'task:create', 'document:create'],
    },
  };

  return ROLE_MAP[scope]?.[role] ?? [];
}

/**
 * Check if a user has a specific permission within a scope.
 */
export async function hasPermission(
  userId: string,
  permission: string,
  scope: string,
  scopeId?: string | null,
): Promise<boolean> {
  const perms = await getUserPermissions(userId, scope, scopeId);
  return perms.includes(permission);
}

/**
 * Check if a user has ALL of the specified permissions.
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[],
  scope: string,
  scopeId?: string | null,
): Promise<boolean> {
  const userPerms = await getUserPermissions(userId, scope, scopeId);
  return permissions.every((p) => userPerms.includes(p));
}

// ============================================================
// Role Assignment
// ============================================================

/**
 * Assign a role to a user within a scope.
 * Validates that the role exists and the assigner has permission.
 */
export async function assignRole(
  userId: string,
  roleName: string,
  scope: string,
  scopeId: string | null,
  assignedBy: string,
): Promise<void> {
  // Validate role exists for this scope
  const role = await rbacRepo.findRoleByName(repoDb, roleName, scope);
  if (!role) {
    throw AppError.badRequest(`Role '${roleName}' does not exist for scope '${scope}'`);
  }

  // Check assigner has manage_members permission
  const assignerHasPermission = await hasPermission(
    assignedBy,
    scope === 'organization' ? 'organization:manage_members' : 'workspace:manage_members',
    scope,
    scopeId,
  );
  if (!assignerHasPermission) {
    throw AppError.forbidden('You do not have permission to assign roles');
  }

  // Prevent assigning a role equal to or higher than assigner's role
  const assignerRole = await getUserPrimaryRole(assignedBy, scope, scopeId);
  if (assignerRole) {
    const assignerLevel = ROLE_HIERARCHY[assignerRole] ?? 0;
    const targetLevel = ROLE_HIERARCHY[roleName] ?? 0;
    if (targetLevel >= assignerLevel) {
      throw AppError.forbidden(
        `Cannot assign a role equal to or higher than your own (${assignerRole})`,
      );
    }
  }

  // Check if user already has a role in this scope
  const existingRoles = await rbacRepo.getUserRoles(repoDb, userId, scope, scopeId);
  if (existingRoles.length > 0) {
    // Update existing role
    await rbacRepo.revokeUserRole(repoDb, userId, existingRoles[0].roleId, scope, scopeId);
  }

  await rbacRepo.assignUserRole(repoDb, userId, role.id, scope, scopeId);

  // Invalidate cache
  await invalidateCache(`rbac:*:${userId}:*`);
}

/**
 * Revoke a role from a user within a scope.
 */
export async function revokeRole(
  userId: string,
  scope: string,
  scopeId: string | null,
  revokedBy: string,
): Promise<void> {
  // Check revoker has manage_members permission
  const revokerHasPermission = await hasPermission(
    revokedBy,
    scope === 'organization' ? 'organization:manage_members' : 'workspace:manage_members',
    scope,
    scopeId,
  );
  if (!revokerHasPermission) {
    throw AppError.forbidden('You do not have permission to revoke roles');
  }

  // Cannot revoke owner role
  const targetRole = await getUserPrimaryRole(userId, scope, scopeId);
  if (targetRole === 'owner') {
    throw AppError.forbidden('Cannot revoke the owner role');
  }

  const userRoleRecords = await rbacRepo.getUserRoles(repoDb, userId, scope, scopeId);
  for (const ur of userRoleRecords) {
    await rbacRepo.revokeUserRole(repoDb, userId, ur.roleId, scope, scopeId);
  }

  // Invalidate cache
  await invalidateCache(`rbac:*:${userId}:*`);
}

/**
 * Get the user's primary role within a scope.
 * Uses Redis cache.
 */
export async function getUserPrimaryRole(
  userId: string,
  scope: string,
  scopeId?: string | null,
): Promise<string | undefined> {
  const cacheKey = roleCacheKey(userId, scope, scopeId);

  const cached = await getCached<string>(cacheKey);
  if (cached) {
    return cached;
  }

  // Try DB first
  let role = await rbacRepo.getUserPrimaryRole(repoDb, userId, scope, scopeId);

  // Fallback to membership table
  if (!role) {
    if (scope === 'workspace' && scopeId) {
      const { workspaceRepo } = await import('@sprintio/db/repositories');
      role = (await workspaceRepo.getMemberRole(repoDb, scopeId, userId)) ?? undefined;
    } else if (scope === 'organization' && scopeId) {
      const { organizationRepo } = await import('@sprintio/db/repositories');
      role = (await organizationRepo.getMemberRole(repoDb, scopeId, userId)) ?? undefined;
    }
  }

  if (role) {
    await setCache(cacheKey, role, ROLE_CACHE_TTL);
  }

  return role;
}

/**
 * Invalidate all RBAC caches for a user.
 * Call after role changes, member additions/removals, etc.
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await invalidateCache(`rbac:*:${userId}:*`);
}

/**
 * Sync permissions from the PERMISSIONS constant to the database.
 * Ensures the DB stays in sync with code-defined permissions.
 * Called on application startup.
 */
export async function syncPermissions(): Promise<void> {
  const allPermissions = [
    ...Object.entries(PERMISSIONS.ORGANIZATION).map(([action, name]) => ({
      name,
      resource: 'organization',
      action,
    })),
    ...Object.entries(PERMISSIONS.WORKSPACE).map(([action, name]) => ({
      name,
      resource: 'workspace',
      action,
    })),
    ...Object.entries(PERMISSIONS.BOARD).map(([action, name]) => ({
      name,
      resource: 'board',
      action,
    })),
    ...Object.entries(PERMISSIONS.TASK).map(([action, name]) => ({
      name,
      resource: 'task',
      action,
    })),
    ...Object.entries(PERMISSIONS.DOCUMENT).map(([action, name]) => ({
      name,
      resource: 'document',
      action,
    })),
  ];

  for (const perm of allPermissions) {
    const existing = await rbacRepo.findPermissionByName(repoDb, perm.name);
    if (!existing) {
      // Permission doesn't exist in DB yet — insert it
      const { permissions } = await import('@sprintio/db/schema');
      await repoDb
        .insert(permissions)
        .values({
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
        })
        .onConflictDoNothing();
    }
  }
}
