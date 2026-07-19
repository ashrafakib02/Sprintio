import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greeting bar skeleton */}
      <Skeleton className="h-[120px] w-full rounded-lg" />

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>

      {/* Main content grid skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[240px] rounded-lg" />
        </div>
        {/* Right column - 1 col */}
        <div className="space-y-6">
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[240px] rounded-lg" />
        </div>
      </div>

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
