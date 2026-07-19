import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Express Mock Helpers ───────────────────────────────────────

export interface MockResponse extends Response {
  _status: number;
  _data: unknown;
  _headers: Record<string, string | string[] | undefined>;
}

export function createMockReq(overrides?: Partial<Record<string, unknown>>): Request {
  return {
    headers: {},
    cookies: {},
    body: {},
    query: {},
    params: {},
    socket: { remoteAddress: '127.0.0.1' },
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

export function createMockRes(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _data: null as unknown,
    _headers: {} as Record<string, string | string[] | undefined>,
    status: vi.fn().mockReturnThis() as unknown as Response['status'],
    json: vi.fn().mockReturnThis() as unknown as Response['json'],
    redirect: vi.fn().mockReturnThis() as unknown as Response['redirect'],
    getHeader: vi.fn().mockReturnValue(undefined),
    setHeader: vi.fn().mockReturnThis(),
    // Satisfy other Response properties we don't use
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    end: vi.fn(),
    header: vi.fn().mockReturnThis(),
    locals: {},
    sendFile: vi.fn(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    download: vi.fn(),
    format: vi.fn().mockReturnThis(),
    links: vi.fn().mockReturnThis(),
    location: vi.fn().mockReturnThis(),
    render: vi.fn(),
    vary: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    get: vi.fn(),
    range: vi.fn(),
    accepts: vi.fn(),
    acceptsCharsets: vi.fn(),
    acceptsEncodings: vi.fn(),
    acceptsLanguages: vi.fn(),
    is: vi.fn(),
    contentType: vi.fn().mockReturnThis(),
    attachment: vi.fn().mockReturnThis(),
  } as unknown as MockResponse;

  // Make status/json chainable and capture values
  (res.status as ReturnType<typeof vi.fn>).mockImplementation((code: number) => {
    res._status = code;
    return res as unknown as Response;
  });
  (res.json as ReturnType<typeof vi.fn>).mockImplementation((data: unknown) => {
    res._data = data;
    return res as unknown as Response;
  });

  return res;
}

export function createMockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}
