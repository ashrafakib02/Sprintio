import * as React from 'react';
import { cn } from '@/lib/cn';

const progressVariants = {
  default: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  destructive: 'bg-destructive',
} as const;

const progressSizes = {
  sm: 'h-1',
  default: 'h-2',
  lg: 'h-3',
} as const;

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  variant?: keyof typeof progressVariants;
  size?: keyof typeof progressSizes;
  showLabel?: boolean;
}

function Progress({
  className,
  value = 0,
  variant = 'default',
  size = 'default',
  showLabel = false,
  'aria-label': ariaLabel,
  ...props
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium text-foreground">{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div
        className={cn('w-full overflow-hidden rounded-full bg-secondary', progressSizes[size])}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? 'Progress'}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            progressVariants[variant],
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export { Progress };
