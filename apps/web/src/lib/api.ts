const API_BASE = '/api';

export interface ApiError {
  error: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface RegisterResponse {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  };
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
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

export async function register(data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  };
}

export async function login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Auth session endpoints ───────────────────────────────────

export interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: string;
    avatar: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export async function fetchMe(): Promise<ApiResponse<MeResponse>> {
  return apiRequest<MeResponse>('/auth/me');
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

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export async function resendVerification(
  data: ResendVerificationRequest,
): Promise<ApiResponse<ResendVerificationResponse>> {
  return apiRequest<ResendVerificationResponse>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Password reset endpoints ──────────────────────────────────

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export async function forgotPassword(
  data: ForgotPasswordRequest,
): Promise<ApiResponse<ForgotPasswordResponse>> {
  return apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export async function resetPassword(
  data: ResetPasswordRequest,
): Promise<ApiResponse<ResetPasswordResponse>> {
  return apiRequest<ResetPasswordResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
