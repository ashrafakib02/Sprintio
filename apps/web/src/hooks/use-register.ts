import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { register, type RegisterRequest } from '@/lib/api';

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    onSuccess: (response) => {
      toast.success('Account created!', {
        description: `Welcome, ${response.data.user.name}!`,
      });
      navigate({ to: '/' });
    },
    onError: (error: Error) => {
      toast.error('Registration failed', {
        description: error.message,
      });
    },
  });
}
