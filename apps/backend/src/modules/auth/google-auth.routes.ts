import { Router } from 'express';
import {
  googleLogin,
  googleCallback,
  googleLink,
  googleUnlink,
  googleProviders,
} from './google-auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router: ReturnType<typeof Router> = Router();

// Public routes
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// Protected routes (require valid access token)
router.post('/google/link', authenticate, googleLink);
router.post('/google/unlink', authenticate, googleUnlink);
router.get('/google/providers', authenticate, googleProviders);

export default router;
