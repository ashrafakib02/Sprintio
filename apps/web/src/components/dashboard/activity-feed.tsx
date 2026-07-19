import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { ArrowRight } from 'lucide-react';

export interface ActivityItem {
  id: string;
  actor: { name: string; avatar?: string | null };
  action: string;
  target: string;
  timestamp: string;
}

const actionColors: Record<'completed' | 'started' | 'created' | 'commented' | 'updated', string> = {
  completed: 'text-emerald-600 dark:text-emerald-400',
  started: 'text-blue-600 dark:text-blue-400',
  created: 'text-primary',
  commented: 'text-muted-foreground',
  updated: 'text-amber-600 dark:text-amber-400',
};

const demoActivity: ActivityItem[] = [
  {
    id: '1',
    actor: { name: 'Alex Chen' },
    action: 'completed',
    target: '"Fix auth bug"',
    timestamp: '2 min ago',
  },
  {
    id: '2',
    actor: { name: 'Sam Wilson' },
    action: 'started',
    target: '"API refactor"',
    timestamp: '15 min ago',
  },
  {
    id: '3',
    actor: { name: 'Jordan Lee' },
    action: 'created',
    target: 'board "Q3 Planning"',
    timestamp: '1 hour ago',
  },
  {
    id: '4',
    actor: { name: 'Alex Chen' },
    action: 'commented',
    target: 'on "Add dark mode"',
    timestamp: '2 hours ago',
  },
  {
    id: '5',
    actor: { name: 'Sam Wilson' },
    action: 'updated',
    target: '"Sprint 3" goal',
    timestamp: '3 hours ago',
  },
];

export interface ActivityFeedProps {
  activities?: ActivityItem[];
  onViewAll?: () => void;
}

export function ActivityFeed({ activities = demoActivity, onViewAll }: ActivityFeedProps) {
  return (
    <Card className="flex h-full flex-col animate-fade-in-up stagger-5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle headingLevel="h2" className="text-lg font-medium">
          Recent Activity
        </CardTitle>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="transition-colors hover:text-primary"
          >
            View all
            <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="divide-y divide-border" role="list" aria-label="Recent activity">
          {activities.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="listitem"
              aria-label={`${item.actor.name} ${item.action} ${item.target}, ${item.timestamp}`}
              className={cn(
                'flex w-full items-start gap-3 px-6 py-3 text-left transition-colors duration-200',
                'hover:bg-accent/50',
                'focus-visible:outline-none focus-visible:bg-accent/50',
                'animate-fade-in',
                `stagger-${Math.min(i + 4, 8)}`,
              )}
            >
              <Avatar name={item.actor.name} src={item.actor.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{item.actor.name}</span>{' '}
                  <span
                    className={cn(
                      'font-medium',
                      actionColors[item.action as keyof typeof actionColors] ?? 'text-muted-foreground',
                    )}
                  >
                    {item.action}
                  </span>{' '}
                  <span className="text-muted-foreground">{item.target}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.timestamp}</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
