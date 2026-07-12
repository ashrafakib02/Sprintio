import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@sprintio/shared';

/**
 * Centralized error handler middleware.
 * Catches AppError instances and maps them to structured JSON responses.
 * Unknown errors return a generic 500.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
