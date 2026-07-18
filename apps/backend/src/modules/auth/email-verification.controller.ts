import type { Request, Response } from 'express';
import * as emailVerificationService from './email-verification.service.js';
import { ResendVerificationSchema } from '@sprintio/shared';
import { env } from '../../config/env.js';

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
 * GET /api/auth/verify-email/:token
 * Verifies the email using the token from the verification link.
 * Redirects to frontend pages (link is opened from email client).
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const token = req.params.token as string;

    if (!token) {
      return res.redirect(`${env.FRONTEND_URL}/verify-email/expired`);
    }

    const result = await emailVerificationService.verifyEmailToken(token);

    if (result.success) {
      return res.redirect(`${env.FRONTEND_URL}/verified`);
    }

    // Token expired or invalid
    return res.redirect(`${env.FRONTEND_URL}/verify-email/expired`);
  } catch (error) {
    console.error('Verify email error:', error);
    return res.redirect(`${env.FRONTEND_URL}/verify-email/expired`);
  }
}

/**
 * POST /api/auth/resend-verification
 * Resends the verification email to the specified address.
 */
export async function resendVerification(req: Request, res: Response) {
  try {
    const parsed = ResendVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      return sendError(res, message, 400);
    }

    const { email } = parsed.data;
    const result = await emailVerificationService.resendVerification(email);

    if (!result.success) {
      return sendError(res, result.message, 409);
    }

    return sendSuccess(res, { message: result.message });
  } catch (error) {
    console.error('Resend verification error:', error);
    return sendError(res, 'Failed to resend verification email', 500);
  }
}
