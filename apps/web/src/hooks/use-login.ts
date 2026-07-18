import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { login, type LoginRequest } from '@/lib/api';
import { AUTH_QUERY_KEY } from '@/contexts/auth-provider';

export function useLogin() {
  const navigate = useNavigate({ from: '/login' });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: async (response) => {
      // Manually set user data to clear any stale 401 error before navigating.
      // This prevents the AuthProvider useEffect from re-firing with the old error.
      queryClient.setQueryData(AUTH_QUERY_KEY, { data: { user: response.data.user } });
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

      toast.success('Welcome back!', {
        description: `Logged in as ${response.data.user.name}`,
      });
      navigate({ to: '/dashboard' });
    },
    onError: (error: Error, variables) => {
      if (error.message === 'Please verify your email before signing in') {
        toast.error('Email not verified', {
          description: 'Please check your inbox and verify your email address.',
        });
        navigate({ to: '/verify-email', search: { email: variables.email } });
        return;
      }
      toast.error('Login failed', {
        description: error.message,
      });
    },
  });
}
