import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { google } from 'googleapis';
import { db } from '../../config/database.js';
import { users, oauthAccounts, sessions, refreshTokens as refreshTokenTable } from '@sprintio/db';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { hashToken } from '../../utils/token-hash.js';
import { env } from '../../config/env.js';
import { cacheSession } from '../../cache/session-cache.js';
import type { AuthTokens } from '@sprintio/shared';
import { AppError } from '@sprintio/shared';

// ============================================================
// Types
// ============================================================

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  verified_email: boolean;
}

export interface GoogleTokenResult {
  accessToken: string;
  idToken: string | undefined;
  refreshToken: string | undefined;
  expiryDate: number | undefined;
}

export interface GoogleAuthResult {
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

export interface LinkedProvider {
  provider: string;
  providerAccountId: string;
  linkedAt: string;
}

// ============================================================
// Helpers
// ============================================================

function getOAuth2Client() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
    );
  }

  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

/**
 * Creates a session and token pair for a user.
 * Replicates the pattern from auth.service.ts createTokenPair.
 */
async function createTokenPair(
  userId: string,
  email: string,
  deviceId: string,
): Promise<AuthTokens> {
  // Create session
  const now = new Date();
  const sessionExpiresAt = new Date(now.getTime() + env.JWT_REFRESH_EXPIRY_MS);

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      deviceId,
      userAgent: null,
      ipAddress: null,
      expiresAt: sessionExpiresAt,
    })
    .returning({ id: sessions.id });

  const accessToken = await generateAccessToken({ userId, email, role: 'member', deviceId });
  const refreshToken = await generateRefreshToken({ userId, sessionId: session.id, deviceId });

  const tokenExpiresAt = new Date(now.getTime() + env.JWT_REFRESH_EXPIRY_MS);
  const tokenHash = await hashToken(refreshToken);

  await db.insert(refreshTokenTable).values({
    tokenHash,
    sessionId: session.id,
    userId,
    expiresAt: tokenExpiresAt,
  });

  // Cache session in Redis
  await cacheSession(
    session.id,
    userId,
    {
      deviceId,
      userAgent: null,
      ipAddress: null,
      expiresAt: tokenExpiresAt.toISOString(),
      createdAt: now.toISOString(),
    },
    env.JWT_REFRESH_EXPIRY_MS,
  );

  return { accessToken, refreshToken };
}

function formatUserPayload(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean | null;
  role: string | null;
  avatarUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified ?? false,
    role: user.role ?? 'member',
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: user.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// ============================================================
// Core OAuth Functions
// ============================================================

/**
 * Generates the Google OAuth authorization URL.
 * Includes a state parameter for CSRF protection.
 */
export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'consent',
    redirect_uri: env.GOOGLE_REDIRECT_URI,
  });

  // Redirect URI logged at startup via env validation

  return url;
}

/**
 * Exchanges an authorization code for Google tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResult> {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  return {
    accessToken: tokens.access_token ?? '',
    idToken: tokens.id_token ?? undefined,
    refreshToken: tokens.refresh_token ?? undefined,
    expiryDate: tokens.expiry_date ?? undefined,
  };
}

/**
 * Fetches user info from Google using the OAuth2 userinfo endpoint.
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    id: data.id ?? '',
    email: data.email ?? '',
    name: data.name ?? '',
    picture: data.picture ?? null,
    verified_email: data.verified_email ?? false,
  };
}

// ============================================================
// Service Methods
// ============================================================

/**
 * Main Google OAuth callback handler.
 * 1. Exchanges code for tokens
 * 2. Gets user info from Google
 * 3. Creates or links user account
 * 4. Creates session and token pair
 */
