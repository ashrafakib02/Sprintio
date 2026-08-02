import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  listSessions,
  revokeSessionById,
} from './auth.controller.js';
import { verifyEmail, resendVerification } from './email-verification.controller.js';
import { forgotPassword, resetPassword } from './password-reset.controller.js';
import {
  googleLogin,
  googleCallback,
  googleLink,
  googleUnlink,
  googleProviders,
} from './google-auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

// ── Rate limiters ────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many verification requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

const googleCallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=rate_limit_exceeded`,
    );
  },
});

// ── Router ───────────────────────────────────────────────────
const router: ReturnType<typeof Router> = Router();

// Public auth routes (rate limited)
router.post('/register', authLimiter as unknown as express.RequestHandler, register);
router.post('/login', authLimiter as unknown as express.RequestHandler, login);
router.post('/refresh', authLimiter as unknown as express.RequestHandler, refresh);

// Email verification routes
router.get('/verify-email/:token', verifyEmail);
router.post(
  '/resend-verification',
  resendVerificationLimiter as unknown as express.RequestHandler,
  resendVerification,
);

// Password reset routes
router.post(
  '/forgot-password',
  forgotPasswordLimiter as unknown as express.RequestHandler,
  forgotPassword,
);
router.post(
  '/reset-password',
  resetPasswordLimiter as unknown as express.RequestHandler,
  resetPassword,
);

// Google OAuth routes
router.get('/google', googleLogin);
router.get(
  '/google/callback',
  googleCallbackLimiter as unknown as express.RequestHandler,
  googleCallback,
);

// Protected routes (require valid access token)
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, me);

// Google OAuth management (protected)
router.post('/google/link', authenticate, googleLink);
router.post('/google/unlink', authenticate, googleUnlink);
router.get('/google/providers', authenticate, googleProviders);

// Session management routes
router.get('/sessions', authenticate, listSessions);
router.delete('/sessions/:sessionId', authenticate, revokeSessionById);

export default router;
