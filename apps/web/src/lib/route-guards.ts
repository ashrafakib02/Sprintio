import type { UserRole } from '@sprintio/shared';
import { ROLE_HIERARCHY } from '@sprintio/shared';
import type { AuthUser } from '@/types/auth';

/**
 * Check if user has at least the minimum required role level.
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Check if user has one of the allowed roles.
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Role-based guard for use in beforeLoad callbacks.
 * Throws an error if the user doesn't have one of the required roles.
 *
 * Usage:
 * ```ts
 * beforeLoad: ({ context }) => {
 *   requireRoles(context.auth.user, ['owner', 'admin']);
 * }
 * ```
 */
export function requireRoles(user: AuthUser | null, roles: UserRole[]): void {
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!roles.includes(user.role as UserRole)) {
    throw new Error('Insufficient permissions');
  }
}
