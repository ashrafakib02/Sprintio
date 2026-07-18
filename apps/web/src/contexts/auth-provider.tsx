import { createContext, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { fetchMe, refreshTokens, logoutApi } from '@/lib/api';
import type { AuthContextValue } from '@/types/auth';

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

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
];

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: '/' });
  const routerState = useRouterState();

  // Use a ref for pathname to avoid recreating handleAuthError on navigation
  const pathnameRef = useRef(routerState.location.pathname);
  pathnameRef.current = routerState.location.pathname;

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
      if (error?.status === 401) return false;
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

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      navigate({ to: '/login' });
    }
  }, [queryClient, navigate]);

  const refetchUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
  }, [queryClient]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    logout,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
