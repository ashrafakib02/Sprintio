import type { ApiResponse, AuthResponse, LoginInput, RegisterInput } from '@sprintio/shared';

const API_BASE = '/api';

export interface ApiError {
  error: string;
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  let body: unknown;

  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    const text = await res.text();
    const err = new Error(text || `Request failed (${res.status})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = res.status;
    throw err;
  }

  if (!res.ok) {
    const error = body as ApiError;
    const err = new Error(error.error || 'Request failed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = res.status;
    throw err;
  }

  return body as ApiResponse<T>;
}

export async function register(data: RegisterInput): Promise<ApiResponse<AuthResponse>> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginInput): Promise<ApiResponse<AuthResponse>> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── OAuth types ────────────────────────────────────────────────

export interface OAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  provider: string;
}

// ── Auth session endpoints ───────────────────────────────────

export async function fetchMe(): Promise<ApiResponse<AuthResponse>> {
  return apiRequest<AuthResponse>('/auth/me');
}

export async function refreshTokens(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Refresh failed');
  }
}

export async function logoutApi(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

// ── Email verification endpoints ─────────────────────────────

export async function resendVerification(data: {
  email: string;
}): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Password reset endpoints ──────────────────────────────────

export async function forgotPassword(data: {
  email: string;
}): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Google OAuth endpoints ────────────────────────────────────

export async function getGoogleAuthUrl(): Promise<ApiResponse<{ url: string }>> {
  return apiRequest<{ url: string }>('/auth/google');
}

export async function handleGoogleCallback(
  code: string,
  state: string,
): Promise<ApiResponse<{ user: OAuthUser }>> {
  return apiRequest<{ user: OAuthUser }>('/auth/google/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
}

export async function linkGoogleAccount(code: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/google/link', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function unlinkGoogleAccount(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/auth/google/unlink', {
    method: 'POST',
  });
}

export async function getLinkedProviders(): Promise<
  ApiResponse<{ providers: Array<{ provider: string; linkedAt: string }> }>
> {
  return apiRequest<{ providers: Array<{ provider: string; linkedAt: string }> }>(
    '/auth/google/providers',
  );
}

// ── Session management endpoints ─────────────────────────────

export interface SessionInfo {
  id: string;
  deviceId: string;
  browser: string;
  os: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  ipAddress: string | null;
  isCurrent: boolean;
  lastActive: string;
  createdAt: string;
}

export async function fetchSessions(): Promise<ApiResponse<{ sessions: SessionInfo[] }>> {
  return apiRequest<{ sessions: SessionInfo[] }>('/auth/sessions');
}

export async function revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}
