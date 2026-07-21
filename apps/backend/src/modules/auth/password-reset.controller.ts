import type { Request, Response } from 'express';
import * as passwordResetService from './password-reset.service.js';
import { ForgotPasswordSchema, ResetPasswordSchema } from '@sprintio/shared';
import { sendSuccess, sendError } from '../../utils/response.js';
import { asyncHandler } from '../../utils/async-handler.js';

// ============================================================
// Handlers
// ============================================================

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email if the account exists.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(', ');
    return sendError(res, message, 400);
  }

  const result = await passwordResetService.forgotPassword(parsed.data.email);
  return sendSuccess(res, { message: result.message });
});

/**
 * POST /api/auth/reset-password
 * Resets the user's password using a valid reset token.
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
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
});
