import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRegister } from '@/hooks/use-register';
import { cn } from '@/lib/cn';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

// ── Password strength helper ──────────────────────────────────

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

// ── Password rule checkbox ──────────────────────────────────────

function PasswordRule({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
          met ? 'border-green-500 bg-green-500' : 'border-muted-foreground/40',
        )}
      >
        {met && (
          <svg
            className="h-2.5 w-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={cn(met ? 'text-green-600' : 'text-muted-foreground')}>{label}</span>
    </div>
  );
}

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

  const strength = getPasswordStrength(form.password);
  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;
  const isSubmitting = registerMutation.isPending;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (form.name.length > 100) {
      newErrors.name = 'Name must be at most 100 characters';
    }

    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else {
      if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      else if (form.password.length > 128)
        newErrors.password = 'Password must be at most 128 characters';
      else if (!/[A-Z]/.test(form.password))
        newErrors.password = 'Must contain at least one uppercase letter';
      else if (!/[a-z]/.test(form.password))
        newErrors.password = 'Must contain at least one lowercase letter';
      else if (!/[0-9]/.test(form.password))
        newErrors.password = 'Must contain at least one number';
      else if (!/[^A-Za-z0-9]/.test(form.password))
        newErrors.password = 'Must contain at least one special character';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms of service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
              <div className="space-y-1.5">
                <PasswordRule label="At least 8 characters" met={form.password.length >= 8} />
                <PasswordRule
                  label="At least one uppercase letter"
                  met={/[A-Z]/.test(form.password)}
                />
                <PasswordRule
                  label="At least one lowercase letter"
                  met={/[a-z]/.test(form.password)}
                />
                <PasswordRule label="At least one number" met={/[0-9]/.test(form.password)} />
                <PasswordRule
                  label="At least one special character"
                  met={/[^A-Za-z0-9]/.test(form.password)}
                />
              </div>

              {/* Strength indicator */}
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors',
                        i <= Math.ceil(strength.score / 2) ? strength.color : 'bg-muted',
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
                        ? 'text-yellow-500'
                        : 'text-green-500',
                  )}
                >
                  {strength.label}
                </p>
              </div>

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
            <a href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
