import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import { Crown } from 'lucide-react';

export interface UsageItem {
  label: string;
  current: number;
  limit: number;
  unit?: string;
}

const demoUsage: UsageItem[] = [
  { label: 'Team members', current: 8, limit: 10, unit: 'members' },
  { label: 'Projects', current: 5, limit: 10, unit: 'projects' },
  { label: 'Storage', current: 2.4, limit: 5, unit: 'GB' },
  { label: 'API calls', current: 8500, limit: 10000, unit: 'calls' },
];

export interface PlanUsageProps {
  usage?: UsageItem[];
  planName?: string;
  onUpgrade?: () => void;
}

export function PlanUsage({ usage = demoUsage, planName = 'Pro', onUpgrade }: PlanUsageProps) {
  return (
    <Card className="animate-fade-in-up stagger-7">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle headingLevel="h2" className="text-lg font-medium">
          Plan Usage
        </CardTitle>
        <span className="text-sm font-medium text-primary">{planName}</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {usage.map((item, i) => {
          const percent = Math.min(Math.round((item.current / item.limit) * 100), 100);
          const isNearLimit = percent >= 80;
          return (
            <div
              key={item.label}
              className={cn(
                'rounded-md p-2 transition-colors duration-200 hover:bg-muted/50',
                'animate-fade-in',
                `stagger-${Math.min(i + 5, 8)}`,
              )}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span
                  className={cn(
                    'font-medium',
                    isNearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
                  )}
                >
                  {item.current.toLocaleString()} / {item.limit.toLocaleString()}
                  {item.unit && (
                    <span className="ml-1 text-xs text-muted-foreground">{item.unit}</span>
                  )}
                </span>
              </div>
              <Progress
                value={percent}
                variant={isNearLimit ? 'warning' : 'default'}
                size="sm"
                aria-label={`${item.label}: ${percent}%`}
              />
            </div>
          );
        })}
        {onUpgrade && (
          <Button
            variant="outline"
            className="w-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            onClick={onUpgrade}
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
