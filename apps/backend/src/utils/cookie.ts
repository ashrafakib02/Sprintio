import type { Request, Response } from 'express';
import { parse } from 'cookie';
import { env } from '../config/env.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// ── Helpers ──────────────────────────────────────────────────

function appendCookie(res: Response, cookieValue: string): void {
  const existing = res.getHeader('Set-Cookie');
  const cookies = Array.isArray(existing)
    ? existing.map(String)
    : existing
      ? [String(existing)]
      : [];
  res.setHeader('Set-Cookie', [...cookies, cookieValue]);
}

export function cookieDomain(): string {
  return env.NODE_ENV === 'production' ? `Domain=${env.COOKIE_DOMAIN}` : '';
}

// ── Access Token Cookie ──────────────────────────────────────

export function setAccessTokenCookie(res: Response, token: string): void {
  const maxAge = Math.floor(env.JWT_ACCESS_EXPIRY_MS / 1000);

  const parts = [
    `${ACCESS_TOKEN_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    env.COOKIE_SECURE ? 'Secure' : '',
    `Max-Age=${maxAge}`,
    cookieDomain(),
  ].filter(Boolean);

  appendCookie(res, parts.join('; '));
}

// ── Refresh Token Cookie ─────────────────────────────────────

export function setRefreshTokenCookie(res: Response, token: string): void {
  const maxAge = Math.floor(env.JWT_REFRESH_EXPIRY_MS / 1000);

  const parts = [
    `${REFRESH_TOKEN_COOKIE}=${token}`,
    'Path=/api/auth/refresh',
    'HttpOnly',
    'SameSite=Strict',
    env.COOKIE_SECURE ? 'Secure' : '',
    `Max-Age=${maxAge}`,
    cookieDomain(),
  ].filter(Boolean);

  appendCookie(res, parts.join('; '));
}

// ── Device ID Cookie ─────────────────────────────────────────

export function setDeviceIdCookie(res: Response, deviceId: string): void {
  const maxAge = env.DEVICE_COOKIE_MAX_AGE;

  const parts = [
    `${env.DEVICE_COOKIE_NAME}=${deviceId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    env.COOKIE_SECURE ? 'Secure' : '',
    `Max-Age=${maxAge}`,
    cookieDomain(),
  ].filter(Boolean);

  appendCookie(res, parts.join('; '));
}

export function getDeviceIdFromRequest(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = parse(cookieHeader);
  return cookies[env.DEVICE_COOKIE_NAME];
}

// ── Read Cookies from Request ────────────────────────────────

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

// ── Clear Cookies ────────────────────────────────────────────

export function clearAuthCookies(res: Response): void {
  const expiredCookie = 'Max-Age=0';

  const accessParts = [
    `${ACCESS_TOKEN_COOKIE}=; Path=/`,
    'HttpOnly',
    'SameSite=Lax',
    env.COOKIE_SECURE ? 'Secure' : '',
    expiredCookie,
    cookieDomain(),
  ].filter(Boolean);

  const refreshParts = [
    `${REFRESH_TOKEN_COOKIE}=; Path=/`,
    'HttpOnly',
    'SameSite=Strict',
    env.COOKIE_SECURE ? 'Secure' : '',
    expiredCookie,
    cookieDomain(),
  ].filter(Boolean);

  const deviceParts = [
    `${env.DEVICE_COOKIE_NAME}=; Path=/`,
    'HttpOnly',
    'SameSite=Lax',
    env.COOKIE_SECURE ? 'Secure' : '',
    expiredCookie,
    cookieDomain(),
  ].filter(Boolean);

  appendCookie(res, accessParts.join('; '));
  appendCookie(res, refreshParts.join('; '));
  appendCookie(res, deviceParts.join('; '));
}
