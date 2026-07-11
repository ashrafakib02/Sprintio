export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
  tokens: AuthTokens;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtAccessTokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface JwtRefreshTokenPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}
