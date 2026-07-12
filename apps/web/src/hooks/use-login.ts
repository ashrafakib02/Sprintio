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
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

      toast.success('Welcome back!', {
        description: `Logged in as ${response.data.user.name}`,
      });
      navigate({ to: '/dashboard' });
    },
    onError: (error: Error) => {
      toast.error('Login failed', {
        description: error.message,
      });
    },
  });
}
