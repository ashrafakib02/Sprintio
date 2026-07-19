import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError } from '@sprintio/shared';
import { errorHandler } from '../../../middleware/error-handler.js';
import { createMockReq, createMockRes, createMockNext } from '../../helpers.js';

describe('errorHandler middleware', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should map AppError to its status code and JSON body', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    const error = new AppError('NOT_FOUND', 'User not found', 404);
    errorHandler(error, req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'User not found',
      code: 'NOT_FOUND',
    });
  });

  it('should include details when AppError has them', () => {
    const res = createMockRes();
    const next = createMockNext();

    const error = AppError.validation({ field: 'email', reason: 'invalid' });
    errorHandler(error, createMockReq(), res as never, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual({ field: 'email', reason: 'invalid' });
  });

  it('should map unknown errors to 500', () => {
    const res = createMockRes();
    const next = createMockNext();

    const error = new Error('Something went wrong');
    errorHandler(error, createMockReq(), res as never, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  it('should log unknown errors to console', () => {
    const res = createMockRes();
    const next = createMockNext();

    const error = new Error('Unexpected');
    errorHandler(error, createMockReq(), res as never, next);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled error:', error);
  });

  it('should handle AppError.notFound factory', () => {
    const res = createMockRes();
    const next = createMockNext();

    const error = AppError.notFound('Workspace');
    errorHandler(error, createMockReq(), res as never, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      error: 'Workspace not found',
      code: 'NOT_FOUND',
    });
  });

  it('should handle AppError.unauthorized factory', () => {
    const res = createMockRes();
    const next = createMockNext();

    const error = AppError.unauthorized();
    errorHandler(error, createMockReq(), res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
  });

  it('should handle AppError.forbidden factory', () => {
    const res = createMockRes();
    const next = createMockNext();

    const error = AppError.forbidden();
    errorHandler(error, createMockReq(), res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].code).toBe('FORBIDDEN');
  });

  it('should handle AppError.conflict factory', () => {
    const res = createMockRes();
    const next = createMockNext();

    const error = AppError.conflict('Email already exists');
    errorHandler(error, createMockReq(), res as never, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      error: 'Email already exists',
      code: 'CONFLICT',
    });
  });

  it('should handle AppError.internal factory', () => {
    const res = createMockRes();
    const next = createMockNext();

    const error = AppError.internal();
    errorHandler(error, createMockReq(), res as never, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].code).toBe('INTERNAL_ERROR');
  });
});
