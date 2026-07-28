import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useForgotPassword } from '@/hooks/use-forgot-password';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/spinner';
import { ForgotPasswordSchema } from '@sprintio/shared/schemas';

export const Route = createFileRoute('/_guest/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { mutate, isPending, submittedEmail, reset } = useForgotPassword();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = ForgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutate({ email });
  }

  // ── Success state ──────────────────────────────────────────────

  if (submittedEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center">
              {/* Success icon badge */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>

              <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
                Check your email
              </h1>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                We've sent a password reset link to{' '}
                <span className="font-medium text-foreground">{submittedEmail}</span>. Please check
                your inbox and follow the instructions.
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                Didn't receive the email? Check your spam folder or try again below.
              </p>

              <div className="mt-6 w-full space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => reset()}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Resend email
                </Button>

                <Link to="/login" className="block w-full">
                  <Button variant="ghost" className="w-full text-muted-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center">
            {/* Lock icon badge */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
              Forgot your password?
            </h1>
            <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
              No worries. Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({});
                }}
                disabled={isPending}
                aria-invalid={!!errors.email}
                className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Sending reset link...
                </span>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
