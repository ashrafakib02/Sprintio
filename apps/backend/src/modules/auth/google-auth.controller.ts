import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import * as googleAuthService from './google-auth.service.js';
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  getDeviceIdFromRequest,
  setDeviceIdCookie,
  cookieDomain,
} from '../../utils/cookie.js';
import { env } from '../../config/env.js';

// ============================================================
// Helpers
// ============================================================

const GOOGLE_STATE_COOKIE = 'google_oauth_state';
const GOOGLE_STATE_MAX_AGE = 600; // 10 minutes in seconds

function sendSuccess(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

function sendError(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ error: message });
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
}

function ensureDeviceIdCookie(res: Response, req: Request): string {
  const existing = getDeviceIdFromRequest(req);
  if (existing) return existing;

  const deviceId = randomUUID();
  setDeviceIdCookie(res, deviceId);
  return deviceId;
}

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
export async function googleLogin(req: Request, res: Response) {
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
    console.error('Google login init error:', error);
    return res.redirect(`${env.FRONTEND_URL}/auth/callback?error=google_auth_init_failed`);
  }
}

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback, validates state, and creates session.
 */
export async function googleCallback(req: Request, res: Response) {
  try {
    const { code, state, error: googleError } = req.query;

    // Check for Google-level errors
    if (googleError) {
      console.error('Google OAuth error:', googleError);
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

    const result = await googleAuthService.handleGoogleCallback(code, {
      deviceId,
      userAgent,
      ipAddress,
    });

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return res.redirect(`${env.FRONTEND_URL}/auth/callback?success=true`);
  } catch (error) {
    console.error('Google callback error:', error);
    // Map known errors to safe messages; never expose raw exception details
    let safeMessage = 'google_callback_failed';
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) safeMessage = 'code_expired_or_used';
      else if (error.message.includes('redirect_uri_mismatch')) safeMessage = 'configuration_error';
    }
    return res.redirect(`${env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(safeMessage)}`);
  }
}

/**
 * POST /api/auth/google/link
 * Links a Google account to the authenticated user.
 */
export async function googleLink(req: Request, res: Response) {
  try {
    const user = req.user as { userId: string } | undefined;
    if (!user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return sendError(res, 'Authorization code is required', 400);
    }

    const providers = await googleAuthService.linkGoogleAccount(user.userId, code);

    return sendSuccess(res, { providers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to link Google account';

    if (message.includes('already linked to another user')) {
      return sendError(res, message, 409);
    }

    if (message.includes('already linked')) {
      return sendError(res, message, 409);
    }

    console.error('Google link error:', error);
    return sendError(res, 'Failed to link Google account', 500);
  }
}

/**
 * POST /api/auth/google/unlink
 * Unlinks the Google account from the authenticated user.
 */
export async function googleUnlink(req: Request, res: Response) {
  try {
    const user = req.user as { userId: string } | undefined;
    if (!user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const providers = await googleAuthService.unlinkGoogleAccount(user.userId);

    return sendSuccess(res, { providers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unlink Google account';

    if (message.includes('Cannot unlink')) {
      return sendError(res, message, 400);
    }

    console.error('Google unlink error:', error);
    return sendError(res, 'Failed to unlink Google account', 500);
  }
}

/**
 * GET /api/auth/google/providers
 * Returns the list of linked OAuth providers for the authenticated user.
 */
export async function googleProviders(req: Request, res: Response) {
  try {
    const user = req.user as { userId: string } | undefined;
    if (!user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const providers = await googleAuthService.getLinkedProviders(user.userId);

    return sendSuccess(res, { providers });
  } catch (error) {
    console.error('Google providers error:', error);
    return sendError(res, 'Failed to get linked providers', 500);
  }
}
