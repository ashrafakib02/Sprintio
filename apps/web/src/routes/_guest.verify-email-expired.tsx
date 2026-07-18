import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useResendVerification } from '@/hooks/use-resend-verification';

export const Route = createFileRoute('/_guest/verify-email-expired')({
  component: VerifyEmailExpiredPage,
});

function VerifyEmailExpiredPage() {
  const [email, setEmail] = useState('');
  const resendMutation = useResendVerification();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    resendMutation.mutate(
      { email },
      {
        onSuccess: () => {
          // Navigate to verify-email page on success
          window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
        },
      },
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Link expired</CardTitle>
          <CardDescription>This verification link has expired or is invalid</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <svg
                className="h-8 w-8 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              The verification link you clicked has expired or is invalid. Please request a new
              verification email below.
            </p>
          </div>

          {/* Resend Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={resendMutation.isPending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={resendMutation.isPending || !email}>
              {resendMutation.isPending ? (
                <span className="flex items-center gap-2">
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
                  Sending...
                </span>
              ) : (
                'Send verification email'
              )}
            </Button>
          </form>

          {/* Back to login */}
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
