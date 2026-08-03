import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { register } from '@/lib/api';
import type { RegisterInput } from '@sprintio/shared';
import { queryKeys } from '@/lib/query-keys';

export function useRegister() {
  const navigate = useNavigate({ from: '/register' });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => register(data),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });

      toast.success('Account created!', {
        description: 'Please check your email to verify your account',
      });
      navigate({
        to: '/verify-email',
        search: { email: response.data.user.email },
      });
    },
    onError: (error: Error) => {
      toast.error('Registration failed', {
        description: error.message,
      });
    },
  });
}
