import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import * as googleAuthService from './google-auth.service.js';
import { setAuthCookies, ensureDeviceIdCookie, cookieDomain } from '../../utils/cookie.js';
import { env } from '../../config/env.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { logger } from '../../utils/logger.js';

// ============================================================
// Helpers (OAuth-state-cookie specific)
// ============================================================

const GOOGLE_STATE_COOKIE = 'google_oauth_state';
const GOOGLE_STATE_MAX_AGE = 600; // 10 minutes in seconds

function appendCookie(res: Response, cookieValue: string): void {
  const existing = res.getHeader('Set-Cookie');
  const cookies = Array.isArray(existing)
    ? existing.map(String)
    : existing
      ? [String(existing)]
      : [];
  res.setHeader('Set-Cookie', [...cookies, cookieValue]);
}

function getCookieValue(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    }),
  );

  return cookies[name];
}

function clearCookie(res: Response, name: string): void {
  const parts = [
    `${name}=; Path=/`,
    'HttpOnly',
    'SameSite=Lax',
    env.COOKIE_SECURE ? 'Secure' : '',
    'Max-Age=0',
  ].filter(Boolean);

  appendCookie(res, parts.join('; '));
}

// ============================================================
// Handlers
// ============================================================

/**
 * GET /api/auth/google
 * Generates a state parameter, stores it in a cookie, and redirects to Google.
 */
export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  try {
    const state = randomUUID();

    // Store state in HttpOnly cookie for CSRF protection
    const parts = [
      `${GOOGLE_STATE_COOKIE}=${state}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      env.COOKIE_SECURE ? 'Secure' : '',
      `Max-Age=${GOOGLE_STATE_MAX_AGE}`,
      cookieDomain(),
    ].filter(Boolean);

    appendCookie(res, parts.join('; '));

    const authUrl = googleAuthService.getGoogleAuthUrl(state);

    return res.redirect(authUrl);
  } catch (error) {
    logger.error({ err: error }, 'Google login init error');
    return res.redirect(`${env.FRONTEND_URL}/auth/callback?error=google_auth_init_failed`);
  }
});

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback, validates state, and creates session.
 */
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state, error: googleError } = req.query;

  // Check for Google-level errors
  if (googleError) {
    logger.error({ googleError }, 'Google OAuth error');
    return res.redirect(
      `${env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(String(googleError))}`,
    );
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(`${env.FRONTEND_URL}/auth/callback?error=no_code_provided`);
  }

  // Validate state parameter (CSRF protection)
  const storedState = getCookieValue(req, GOOGLE_STATE_COOKIE);
  if (!storedState || storedState !== state) {
    return res.redirect(`${env.FRONTEND_URL}/auth/callback?error=invalid_state`);
  }

  // Clear the state cookie
  clearCookie(res, GOOGLE_STATE_COOKIE);

  const deviceId = ensureDeviceIdCookie(res, req);
  const userAgent = req.headers['user-agent'];
  const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;

  try {
    const result = await googleAuthService.handleGoogleCallback(code, {
      deviceId,
      userAgent,
      ipAddress,
    });

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return res.redirect(`${env.FRONTEND_URL}/auth/callback?success=true`);
  } catch (error) {
    logger.error({ err: error }, 'Google callback error');
    // Map known errors to safe messages; never expose raw exception details
    let safeMessage = 'google_callback_failed';
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) safeMessage = 'code_expired_or_used';
      else if (error.message.includes('redirect_uri_mismatch')) safeMessage = 'configuration_error';
    }
    return res.redirect(
      `${env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(safeMessage)}`,
    );
  }
});

/**
 * POST /api/auth/google/link
 * Links a Google account to the authenticated user.
 */
export const googleLink = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return sendError(res, 'Authorization code is required', 400);
  }

  try {
    const providers = await googleAuthService.linkGoogleAccount(req.user.userId, code);

    return sendSuccess(res, { providers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to link Google account';

    if (message.includes('already linked to another user') || message.includes('already linked')) {
      return sendError(res, message, 409);
    }

    logger.error({ err: error }, 'Google link error');
    return sendError(res, 'Failed to link Google account', 500);
  }
});

/**
 * POST /api/auth/google/unlink
 * Unlinks the Google account from the authenticated user.
 */
export const googleUnlink = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const providers = await googleAuthService.unlinkGoogleAccount(req.user.userId);

    return sendSuccess(res, { providers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unlink Google account';

    if (message.includes('Cannot unlink')) {
      return sendError(res, message, 400);
    }

    logger.error({ err: error }, 'Google unlink error');
    return sendError(res, 'Failed to unlink Google account', 500);
  }
});

/**
 * GET /api/auth/google/providers
 * Returns the list of linked OAuth providers for the authenticated user.
 */
export const googleProviders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const providers = await googleAuthService.getLinkedProviders(req.user.userId);

    return sendSuccess(res, { providers });
  } catch (error) {
    logger.error({ err: error }, 'Google providers error');
    return sendError(res, 'Failed to get linked providers', 500);
  }
});
