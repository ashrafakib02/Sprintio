import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchSessions, revokeSession } from '@/lib/api';
import type { SessionInfo } from '@/lib/api';

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

function DeviceIcon({ deviceType }: { deviceType: SessionInfo['deviceType'] }) {
  if (deviceType === 'mobile') {
    return (
      <svg
        className="h-5 w-5 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 9h6m-3 3v3"
        />
      </svg>
    );
  }

  if (deviceType === 'tablet') {
    return (
      <svg
        className="h-5 w-5 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
    );
  }

  // desktop, bot, unknown — show a monitor
  return (
    <svg
      className="h-5 w-5 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 7.41A2.25 2.25 0 0 1 2.25 5.496V5.25"
      />
    </svg>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="space-y-1">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="h-8 w-16 rounded bg-muted" />
    </div>
  );
}

export function ActiveSessions() {
  const queryClient = useQueryClient();

  const {
    data: sessionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: fetchSessions,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toast.success('Session revoked');
    },
    onError: (err: Error) => {
      toast.error('Failed to revoke session', {
        description: err.message,
      });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const sessions = sessionsData?.data?.sessions ?? [];
      const others = sessions.filter((s) => !s.isCurrent);
      await Promise.all(others.map((s) => revokeSession(s.id)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toast.success('All other sessions revoked');
    },
    onError: (err: Error) => {
      toast.error('Failed to revoke sessions', {
        description: err.message,
      });
    },
  });

  const sessions = sessionsData?.data?.sessions ?? [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  function handleRevoke(sessionId: string) {
    const confirmed = window.confirm('Are you sure you want to revoke this session?');
    if (confirmed) {
      revokeMutation.mutate(sessionId);
    }
  }

  function handleRevokeAll() {
    const confirmed = window.confirm('Are you sure you want to log out all other sessions?');
    if (confirmed) {
      revokeAllMutation.mutate();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Devices where you are currently signed in.</CardDescription>
          </div>
          {otherSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAll}
              disabled={revokeAllMutation.isPending}
            >
              {revokeAllMutation.isPending ? 'Revoking...' : 'Log out all other sessions'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load sessions. Please try again.</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <DeviceIcon deviceType={session.deviceType} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {session.browser} on {session.os}
                      </p>
                      {session.isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.device}
                      {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                      {' · '}
                      Active {timeAgo(session.lastActive)}
                      {' · '}
                      Created {timeAgo(session.createdAt)}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokeMutation.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
