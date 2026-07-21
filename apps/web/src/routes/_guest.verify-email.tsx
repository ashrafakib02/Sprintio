import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useResendVerification } from '@/hooks/use-resend-verification';
import { Spinner } from '@/components/ui/spinner';

export const Route = createFileRoute('/_guest/verify-email')({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || '',
  }),
});

function VerifyEmailPage() {
  const { email: initialEmail } = Route.useSearch();
  const [email, setEmail] = useState(initialEmail);
  const resendMutation = useResendVerification();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    resendMutation.mutate({ email });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
          <CardDescription>We've sent a verification link to your email address</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mail Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              We sent a verification link to{' '}
              {initialEmail && <span className="font-medium text-foreground">{initialEmail}</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              Click the link in the email to verify your account. The link will expire in 24 hours.
            </p>
          </div>

          {/* Resend Form */}
          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Didn't receive the email?
            </p>
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
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={resendMutation.isPending || !email}
              >
                {resendMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Sending...
                  </span>
                ) : (
                  'Resend verification email'
                )}
              </Button>
            </form>
          </div>

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
