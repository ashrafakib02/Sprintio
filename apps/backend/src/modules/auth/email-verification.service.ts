import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { emailVerificationTokens } from '../../db/schema/email-verification-tokens.js';
import { hashToken } from '../../utils/token-hash.js';
import { env } from '../../config/env.js';
import { sendVerificationEmail } from '../../services/email.js';

// ============================================================
// Types
// ============================================================

export interface VerificationResult {
  success: boolean;
  message: string;
}

// ============================================================
// Service Methods
// ============================================================

/**
 * Generate a verification token for a user.
 * Returns the plain token (to be sent via email) and stores the hash in DB.
 */
export async function generateVerificationToken(userId: string): Promise<string> {
  // Generate a random token
  const token = randomUUID();

  // Hash the token before storing
  const tokenHash = await hashToken(token);

  // Set expiration (24 hours from now)
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRY_MS);

  // Delete any existing unexpired tokens for this user
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));

  // Store the new token
  await db.insert(emailVerificationTokens).values({
    tokenHash,
    userId,
    expiresAt,
  });

  return token;
}

/**
 * Create a verification token and send the verification email.
 */
export async function createAndSendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = await generateVerificationToken(userId);
  await sendVerificationEmail(email, token);
}

/**
 * Verify an email using the token from the verification link.
 */
export async function verifyEmailToken(token: string): Promise<VerificationResult> {
  // Hash the incoming token
  const tokenHash = await hashToken(token);

  // Look up the token
  const [storedToken] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);

  if (!storedToken) {
    return {
      success: false,
      message: 'Invalid or expired verification link',
    };
  }

  // Check if token has expired
  if (storedToken.expiresAt < new Date()) {
    // Delete expired token
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, storedToken.id));

    return {
      success: false,
      message: 'Verification link has expired',
    };
  }

  // Update user's email_verified status
  await db.update(users).set({ emailVerified: true }).where(eq(users.id, storedToken.userId));

  // Delete the verification token (single-use)
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, storedToken.id));

  return {
    success: true,
    message: 'Email verified successfully',
  };
}

/**
 * Resend verification email to a user.
 */
export async function resendVerification(email: string): Promise<VerificationResult> {
  // Find user by email
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    // Don't reveal whether user exists
    return {
      success: true,
      message: 'If an account with that email exists, a verification email has been sent',
    };
  }

  // Check if already verified
  if (user.emailVerified) {
    return {
      success: false,
      message: 'Email already verified',
    };
  }

  // Generate new token and send email
  await createAndSendVerificationEmail(user.id, user.email);

  return {
    success: true,
    message: 'Verification email sent',
  };
}
