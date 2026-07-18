import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { passwordResetTokens } from '../../db/schema/password-reset-tokens.js';
import { hashToken } from '../../utils/token-hash.js';
import { hashPassword } from '../../utils/password.js';
import { env } from '../../config/env.js';
import { sendPasswordResetEmail } from '../../services/email.js';
import { revokeAllUserTokens } from '../../cache/token-blacklist.js';
import { invalidateAllUserSessions } from '../../cache/session-cache.js';

// ============================================================
// Types
// ============================================================

export interface ResetResult {
  success: boolean;
  message: string;
}

// ============================================================
// Service Methods
// ============================================================

/**
 * Generate a password reset token for a user.
 * Stores the hash in DB and sends the reset email.
 */
export async function generatePasswordResetToken(userId: string, email: string): Promise<void> {
  const token = randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRY_MS);

  // Delete existing reset tokens for this user
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

  // Insert new token
  await db.insert(passwordResetTokens).values({
    tokenHash,
    userId,
    expiresAt,
  });

  // Send email
  await sendPasswordResetEmail(email, token);
}

/**
 * Forgot password — send reset email.
 * Always returns the same message regardless of whether user exists.
 */
export async function forgotPassword(email: string): Promise<ResetResult> {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always return same message regardless of whether user exists
  if (!user) {
    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    };
  }

  await generatePasswordResetToken(user.id, user.email);
  return {
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent',
  };
}

/**
 * Reset password — validate token and update password.
 * Revokes all sessions and tokens for the user after reset.
 */
export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const tokenHash = await hashToken(token);

  // Find the stored token
  const [storedToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!storedToken) {
    return { success: false, message: 'Invalid or expired reset link' };
  }

  // Check expiry
  if (storedToken.expiresAt < new Date()) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, storedToken.id));
    return { success: false, message: 'Reset link has expired' };
  }

  // Hash new password and update
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, storedToken.userId));

  // Delete the reset token (single-use)
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, storedToken.id));

  // SECURITY: Revoke ALL sessions and tokens for this user
  await revokeAllUserTokens(storedToken.userId);
  await invalidateAllUserSessions(storedToken.userId);

  // Delete all refresh tokens and sessions from DB
  const { refreshTokens } = await import('../../db/schema/refresh-tokens.js');
  const { sessions } = await import('../../db/schema/sessions.js');
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, storedToken.userId));
  await db.delete(sessions).where(eq(sessions.userId, storedToken.userId));

  return { success: true, message: 'Password reset successful' };
}
