export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(resource: string) {
    return new AppError('NOT_FOUND', `${resource} not found`, 404);
  }

  static badRequest(message: string) {
    return new AppError('BAD_REQUEST', message, 400);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new AppError('FORBIDDEN', message, 403);
  }

  static conflict(message: string) {
    return new AppError('CONFLICT', message, 409);
  }

  static validation(details: Record<string, unknown>) {
    return new AppError('VALIDATION_ERROR', 'Validation failed', 422, details);
  }

  static internal(message = 'Internal server error') {
    return new AppError('INTERNAL_ERROR', message, 500);
  }
}
