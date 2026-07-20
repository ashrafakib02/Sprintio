import type { AuthResponse } from '@sprintio/shared';

// AuthUser is the user shape returned by the auth API
export type AuthUser = AuthResponse['user'] & {
  avatarUrl?: string | null;
  googleId?: string | null;
};

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}
