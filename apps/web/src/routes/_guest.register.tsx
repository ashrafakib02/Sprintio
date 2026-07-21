import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GoogleLoginButton } from '@/components/auth/google-login-button';
import { useRegister } from '@/hooks/use-register';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/spinner';
import {
  PASSWORD_RULES,
  PasswordRule,
  PasswordStrengthBar,
} from '@/components/auth/password-strength';
import { RegisterSchema } from '@sprintio/shared/schemas';

export const Route = createFileRoute('/_guest/register')({
  component: RegisterPage,
});

// ── Page Component ────────────────────────────────────────────

export function RegisterPage() {
  const registerMutation = useRegister();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;
  const _allRulesMet = PASSWORD_RULES.every((rule) => rule.test(form.password));
  const isSubmitting = registerMutation.isPending;

  function validate(): boolean {
    const result = RegisterSchema.safeParse({
      name: form.name,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    if (!termsAccepted) {
      setErrors({ terms: 'You must accept the terms of service' });
      return false;
    }

    setErrors({});
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    registerMutation.mutate(form);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-2xl min-h-150">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>Enter your details to get started with Sprintio</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Google OAuth */}
          <GoogleLoginButton variant="outline" />

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                disabled={isSubmitting}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Validation checklist */}
              <PasswordRulesChecklistInline password={form.password} />

              {/* Strength indicator */}
              <PasswordStrengthBar password={form.password} />

              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                disabled={isSubmitting}
                aria-invalid={!!errors.confirmPassword}
              />
              {form.confirmPassword.length > 0 && (
                <p
                  className={cn(
                    'text-xs font-medium',
                    passwordsMatch ? 'text-green-500' : 'text-muted-foreground',
                  )}
                >
                  {passwordsMatch ? '✓ Passwords match' : 'Passwords must match'}
                </p>
              )}
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={setTermsAccepted}
                  disabled={isSubmitting}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-snug">
                  I agree to the{' '}
                  <a href="/terms" className="text-primary hover:underline" target="_blank">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary hover:underline" target="_blank">
                    Privacy Policy
                  </a>
                </Label>
              </div>
              {errors.terms && <p className="text-sm text-destructive">{errors.terms}</p>}
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Inline validation checklist wrapper ─────────────────────────

function PasswordRulesChecklistInline({ password }: { password: string }) {
  if (password.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {PASSWORD_RULES.map((rule) => (
        <PasswordRule key={rule.label} label={rule.label} met={rule.test(password)} />
      ))}
    </div>
  );
}
