import { Router } from 'express';
import { register, login, refresh, logout, logoutAll, me } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// Protected routes (require valid access token)
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, me);

export default router;
