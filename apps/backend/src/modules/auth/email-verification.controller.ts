import type { Request, Response } from 'express';
import * as emailVerificationService from './email-verification.service.js';
import { ResendVerificationSchema } from '@sprintio/shared';
import { env } from '../../config/env.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { logger } from '../../utils/logger.js';

// ============================================================
// Handlers
// ============================================================

/**
 * GET /api/auth/verify-email/:token
 * Verifies the email using the token from the verification link.
 * Redirects to frontend pages (link is opened from email client).
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token as string;

  if (!token) {
    return res.redirect(`${env.FRONTEND_URL}/verify-email/expired`);
  }

  try {
    const result = await emailVerificationService.verifyEmailToken(token);

    if (result.success) {
      return res.redirect(`${env.FRONTEND_URL}/verified`);
    }

    // Token expired or invalid
    return res.redirect(`${env.FRONTEND_URL}/verify-email/expired`);
  } catch (error) {
    logger.error({ err: error }, 'Verify email error');
    return res.redirect(`${env.FRONTEND_URL}/verify-email/expired`);
  }
});

/**
 * POST /api/auth/resend-verification
 * Resends the verification email to the specified address.
 */
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ResendVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(', ');
    return sendError(res, message, 400);
  }

  const { email } = parsed.data;
  const result = await emailVerificationService.resendVerification(email);

  if (!result.success) {
    return sendError(res, result.message, 409);
  }

  return sendSuccess(res, { message: result.message });
});
