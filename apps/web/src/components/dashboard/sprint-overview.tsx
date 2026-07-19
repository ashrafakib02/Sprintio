import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import { Timer, Target, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export interface SprintData {
  name: string;
  goal?: string;
  daysRemaining: number;
  progress: number;
  status: 'on_track' | 'at_risk' | 'behind';
  completedToday?: number;
  inProgress?: number;
  blocked?: number;
}

const statusConfig: Record<
  SprintData['status'],
  { label: string; variant: 'success' | 'warning' | 'destructive'; icon: React.ElementType }
> = {
  on_track: { label: 'On track', variant: 'success', icon: CheckCircle2 },
  at_risk: { label: 'At risk', variant: 'warning', icon: AlertTriangle },
  behind: { label: 'Behind', variant: 'destructive', icon: XCircle },
};

const demoSprint: SprintData = {
  name: 'Sprint 3',
  goal: 'Ship authentication system',
  daysRemaining: 4,
  progress: 65,
  status: 'on_track',
  completedToday: 2,
  inProgress: 5,
  blocked: 1,
};

export interface SprintOverviewProps {
  sprint?: SprintData;
}

export function SprintOverview({ sprint = demoSprint }: SprintOverviewProps) {
  const s = statusConfig[sprint.status];
  const StatusIcon = s.icon;

  return (
    <Card className="flex h-full flex-col animate-fade-in-up stagger-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle headingLevel="h2" className="text-lg font-medium">
            {sprint.name}
          </CardTitle>
          <Badge variant={s.variant} className="animate-scale-in stagger-2">
            <StatusIcon className="mr-1 h-3 w-3" />
            {s.label}
          </Badge>
        </div>
        {sprint.goal && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Target className="h-3 w-3" />
            {sprint.goal}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Progress */}
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{sprint.progress}%</span>
          </div>
          <Progress value={sprint.progress} aria-label={`Sprint progress: ${sprint.progress}%`} />
        </div>

        {/* Days remaining */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="h-4 w-4" />
          <span>{sprint.daysRemaining} days remaining</span>
        </div>

        {/* Health indicators */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted p-3 text-center transition-all duration-200 hover:bg-muted/80 hover:scale-105">
            <p className="text-lg font-bold text-foreground">{sprint.completedToday ?? 0}</p>
            <p className="text-xs text-muted-foreground">Done today</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center transition-all duration-200 hover:bg-muted/80 hover:scale-105">
            <p className="text-lg font-bold text-foreground">{sprint.inProgress ?? 0}</p>
            <p className="text-xs text-muted-foreground">In progress</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center transition-all duration-200 hover:bg-muted/80 hover:scale-105">
            <p
              className={cn(
                'text-lg font-bold',
                sprint.blocked ? 'text-destructive' : 'text-foreground',
              )}
            >
              {sprint.blocked ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
