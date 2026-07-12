import { useAuth } from './use-auth';
import { toast } from 'sonner';

export function useLogout() {
  const { logout } = useAuth();

  return {
    mutate: async () => {
      try {
        await logout();
        toast.success('Logged out', {
          description: 'You have been signed out.',
        });
      } catch (error) {
        toast.error('Logout failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    isPending: false,
  };
}
