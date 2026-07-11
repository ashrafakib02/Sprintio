import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { login, type LoginRequest } from '@/lib/api';

export function useLogin() {
  const navigate = useNavigate({ from: '/login' });

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (response) => {
      toast.success('Welcome back!', {
        description: `Logged in as ${response.data.user.name}`,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: '/' as any });
    },
    onError: (error: Error) => {
      toast.error('Login failed', {
        description: error.message,
      });
    },
  });
}
