import { cn } from '@/lib/cn';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-shimmer rounded-md bg-muted relative overflow-hidden', className)}
      {...props}
    />
  );
}

export { Skeleton };
