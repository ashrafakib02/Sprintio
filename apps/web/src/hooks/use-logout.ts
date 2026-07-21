import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { logoutApi } from '@/lib/api';
import { AUTH_QUERY_KEY } from '@/contexts/auth-provider';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      toast.success('Logged out', {
        description: 'You have been signed out.',
      });
      navigate({ to: '/login' });
    },
    onError: (error: Error) => {
      toast.error('Logout failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
