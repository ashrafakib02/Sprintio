import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Shield, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useResetPassword } from '@/hooks/use-reset-password';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/spinner';
import {
  getPasswordStrength,
  PASSWORD_RULES,
  PasswordRule,
} from '@/components/auth/password-strength';

export const Route = createFileRoute('/_guest/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
});

// ── Page Component ────────────────────────────────────────────

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const resetMutation = useResetPassword();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = getPasswordStrength(form.password);
  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;
  const allRulesMet = PASSWORD_RULES.every((rule) => rule.test(form.password));
  const isSubmitting = resetMutation.isPending;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!token) {
      newErrors.token = 'Invalid reset link';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (form.password.length > 128) {
      newErrors.password = 'Password must be at most 128 characters';
    } else if (!allRulesMet) {
      newErrors.password = 'Password does not meet all requirements';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    resetMutation.mutate({
      token,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  // ── Invalid token state ──────────────────────────────────────

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center">
              {/* Warning icon badge */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <svg
                  className="h-7 w-7 text-amber-600 dark:text-amber-400"
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

              <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
                Invalid reset link
              </h1>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                This password reset link is invalid, expired, or missing a token. Please request a
                new one.
              </p>

              <div className="mt-6 w-full space-y-3">
                <Link to="/forgot-password" className="block w-full">
                  <Button className="w-full">Request a new reset link</Button>
                </Link>

                <Link to="/login" className="block w-full">
                  <Button variant="ghost" className="w-full text-muted-foreground">
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
            {/* Shield icon badge */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
              Reset your password
            </h1>
            <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
              Enter your new password below. Make sure it's strong and secure.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  className={cn(
                    'pr-10',
                    errors.password && 'border-destructive focus-visible:ring-destructive',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}

              {/* Password strength + validation rules */}
              {form.password.length > 0 && (
                <div className="space-y-2">
                  {/* Strength bar */}
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-all duration-300',
                            i <= strength.segments ? strength.color : 'bg-muted',
                          )}
                        />
                      ))}
                    </div>
                    <p
                      className={cn(
                        'text-xs font-medium',
                        strength.score <= 2
                          ? 'text-red-500'
                          : strength.score <= 4
                            ? 'text-yellow-600'
                            : 'text-green-600',
                      )}
                    >
                      {strength.label}
                    </p>
                  </div>

                  {/* Validation rules checklist */}
                  <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                    {PASSWORD_RULES.map((rule) => (
                      <PasswordRule
                        key={rule.label}
                        label={rule.label}
                        met={rule.test(form.password)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.confirmPassword}
                  className={cn(
                    'pr-10',
                    errors.confirmPassword && 'border-destructive focus-visible:ring-destructive',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Passwords match indicator */}
              {form.confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Passwords must match</span>
                    </>
                  )}
                </div>
              )}

              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !allRulesMet || !passwordsMatch}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Resetting password...
                </span>
              ) : (
                'Reset password'
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
