import { eq, and, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { roles, permissions, rolePermissions, userRoles } from '../schema/index.js';

// ============================================================
// Roles
// ============================================================

export async function findRoleByName(db: PostgresJsDatabase, roleName: string, scope: string) {
  const rows = await db
    .select()
    .from(roles)
    .where(and(eq(roles.name, roleName), eq(roles.scope, scope)))
    .limit(1);
  return rows[0] ?? undefined;
}

export async function findRoleById(db: PostgresJsDatabase, roleId: string) {
  const rows = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  return rows[0] ?? undefined;
}

export async function listRoles(db: PostgresJsDatabase, scope: string) {
  return db.select().from(roles).where(eq(roles.scope, scope));
}

export async function createRole(
  db: PostgresJsDatabase,
  data: { name: string; description?: string; scope: string; isSystem?: boolean },
) {
  const rows = await db
    .insert(roles)
    .values({
      name: data.name,
      description: data.description ?? null,
      scope: data.scope,
      isSystem: data.isSystem ?? false,
    })
    .returning();
  return rows[0];
}

export async function deleteRole(db: PostgresJsDatabase, roleId: string) {
  await db.delete(roles).where(eq(roles.id, roleId));
}

// ============================================================
// Permissions
// ============================================================

export async function findPermissionByName(db: PostgresJsDatabase, permName: string) {
  const rows = await db.select().from(permissions).where(eq(permissions.name, permName)).limit(1);
  return rows[0] ?? undefined;
}

export async function getRolePermissions(db: PostgresJsDatabase, roleId: string) {
  return db
    .select({
      id: permissions.id,
      name: permissions.name,
      resource: permissions.resource,
      action: permissions.action,
      description: permissions.description,
      createdAt: permissions.createdAt,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
}

export async function setRolePermissions(
  db: PostgresJsDatabase,
  roleId: string,
  permissionIds: string[],
) {
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (permissionIds.length > 0) {
    await db
      .insert(rolePermissions)
      .values(permissionIds.map((pid) => ({ roleId, permissionId: pid })));
  }
}

// ============================================================
// User Roles
// ============================================================

export async function getUserPermissionNames(
  db: PostgresJsDatabase,
  userId: string,
  scope: string,
  scopeId?: string | null,
): Promise<string[]> {
  const scopeFilter =
    scopeId != null
      ? and(
          eq(userRoles.scope, scope),
          eq(userRoles.scopeId, scopeId),
          eq(userRoles.userId, userId),
        )
      : and(eq(userRoles.scope, scope), isNull(userRoles.scopeId), eq(userRoles.userId, userId));

  const rows = await db
    .select({ permName: permissions.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(scopeFilter);

  return [...new Set(rows.map((r) => r.permName))];
}

export async function getUserRoles(
  db: PostgresJsDatabase,
  userId: string,
  scope: string,
  scopeId?: string | null,
) {
  const scopeFilter =
    scopeId != null
      ? and(
          eq(userRoles.scope, scope),
          eq(userRoles.scopeId, scopeId),
          eq(userRoles.userId, userId),
        )
      : and(eq(userRoles.scope, scope), isNull(userRoles.scopeId), eq(userRoles.userId, userId));

  return db.select().from(userRoles).where(scopeFilter);
}

export async function assignUserRole(
  db: PostgresJsDatabase,
  userId: string,
  roleId: string,
  scope: string,
  scopeId: string | null,
) {
  const rows = await db.insert(userRoles).values({ userId, roleId, scope, scopeId }).returning();
  return rows[0];
}

export async function revokeUserRole(
  db: PostgresJsDatabase,
  userId: string,
  roleId: string,
  scope: string,
  scopeId?: string | null,
) {
  const filter =
    scopeId != null
      ? and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.scope, scope),
          eq(userRoles.scopeId, scopeId),
        )
      : and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.scope, scope),
          isNull(userRoles.scopeId),
        );

  await db.delete(userRoles).where(filter);
}

export async function getUserPrimaryRole(
  db: PostgresJsDatabase,
  userId: string,
  scope: string,
  scopeId?: string | null,
): Promise<string | undefined> {
  const scopeFilter =
    scopeId != null
      ? and(
          eq(userRoles.scope, scope),
          eq(userRoles.scopeId, scopeId),
          eq(userRoles.userId, userId),
        )
      : and(eq(userRoles.scope, scope), isNull(userRoles.scopeId), eq(userRoles.userId, userId));

  const rows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(scopeFilter)
    .limit(1);

  return rows[0]?.roleName;
}