export async function handleGoogleCallback(
  code: string,
  options: { deviceId?: string; userAgent?: string; ipAddress?: string },
): Promise<GoogleAuthResult> {
  // 1. Exchange code for tokens
  const googleTokens = await exchangeCodeForTokens(code);

  // 2. Get user info from Google
  const googleUser = await getGoogleUserInfo(googleTokens.accessToken);

  if (!googleUser.email) {
    throw AppError.badRequest('Could not retrieve email from Google account');
  }

  // 3. Check if user exists by googleId
  const deviceId = options.deviceId ?? randomUUID();

  const [existingByGoogleId] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleUser.id))
    .limit(1);

  let user = existingByGoogleId;

  if (!user) {
    // 4. Check if user exists by email (account linking)
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, googleUser.email))
      .limit(1);

    if (existingByEmail) {
      // Link Google account to existing user
      await db
        .update(users)
        .set({
          googleId: googleUser.id,
          avatarUrl: googleUser.picture,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail.id));

      // Create oauth_accounts entry
      await db.insert(oauthAccounts).values({
        userId: existingByEmail.id,
        provider: 'google',
        providerAccountId: googleUser.id,
        accessToken: googleTokens.accessToken,
        refreshToken: googleTokens.refreshToken ?? null,
        expiresAt: googleTokens.expiryDate ? new Date(googleTokens.expiryDate) : null,
        scope: 'openid email profile',
        tokenType: 'Bearer',
      });

      // Fetch the updated user
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, existingByEmail.id))
        .limit(1);

      user = updatedUser;
    } else {
      // 5. Create new user (no password)
      const [newUser] = await db
        .insert(users)
        .values({
          name: googleUser.name,
          email: googleUser.email,
          passwordHash: null,
          googleId: googleUser.id,
          avatarUrl: googleUser.picture,
          emailVerified: googleUser.verified_email,
          emailVerifiedAt: googleUser.verified_email ? new Date() : null,
        })
        .returning();

      // Create oauth_accounts entry
      await db.insert(oauthAccounts).values({
        userId: newUser.id,
        provider: 'google',
        providerAccountId: googleUser.id,
        accessToken: googleTokens.accessToken,
        refreshToken: googleTokens.refreshToken ?? null,
        expiresAt: googleTokens.expiryDate ? new Date(googleTokens.expiryDate) : null,
        scope: 'openid email profile',
        tokenType: 'Bearer',
      });

      user = newUser;
    }
  } else {
    // User found by googleId — update tokens in oauth_accounts
    await db
      .update(oauthAccounts)
      .set({
        accessToken: googleTokens.accessToken,
        refreshToken: googleTokens.refreshToken ?? null,
        expiresAt: googleTokens.expiryDate ? new Date(googleTokens.expiryDate) : null,
        scope: 'openid email profile',
        tokenType: 'Bearer',
      })
      .where(and(eq(oauthAccounts.userId, user.id), eq(oauthAccounts.provider, 'google')));

    // Update avatar if changed
    if (googleUser.picture && user.avatarUrl !== googleUser.picture) {
      await db
        .update(users)
        .set({ avatarUrl: googleUser.picture, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  }

  if (!user) {
    throw AppError.internal('Failed to create or find user');
  }

  // 6. Create session and token pair
  const tokens = await createTokenPair(user.id, user.email, deviceId);

  return {
    user: formatUserPayload(user),
    tokens,
  };
}

/**
 * Link a Google account to an authenticated user.
 * Used when a user connects their Google account from settings.
 */
export async function linkGoogleAccount(userId: string, code: string): Promise<LinkedProvider[]> {
  // Exchange code for tokens
  const googleTokens = await exchangeCodeForTokens(code);

  // Get user info from Google
  const googleUser = await getGoogleUserInfo(googleTokens.accessToken);

  // Check if this Google account is already linked to another user
  const [existingLink] = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(eq(oauthAccounts.provider, 'google'), eq(oauthAccounts.providerAccountId, googleUser.id)),
    )
    .limit(1);

  if (existingLink && existingLink.userId !== userId) {
    throw AppError.conflict('This Google account is already linked to another user');
  }

  // Check if user already has a Google link
  const [existingGoogleLink] = await db
    .select()
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, 'google')))
    .limit(1);

  if (existingGoogleLink) {
    throw AppError.conflict('Google account is already linked');
  }

  // Create oauth_accounts entry
  await db.insert(oauthAccounts).values({
    userId,
    provider: 'google',
    providerAccountId: googleUser.id,
    accessToken: googleTokens.accessToken,
    refreshToken: googleTokens.refreshToken ?? null,
    expiresAt: googleTokens.expiryDate ? new Date(googleTokens.expiryDate) : null,
    scope: 'openid email profile',
    tokenType: 'Bearer',
  });

  // Update user's googleId and avatar
  await db
    .update(users)
    .set({
      googleId: googleUser.id,
      avatarUrl: googleUser.picture,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Return updated list of providers
  return getLinkedProviders(userId);
}

/**
 * Unlink a Google account from an authenticated user.
 * Prevents unlinking if the user would have no login method remaining.
 */
export async function unlinkGoogleAccount(userId: string): Promise<LinkedProvider[]> {
  // Get the user to check their password status
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw AppError.notFound('User');
  }

  // Check if user has other OAuth providers besides Google
  const hasOtherOAuthProviders = await db
    .select()
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId))
    .then((rows) => rows.some((r) => r.provider !== 'google'));

  // Safety check: user must have a password OR another OAuth provider
  if (!user.passwordHash && !hasOtherOAuthProviders) {
    throw AppError.badRequest(
      'Cannot unlink Google account. You must set a password first or link another OAuth provider.',
    );
  }

  // Remove the Google OAuth entry
  await db
    .delete(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, 'google')));

  // Clear user's googleId
  await db.update(users).set({ googleId: null, updatedAt: new Date() }).where(eq(users.id, userId));

  return getLinkedProviders(userId);
}

/**
 * Get a list of linked OAuth providers for a user.
 */
export async function getLinkedProviders(userId: string): Promise<LinkedProvider[]> {
  const providers = await db
    .select({
      provider: oauthAccounts.provider,
      providerAccountId: oauthAccounts.providerAccountId,
      createdAt: oauthAccounts.createdAt,
    })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId));

  return providers.map((p) => ({
    provider: p.provider,
    providerAccountId: p.providerAccountId,
    linkedAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
  }));
}
