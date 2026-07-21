import type { Response } from 'express';

/**
 * Send a structured success response.
 */
export function sendSuccess(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

/**
 * Send a structured error response.
 */
export function sendError(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ error: message });
}
