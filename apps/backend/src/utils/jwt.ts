import {
  SignJWT,
  jwtVerify,
  decodeJwt,
  importPKCS8,
  importSPKI,
  type JWTPayload,
  type KeyLike,
} from 'jose';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'ES256';

// ── Cached keys (loaded once per process) ─────────────────────

let _accessPrivateKey: KeyLike | null = null;
let _accessPublicKey: KeyLike | null = null;
let _refreshPrivateKey: KeyLike | null = null;
let _refreshPublicKey: KeyLike | null = null;

async function loadKey(
  base64Pem: string,
  type: 'private' | 'public',
  _purpose: 'access' | 'refresh',
): Promise<KeyLike> {
  const pem = Buffer.from(base64Pem, 'base64').toString('utf-8');
  if (type === 'private') {
    return importPKCS8(pem, ALGORITHM);
  }
  return importSPKI(pem, ALGORITHM);
}

async function getAccessPrivateKey(): Promise<KeyLike> {
  if (!_accessPrivateKey) {
    _accessPrivateKey = await loadKey(env.JWT_ACCESS_PRIVATE_KEY, 'private', 'access');
  }
  return _accessPrivateKey;
}

async function getAccessPublicKey(): Promise<KeyLike> {
  if (!_accessPublicKey) {
    _accessPublicKey = await loadKey(env.JWT_ACCESS_PUBLIC_KEY, 'public', 'access');
  }
  return _accessPublicKey;
}

async function getRefreshPrivateKey(): Promise<KeyLike> {
  if (!_refreshPrivateKey) {
    _refreshPrivateKey = await loadKey(env.JWT_REFRESH_PRIVATE_KEY, 'private', 'refresh');
  }
  return _refreshPrivateKey;
}

async function getRefreshPublicKey(): Promise<KeyLike> {
  if (!_refreshPublicKey) {
    _refreshPublicKey = await loadKey(env.JWT_REFRESH_PUBLIC_KEY, 'public', 'refresh');
  }
  return _refreshPublicKey;
}

// ── Payload Types ────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  email: string;
  jti: string;
  deviceId: string;
  iat?: number;
}

export interface RefreshTokenPayloadJwt {
  userId: string;
  sessionId: string;
  jti: string;
  deviceId: string;
}

// ── Token Generation ─────────────────────────────────────────

export async function generateAccessToken(
  payload: Omit<AccessTokenPayload, 'jti'> & { jti?: string },
): Promise<string> {
  const privateKey = await getAccessPrivateKey();
  const jti = payload.jti ?? randomUUID();

  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    jti,
    deviceId: payload.deviceId,
  } as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRY)
    .sign(privateKey);
}

export async function generateRefreshToken(
  payload: Omit<RefreshTokenPayloadJwt, 'jti'> & { jti?: string },
): Promise<string> {
  const privateKey = await getRefreshPrivateKey();
  const jti = payload.jti ?? randomUUID();

  return new SignJWT({
    userId: payload.userId,
    sessionId: payload.sessionId,
    jti,
    deviceId: payload.deviceId,
  } as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRY)
    .sign(privateKey);
}

// ── Token Verification ───────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const publicKey = await getAccessPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: [ALGORITHM],
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      jti: payload.jti as string,
      deviceId: payload.deviceId as string,
      iat: payload.iat as number | undefined,
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayloadJwt | null> {
  try {
    const publicKey = await getRefreshPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: [ALGORITHM],
    });

    return {
      userId: payload.userId as string,
      sessionId: payload.sessionId as string,
      jti: payload.jti as string,
      deviceId: payload.deviceId as string,
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
