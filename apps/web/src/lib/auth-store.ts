import type { AuthUser } from '@/types/auth';

/**
 * Lightweight module-level auth state bridge.
 * Used by TanStack Router's beforeLoad (which can't access React hooks/contexts)
 * to check authentication status before the component tree renders.
 *
 * The AuthProvider calls setAuthState() whenever auth state changes.
 */
interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

let currentAuthState: AuthState = {
  user: null,
  isLoading: true,
};

export function getAuthState(): AuthState {
  return currentAuthState;
}

export function setAuthState(state: AuthState): void {
  currentAuthState = state;
}
