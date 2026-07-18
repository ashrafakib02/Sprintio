import { Router } from 'express';
import { forgotPassword, resetPassword } from './password-reset.controller.js';

const router: ReturnType<typeof Router> = Router();

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
