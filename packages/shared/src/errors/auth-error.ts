import { AppError } from './app-error.js';

export class AuthError extends AppError {
  constructor(message: string, code = 'AUTH_ERROR') {
    super(code, message, 401);
    this.name = 'AuthError';
  }

  static invalidCredentials() {
    return new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  static tokenExpired() {
    return new AuthError('Token has expired', 'TOKEN_EXPIRED');
  }

  static invalidToken() {
    return new AuthError('Invalid token', 'INVALID_TOKEN');
  }

  static mfaRequired() {
    return new AuthError('Multi-factor authentication required', 'MFA_REQUIRED');
  }

  static emailNotVerified() {
    return new AuthError('Email not verified', 'EMAIL_NOT_VERIFIED');
  }

  static verificationTokenExpired() {
    return new AuthError('Verification token has expired', 'TOKEN_EXPIRED');
  }
}
