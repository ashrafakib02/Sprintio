import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { ClipboardList, CalendarClock, CalendarRange, AlertTriangle } from 'lucide-react';

export interface TaskSummary {
  label: string;
  count: number;
  icon: React.ElementType;
  color?: string;
}

const defaultSummaries: TaskSummary[] = [
  { label: 'Assigned', count: 12, icon: ClipboardList },
  { label: 'Due today', count: 3, icon: CalendarClock, color: 'text-primary' },
  { label: 'This week', count: 7, icon: CalendarRange },
  { label: 'Overdue', count: 1, icon: AlertTriangle, color: 'text-destructive' },
];

export interface TaskSummaryCardsProps {
  summaries?: TaskSummary[];
}

export function TaskSummaryCards({ summaries = defaultSummaries }: TaskSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {summaries.map((summary) => {
        const Icon = summary.icon;
        return (
          <Card key={summary.label} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted',
                  summary.color,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.count}</p>
                <p className="text-xs text-muted-foreground">{summary.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
