import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard" aria-busy="true">
      <span className="sr-only">Loading dashboard content...</span>
      {/* Greeting bar skeleton */}
      <Skeleton className="h-[120px] w-full rounded-lg animate-fade-in-up" />

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-[88px] rounded-lg animate-fade-in-up"
            style={{ animationDelay: `${(i + 1) * 50}ms` }}
          />
        ))}
      </div>

      {/* Main content grid skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          <Skeleton
            className="h-[280px] rounded-lg animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          />
          <Skeleton
            className="h-[240px] rounded-lg animate-fade-in-up"
            style={{ animationDelay: '350ms' }}
          />
        </div>
        {/* Right column - 1 col */}
        <div className="space-y-6">
          <Skeleton
            className="h-[280px] rounded-lg animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          />
          <Skeleton
            className="h-[240px] rounded-lg animate-fade-in-up"
            style={{ animationDelay: '350ms' }}
          />
        </div>
      </div>

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-[200px] rounded-lg animate-fade-in-up"
            style={{ animationDelay: `${400 + i * 50}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
