import * as React from 'react';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({
  icon: Icon,
  title,
  description,
  retryLabel = 'Retry',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      {Icon && <Icon className="mb-4 h-12 w-12 text-muted-foreground" />}
      <h3 className="mb-2 text-lg font-medium text-foreground">{title}</h3>
      {description && <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
