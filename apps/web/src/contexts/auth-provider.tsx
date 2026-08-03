import { createContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { fetchMe, refreshTokens, logoutApi } from '@/lib/api';
import type { AuthContextValue } from '@/types/auth';
import { setAuthState } from '@/lib/auth-store';
import { clearStoredOrganizationId } from '@/lib/organization-storage';
import { clearStoredWorkspaceId } from '@/lib/workspace-storage';
import { queryKeys } from '@/lib/query-keys';

export const AuthContext = createContext<AuthContextValue | null>(null);

/** @deprecated Use `queryKeys.auth.me` instead */
export const AUTH_QUERY_KEY = queryKeys.auth.me;

interface AuthProviderProps {
  children: React.ReactNode;
}

const GUEST_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/reset-password-success',
  '/verify-email',
  '/verify-email-expired',
  '/verified',
  '/auth/callback',
];

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: '/' });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Use a ref for pathname to avoid recreating handleAuthError on navigation
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Track if a refresh is already in progress to prevent double-fires
  const refreshingRef = useRef(false);

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: (failureCount, error: Error & { status?: number }) => {
      // Don't retry 401s or network errors (backend unreachable) — resolve quickly
      if (error?.status === 401 || !error?.status) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Handle 401: attempt refresh then retry
  const handleAuthError = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      await refreshTokens();
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    } catch {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      // Synchronously clear module-level auth store so route guards
      // immediately reject authenticated-route access.
      setAuthState({ user: null, isLoading: false });
      // Don't redirect to login if already on a guest route
      const currentPath = pathnameRef.current;
      if (!GUEST_ROUTES.some((route) => currentPath.startsWith(route))) {
        navigate({ to: '/login' });
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [queryClient, navigate]);

  useEffect(() => {
    if (error) {
      handleAuthError();
    }
  }, [error, handleAuthError]);

  const user = userData?.data?.user ?? null;
  const isAuthenticated = !isLoading && !!user;

  // Bridge auth state to module-level store for route guards (beforeLoad)
  useEffect(() => {
    setAuthState({ user, isLoading });
  }, [user, isLoading]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      // Synchronously clear module-level auth store so route guards
      // immediately reject authenticated-route access.
      setAuthState({ user: null, isLoading: false });
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      clearStoredOrganizationId();
      clearStoredWorkspaceId();
      navigate({ to: '/login' });
    }
  }, [queryClient, navigate]);

  const refetchUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
  }, [queryClient]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      logout,
      refetchUser,
    }),
    [user, isLoading, isAuthenticated, logout, refetchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
