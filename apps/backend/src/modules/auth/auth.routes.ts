import { Router } from 'express';
import { register, login, refresh, logout, logoutAll, me } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import emailVerificationRoutes from './email-verification.routes.js';
import passwordResetRoutes from './password-reset.routes.js';

const router: ReturnType<typeof Router> = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// Email verification routes (public)
router.use(emailVerificationRoutes);

// Password reset routes (public)
router.use(passwordResetRoutes);

// Protected routes (require valid access token)
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, me);

export default router;
