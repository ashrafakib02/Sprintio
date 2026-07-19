export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  avatar: string | null;
  avatarUrl?: string | null;
  googleId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}
