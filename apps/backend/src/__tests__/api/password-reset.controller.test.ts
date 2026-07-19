import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../modules/auth/password-reset.service.js', () => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('../../modules/auth/password-reset.validation.js', () => ({
  forgotPasswordSchema: {
    safeParse: vi.fn(),
  },
  resetPasswordSchema: {
    safeParse: vi.fn(),
  },
}));

import * as controller from '../../modules/auth/password-reset.controller.js';
import * as service from '../../modules/auth/password-reset.service.js';
import { forgotPasswordSchema, resetPasswordSchema } from '../../modules/auth/password-reset.validation.js';
import { createMockReq, createMockRes } from '../helpers.js';

describe('password-reset.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('should return success message', async () => {
      const req = createMockReq({ body: { email: 'test@test.com' } });
      const res = createMockRes();

      vi.mocked(forgotPasswordSchema.safeParse).mockReturnValue({
        success: true,
        data: { email: 'test@test.com' },
      } as never);

      vi.mocked(service.forgotPassword).mockResolvedValue({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });

      await controller.forgotPassword(req, res as never);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.message).toContain('password reset link has been sent');
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({ body: { email: 'not-an-email' } });
      const res = createMockRes();

      vi.mocked(forgotPasswordSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Invalid email address' }] },
      } as never);

      await controller.forgotPassword(req, res as never);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 when service throws', async () => {
      const req = createMockReq({ body: { email: 'test@test.com' } });
      const res = createMockRes();

      vi.mocked(forgotPasswordSchema.safeParse).mockReturnValue({
        success: true,
        data: { email: 'test@test.com' },
      } as never);

      vi.mocked(service.forgotPassword).mockRejectedValue(new Error('DB error'));

      await controller.forgotPassword(req, res as never);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('resetPassword', () => {
    it('should return success on valid token', async () => {
      const req = createMockReq({
        body: { token: 'valid-token', password: 'NewPass1!', confirmPassword: 'NewPass1!' },
      });
      const res = createMockRes();

      vi.mocked(resetPasswordSchema.safeParse).mockReturnValue({
        success: true,
        data: { token: 'valid-token', password: 'NewPass1!', confirmPassword: 'NewPass1!' },
      } as never);

      vi.mocked(service.resetPassword).mockResolvedValue({
        success: true,
        message: 'Password reset successful',
      });

      await controller.resetPassword(req, res as never);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.message).toBe('Password reset successful');
    });

    it('should return 400 when reset fails (invalid token)', async () => {
      const req = createMockReq({
        body: { token: 'invalid-token', password: 'NewPass1!', confirmPassword: 'NewPass1!' },
      });
      const res = createMockRes();

      vi.mocked(resetPasswordSchema.safeParse).mockReturnValue({
        success: true,
        data: { token: 'invalid-token', password: 'NewPass1!', confirmPassword: 'NewPass1!' },
      } as never);

      vi.mocked(service.resetPassword).mockResolvedValue({
        success: false,
        message: 'Invalid or expired reset link',
      });

      await controller.resetPassword(req, res as never);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      vi.mocked(resetPasswordSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Reset token is required' }] },
      } as never);

      await controller.resetPassword(req, res as never);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 when service throws', async () => {
      const req = createMockReq({
        body: { token: 'token', password: 'NewPass1!', confirmPassword: 'NewPass1!' },
      });
      const res = createMockRes();

      vi.mocked(resetPasswordSchema.safeParse).mockReturnValue({
        success: true,
        data: { token: 'token', password: 'NewPass1!', confirmPassword: 'NewPass1!' },
      } as never);

      vi.mocked(service.resetPassword).mockRejectedValue(new Error('Unexpected'));

      await controller.resetPassword(req, res as never);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
