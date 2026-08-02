import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { logoutApi } from '@/lib/api';
import { AUTH_QUERY_KEY } from '@/contexts/auth-provider';
import { setAuthState } from '@/lib/auth-store';
import { clearStoredOrganizationId } from '@/lib/organization-storage';
import { clearStoredWorkspaceId } from '@/lib/workspace-storage';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // Synchronously clear module-level auth store so route guards
      // (beforeLoad) immediately reject authenticated-route access.
      setAuthState({ user: null, isLoading: false });
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      clearStoredOrganizationId();
      clearStoredWorkspaceId();
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
