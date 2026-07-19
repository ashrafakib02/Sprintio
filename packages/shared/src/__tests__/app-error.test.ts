import { describe, it, expect } from 'vitest';
import { AppError } from '../errors/app-error.js';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with code, message, and status code', () => {
      const error = new AppError('TEST_ERROR', 'Something failed', 418);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Something failed');
      expect(error.statusCode).toBe(418);
      expect(error.name).toBe('AppError');
    });

    it('should default statusCode to 500', () => {
      const error = new AppError('GENERIC', 'Error');
      expect(error.statusCode).toBe(500);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = new AppError('VALIDATION', 'Bad input', 422, details);
      expect(error.details).toEqual(details);
    });

    it('should be an instance of Error', () => {
      const error = new AppError('TEST', 'msg');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('static factories', () => {
    it('notFound should create 404 error', () => {
      const error = AppError.notFound('User');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });

    it('badRequest should create 400 error', () => {
      const error = AppError.badRequest('Missing field');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Missing field');
      expect(error.statusCode).toBe(400);
    });

    it('unauthorized should default message to "Authentication required"', () => {
      const error = AppError.unauthorized();
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
    });

    it('unauthorized should accept custom message', () => {
      const error = AppError.unauthorized('Token expired');
      expect(error.message).toBe('Token expired');
    });

    it('forbidden should default message to "Insufficient permissions"', () => {
      const error = AppError.forbidden();
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });

    it('forbidden should accept custom message', () => {
      const error = AppError.forbidden('Admin only');
      expect(error.message).toBe('Admin only');
    });

    it('conflict should create 409 error', () => {
      const error = AppError.conflict('Email taken');
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Email taken');
      expect(error.statusCode).toBe(409);
    });

    it('validation should create 422 error with details', () => {
      const details = { email: 'required' };
      const error = AppError.validation(details);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual(details);
    });

    it('internal should default message to "Internal server error"', () => {
      const error = AppError.internal();
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    it('internal should accept custom message', () => {
      const error = AppError.internal('DB connection failed');
      expect(error.message).toBe('DB connection failed');
    });
  });
});
