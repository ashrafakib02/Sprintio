import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { AUTH_QUERY_KEY } from '@/contexts/auth-provider';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
  validateSearch: (search: Record<string, unknown>) => ({
    success: (search.success as string) || undefined,
    error: (search.error as string) || undefined,
    linked: (search.linked as string) || undefined,
  }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error, linked } = Route.useSearch();

  useEffect(() => {
    if (error) {
      toast.error('Authentication failed', {
        description: decodeURIComponent(error),
      });
      navigate({ to: '/login' });
      return;
    }

    if (success || linked) {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY }).then(() => {
        if (linked) {
          navigate({ to: '/settings' });
        } else {
          toast.success('Welcome!', {
            description: 'You have been signed in successfully.',
          });
          navigate({ to: '/dashboard' });
        }
      });
      return;
    }

    // Neither success nor error — invalid callback
    toast.error('Invalid callback', {
      description: 'No authentication result was received. Please try again.',
    });
    navigate({ to: '/login' });
  }, [success, error, linked, navigate, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <svg
          className="h-5 w-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Completing sign-in...</span>
      </div>
    </div>
  );
}
