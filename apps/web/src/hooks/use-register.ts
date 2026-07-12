import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { register, type RegisterRequest } from '@/lib/api';
import { AUTH_QUERY_KEY } from '@/contexts/auth-provider';

export function useRegister() {
  const navigate = useNavigate({ from: '/register' });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

      toast.success('Account created!', {
        description: `Welcome, ${response.data.user.name}!`,
      });
      navigate({ to: '/dashboard' });
    },
    onError: (error: Error) => {
      toast.error('Registration failed', {
        description: error.message,
      });
    },
  });
}
