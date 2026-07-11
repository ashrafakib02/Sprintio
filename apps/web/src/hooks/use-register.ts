import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { register, type RegisterRequest } from '@/lib/api';

export function useRegister() {
  const navigate = useNavigate({ from: '/register' });

  return useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    onSuccess: (response) => {
      toast.success('Account created!', {
        description: `Welcome, ${response.data.user.name}!`,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: '/' as any });
    },
    onError: (error: Error) => {
      toast.error('Registration failed', {
        description: error.message,
      });
    },
  });
}
