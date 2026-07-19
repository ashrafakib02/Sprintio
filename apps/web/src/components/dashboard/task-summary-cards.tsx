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
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="group" aria-label="Task summary">
      {summaries.map((summary, i) => {
        const Icon = summary.icon;
        return (
          <button
            key={summary.label}
            type="button"
            aria-label={`${summary.label}: ${summary.count}`}
            className={cn(
              'rounded-lg border bg-card text-card-foreground shadow-sm text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'animate-fade-in-up',
              i === 0 && 'stagger-1',
              i === 1 && 'stagger-2',
              i === 2 && 'stagger-3',
              i === 3 && 'stagger-4',
            )}
          >
            <div className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors duration-200',
                  summary.color,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.count}</p>
                <p className="text-xs text-muted-foreground">{summary.label}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
