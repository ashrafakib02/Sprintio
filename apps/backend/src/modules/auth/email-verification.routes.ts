import { Router } from 'express';
import { verifyEmail, resendVerification } from './email-verification.controller.js';

const router: ReturnType<typeof Router> = Router();

// Public routes
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

export default router;
