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
    ...options,
  });

  const body = await res.json();

  if (!res.ok) {
    const error = body as ApiError;
    throw new Error(error.error || 'Request failed');
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
