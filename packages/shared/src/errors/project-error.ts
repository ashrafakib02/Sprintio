import { AppError } from './app-error.js';

/**
 * Domain-specific errors for the Project module.
 * All methods return a new ProjectError (which extends AppError)
 * so the centralized error handler renders them correctly.
 */
export class ProjectError extends AppError {
  constructor(code: string, message: string, statusCode: number = 500) {
    super(code, message, statusCode);
    this.name = 'ProjectError';
  }

  static notFound(id?: string) {
    const msg = id ? `Project '${id}' not found` : 'Project not found';
    return new ProjectError('PROJECT_NOT_FOUND', msg, 404);
  }

  static slugConflict(slug: string) {
    return new ProjectError(
      'PROJECT_SLUG_CONFLICT',
      `A project with slug '${slug}' already exists in this workspace`,
      409,
    );
  }

  static invalidSlug(slug: string) {
    return new ProjectError(
      'PROJECT_INVALID_SLUG',
      `'${slug}' is not a valid project slug. Use lowercase letters, numbers, and hyphens only.`,
      400,
    );
  }

  static archivedWorkspace() {
    return new ProjectError(
      'PROJECT_ARCHIVED_WORKSPACE',
      'Cannot modify projects in an archived workspace',
      400,
    );
  }

  static notMemberOfWorkspace() {
    return new ProjectError('PROJECT_NOT_MEMBER', 'You are not a member of this workspace', 403);
  }

  static insufficientPermissions(action: string) {
    return new ProjectError(
      'PROJECT_INSUFFICIENT_PERMISSIONS',
      `Insufficient permissions to ${action} this project`,
      403,
    );
  }
}
