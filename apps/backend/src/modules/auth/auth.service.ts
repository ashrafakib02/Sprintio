import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { sessions } from '../../db/schema/sessions.js';
import { refreshTokens as refreshTokenTable } from '../../db/schema/refresh-tokens.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { hashToken } from '../../utils/token-hash.js';
import { env } from '../../config/env.js';
import type { AuthTokens } from '../../types/auth.js';

// ============================================================
// Types
// ============================================================

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface RegisterResult {
  user: UserPayload;
  tokens: AuthTokens;
}

export interface LoginResult {
  user: UserPayload;
  tokens: AuthTokens;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Creates an access/refresh token pair for a given user session.
 * The refresh token value is hashed before being stored in the database.
 */
async function createTokenPair(
  userId: string,
  email: string,
  sessionId: string,
): Promise<AuthTokens> {
  const accessToken = await generateAccessToken({ userId, email });
  const refreshToken = await generateRefreshToken({ userId, sessionId });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.JWT_REFRESH_EXPIRY_MS);

  // Hash the refresh token before storing
  const tokenHash = await hashToken(refreshToken);

  await db.insert(refreshTokenTable).values({
    tokenHash,
    sessionId,
    userId,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

// ============================================================
// Service Methods
// ============================================================

/**
 * Register a new user with email and password.
 * Creates the user, a session, and a token pair.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResult> {
  // Check if user already exists
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error('A user with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
    });

  // Create session
  const now = new Date();
  const sessionExpiresAt = new Date(now.getTime() + env.JWT_REFRESH_EXPIRY_MS);

  const [session] = await db
    .insert(sessions)
    .values({
      userId: newUser.id,
      expiresAt: sessionExpiresAt,
    })
    .returning({ id: sessions.id });

  // Create token pair
  const tokens = await createTokenPair(newUser.id, newUser.email, session.id);

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      emailVerified: newUser.emailVerified,
    },
    tokens,
  };
}

/**
 * Login an existing user with email and password.
 * Creates a new session and token pair.
 */
export async function loginUser(
  email: string,
  password: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<LoginResult> {
  // Find user by email
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Create session
  const now = new Date();
  const sessionExpiresAt = new Date(now.getTime() + env.JWT_REFRESH_EXPIRY_MS);

  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt: sessionExpiresAt,
    })
    .returning({ id: sessions.id });

  // Create token pair
  const tokens = await createTokenPair(user.id, user.email, session.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    tokens,
  };
}

/**
 * Refresh an existing token pair.
 * Verifies the refresh token, deletes it, and issues a new pair.
 */
export async function refreshTokens(refreshTokenValue: string): Promise<AuthTokens> {
  // Verify the JWT signature and expiry first
  const payload = await verifyRefreshToken(refreshTokenValue);
  if (!payload) {
    throw new Error('Invalid or expired refresh token');
  }

  // Hash the incoming token to look it up
  const tokenHash = await hashToken(refreshTokenValue);

  // Find the stored token
  const [storedToken] = await db
    .select()
    .from(refreshTokenTable)
    .where(
      and(eq(refreshTokenTable.tokenHash, tokenHash), gt(refreshTokenTable.expiresAt, new Date())),
    )
    .limit(1);

  if (!storedToken) {
    throw new Error('Invalid or expired refresh token');
  }

  // Delete the old refresh token (rotation)
  await db.delete(refreshTokenTable).where(eq(refreshTokenTable.id, storedToken.id));

  // Delete the old session as well
  await db.delete(sessions).where(eq(sessions.id, storedToken.sessionId));

  // Create a new session
  const now = new Date();
  const sessionExpiresAt = new Date(now.getTime() + env.JWT_REFRESH_EXPIRY_MS);

  const [newSession] = await db
    .insert(sessions)
    .values({
      userId: storedToken.userId,
      expiresAt: sessionExpiresAt,
    })
    .returning({ id: sessions.id });

  // Fetch user email for token generation
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, storedToken.userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Create new token pair
  return createTokenPair(storedToken.userId, user.email, newSession.id);
}

/**
 * Logout a single session by deleting the refresh token.
 */
export async function logoutUser(refreshTokenValue: string): Promise<void> {
  const tokenHash = await hashToken(refreshTokenValue);

  // Find and delete the refresh token
  const [deletedToken] = await db
    .delete(refreshTokenTable)
    .where(eq(refreshTokenTable.tokenHash, tokenHash))
    .returning({ sessionId: refreshTokenTable.sessionId });

  // Also delete the associated session
  if (deletedToken) {
    await db.delete(sessions).where(eq(sessions.id, deletedToken.sessionId));
  }
}

/**
 * Logout all sessions for a user by deleting all their refresh tokens and sessions.
 */
export async function logoutAllSessions(userId: string): Promise<void> {
  // Delete all refresh tokens for this user
  await db.delete(refreshTokenTable).where(eq(refreshTokenTable.userId, userId));

  // Delete all sessions for this user
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Get the current user's profile.
 */
export async function getCurrentUser(userId: string): Promise<UserPayload | null> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}
