import { cn } from '@/lib/cn';

// ── Password strength helper ──────────────────────────────────

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  segments: number;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500', segments: 1 };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500', segments: 2 };
  return { score, label: 'Strong', color: 'bg-green-500', segments: 3 };
}

// ── Validation rules config ───────────────────────────────────

export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'At least one special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// ── Password rule row ─────────────────────────────────────────

export function PasswordRule({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors',
          met ? 'bg-green-500' : 'border border-muted-foreground/30',
        )}
      >
        {met ? (
          <svg
            className="h-2.5 w-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </div>
      <span className={cn('transition-colors', met ? 'text-green-600' : 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  );
}

// ── Password strength bar ─────────────────────────────────────

export function PasswordStrengthBar({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  if (password.length === 0) return null;

  const strength = getPasswordStrength(password);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
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
              ? 'text-yellow-500'
              : 'text-green-500',
        )}
      >
        {strength.label}
      </p>
    </div>
  );
}

// ── Validation rules checklist ────────────────────────────────

export function PasswordRulesChecklist({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  if (password.length === 0) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {PASSWORD_RULES.map((rule) => (
        <PasswordRule key={rule.label} label={rule.label} met={rule.test(password)} />
      ))}
    </div>
  );
}
