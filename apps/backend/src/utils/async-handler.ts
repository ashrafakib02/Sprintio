import type { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler so that thrown errors are forwarded to Express's
 * error-handling middleware instead of becoming unhandled promise rejections.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return fn(req, res, next).catch(next) as Promise<void>;
  };
}
