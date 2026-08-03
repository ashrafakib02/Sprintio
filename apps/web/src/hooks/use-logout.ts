import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { logoutApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { setAuthState } from '@/lib/auth-store';
import { clearStoredOrganizationId } from '@/lib/organization-storage';
import { clearStoredWorkspaceId } from '@/lib/workspace-storage';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: async () => {
      // Cancel any in-flight queries to prevent a race where a refetch
      // re-populates the auth cache before the browser processes Set-Cookie.
      await queryClient.cancelQueries();

      // Synchronously clear module-level auth store so route guards
      // (beforeLoad) immediately reject authenticated-route access.
      setAuthState({ user: null, isLoading: false });
      queryClient.setQueryData(queryKeys.auth.me, null);

      // Remove all cached queries instead of clearing (which triggers refetches).
      queryClient.removeQueries();

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
