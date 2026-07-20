// ── Token Pairs ──────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

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
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: string;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  tokens: AuthTokens;
}
