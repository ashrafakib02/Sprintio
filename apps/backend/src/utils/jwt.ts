import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from 'jose';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayloadJwt {
  userId: string;
  sessionId: string;
}

function getAccessSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

function getRefreshSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_REFRESH_SECRET);
}

export async function generateAccessToken(
  payload: AccessTokenPayload
): Promise<string> {
  const secret = getAccessSecret();
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRY)
    .sign(secret);
}

export async function generateRefreshToken(
  payload: RefreshTokenPayloadJwt
): Promise<string> {
  const secret = getRefreshSecret();
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRY)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const secret = getAccessSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayloadJwt | null> {
  try {
    const secret = getRefreshSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
    });

    return {
      userId: payload.userId as string,
      sessionId: payload.sessionId as string,
    };
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return decodeJwt(token);
  } catch {
    return null;
  }
}
