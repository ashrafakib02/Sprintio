import { AppError } from './app-error.js';

export class EmailVerificationError extends AppError {
  constructor(message: string, code = 'EMAIL_VERIFICATION_ERROR') {
    super(code, message, 400);
    this.name = 'EmailVerificationError';
  }

  static tokenExpired() {
    return new EmailVerificationError(
      'Verification link has expired',
      'VERIFICATION_TOKEN_EXPIRED',
    );
  }

  static tokenInvalid() {
    return new EmailVerificationError('Invalid verification link', 'VERIFICATION_TOKEN_INVALID');
  }

  static alreadyVerified() {
    return new EmailVerificationError('Email already verified', 'EMAIL_ALREADY_VERIFIED');
  }

  static userNotFound() {
    return new EmailVerificationError('User not found', 'USER_NOT_FOUND');
  }
}
