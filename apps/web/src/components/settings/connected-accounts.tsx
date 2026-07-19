import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLinkedProviders, unlinkGoogleAccount } from '@/lib/api';
import { AUTH_QUERY_KEY } from '@/contexts/auth-provider';

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function ConnectedAccounts() {
  const queryClient = useQueryClient();

  const { data: providersData, isLoading } = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: getLinkedProviders,
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkGoogleAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'providers'] });
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      toast.success('Google account disconnected');
    },
    onError: (error: Error) => {
      toast.error('Failed to disconnect', {
        description: error.message,
      });
    },
  });

  const providers = providersData?.data?.providers ?? [];
  const isGoogleLinked = providers.some((p) => p.provider === 'google');
  const googleProvider = providers.find((p) => p.provider === 'google');

  function handleConnect() {
    // Redirect directly to the backend OAuth endpoint.
    // The backend generates a state param, stores it in an HttpOnly cookie,
    // and issues a 302 redirect to Google's consent page.
    window.location.href = '/api/auth/google';
  }

  function handleDisconnect() {
    const confirmed = window.confirm(
      'Are you sure you want to disconnect your Google account? You will no longer be able to sign in with Google.',
    );
    if (confirmed) {
      unlinkMutation.mutate();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>Manage your connected third-party accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              className="h-4 w-4 animate-spin"
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
            Loading...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <GoogleLogo className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Google</p>
                  {isGoogleLinked && googleProvider && (
                    <p className="text-xs text-muted-foreground">
                      Connected on {new Date(googleProvider.linkedAt).toLocaleDateString()}
                    </p>
                  )}
                  {!isGoogleLinked && (
                    <p className="text-xs text-muted-foreground">Not connected</p>
                  )}
                </div>
              </div>
              <div>
                {isGoogleLinked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={unlinkMutation.isPending}
                  >
                    {unlinkMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleConnect}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
