import type { Request, Response } from 'express';
import * as passwordResetService from './password-reset.service.js';
import { forgotPasswordSchema, resetPasswordSchema } from './password-reset.validation.js';

// ============================================================
// Helpers
// ============================================================

function sendSuccess(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

function sendError(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ error: message });
}

// ============================================================
// Handlers
// ============================================================

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email if the account exists.
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((err) => err.message).join(', ');
      return sendError(res, message, 400);
    }

    const result = await passwordResetService.forgotPassword(parsed.data.email);
    return sendSuccess(res, { message: result.message });
  } catch (error) {
    console.error('Forgot password error:', error);
    return sendError(res, 'Failed to process request', 500);
  }
}

/**
 * POST /api/auth/reset-password
 * Resets the user's password using a valid reset token.
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((err) => err.message).join(', ');
      return sendError(res, message, 400);
    }

    const { token, password } = parsed.data;
    const result = await passwordResetService.resetPassword(token, password);

    if (!result.success) {
      return sendError(res, result.message, 400);
    }

    return sendSuccess(res, { message: result.message });
  } catch (error) {
    console.error('Reset password error:', error);
    return sendError(res, 'Failed to reset password', 500);
  }
}
