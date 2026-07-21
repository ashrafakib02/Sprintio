import type { User } from './user.js';

// ── Token Pair ───────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** @deprecated Use TokenPair instead */
export type AuthTokens = TokenPair;

// ── Minimal Payloads (used by service layer) ─────────────────

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  jti: string;
  deviceId: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  jti: string;
  deviceId: string;
}

// ── Full JWT Payloads (decoded from tokens) ──────────────────

export interface AccessTokenFullPayload {
  userId: string;
  email: string;
  role: string;
  jti: string;
  deviceId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenFullPayload {
  userId: string;
  sessionId: string;
  jti: string;
  deviceId: string;
  iat: number;
  exp: number;
}

// ── Auth Response ────────────────────────────────────────────

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}
