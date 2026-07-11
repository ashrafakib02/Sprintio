import type { Request, Response } from 'express';
import { parse } from 'cookie';
import { env } from '../config/env.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export function setAccessTokenCookie(res: Response, token: string): void {
  const maxAge = Math.floor(env.JWT_ACCESS_EXPIRY_MS / 1000);

  const cookieOptions = [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    env.COOKIE_SECURE ? 'Secure' : '',
    `Max-Age=${maxAge}`,
    env.NODE_ENV === 'production' ? `Domain=${env.COOKIE_DOMAIN}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', `${ACCESS_TOKEN_COOKIE}=${token}; ${cookieOptions}`);
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  const maxAge = Math.floor(env.JWT_REFRESH_EXPIRY_MS / 1000);

  const cookieOptions = [
    'Path=/api/auth/refresh',
    'HttpOnly',
    'SameSite=Strict',
    env.COOKIE_SECURE ? 'Secure' : '',
    `Max-Age=${maxAge}`,
    env.NODE_ENV === 'production' ? `Domain=${env.COOKIE_DOMAIN}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', `${REFRESH_TOKEN_COOKIE}=${token}; ${cookieOptions}`);
}

export function getAccessTokenFromRequest(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = parse(cookieHeader);
  return cookies[ACCESS_TOKEN_COOKIE];
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = parse(cookieHeader);
  return cookies[REFRESH_TOKEN_COOKIE];
}

export function clearAuthCookies(res: Response): void {
  const expiredCookie = 'Max-Age=0';

  const accessCookieOptions = [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    env.COOKIE_SECURE ? 'Secure' : '',
    expiredCookie,
    env.NODE_ENV === 'production' ? `Domain=${env.COOKIE_DOMAIN}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  const refreshCookieOptions = [
    'Path=/api/auth/refresh',
    'HttpOnly',
    'SameSite=Strict',
    env.COOKIE_SECURE ? 'Secure' : '',
    expiredCookie,
    env.NODE_ENV === 'production' ? `Domain=${env.COOKIE_DOMAIN}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  const existingCookies = res.getHeader('Set-Cookie');
  const cookieArray = Array.isArray(existingCookies)
    ? existingCookies
    : existingCookies
      ? [existingCookies]
      : [];

  res.setHeader('Set-Cookie', [
    ...cookieArray.map(String),
    `${ACCESS_TOKEN_COOKIE}=; ${accessCookieOptions}`,
    `${REFRESH_TOKEN_COOKIE}=; ${refreshCookieOptions}`,
  ]);
}
