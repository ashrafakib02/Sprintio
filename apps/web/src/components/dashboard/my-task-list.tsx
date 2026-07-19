import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ArrowRight, Circle } from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  dueDate?: string;
  assignee?: { name: string; avatar?: string | null };
}

const priorityConfig: Record<
  TaskItem['priority'],
  { variant: 'destructive' | 'warning' | 'info' | 'secondary' | 'outline'; label: string }
> = {
  urgent: { variant: 'destructive', label: 'Urgent' },
  high: { variant: 'warning', label: 'High' },
  medium: { variant: 'info', label: 'Medium' },
  low: { variant: 'secondary', label: 'Low' },
  none: { variant: 'outline', label: 'None' },
};

const demoTasks: TaskItem[] = [
  {
    id: '1',
    title: 'Fix authentication bug',
    priority: 'urgent',
    dueDate: 'Today',
    assignee: { name: 'Alex Chen' },
  },
  {
    id: '2',
    title: 'Add dark mode support',
    priority: 'high',
    dueDate: 'Fri',
    assignee: { name: 'Alex Chen' },
  },
  {
    id: '3',
    title: 'Write unit tests for auth module',
    priority: 'medium',
    dueDate: 'Mon',
    assignee: { name: 'Alex Chen' },
  },
  {
    id: '4',
    title: 'Update API documentation',
    priority: 'low',
    dueDate: 'Wed',
    assignee: { name: 'Alex Chen' },
  },
];

export interface MyTaskListProps {
  tasks?: TaskItem[];
  total?: number;
  onViewAll?: () => void;
}

export function MyTaskList({ tasks = demoTasks, total = 12, onViewAll }: MyTaskListProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">My Tasks</CardTitle>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-0 p-0">
        <div className="flex-1 divide-y divide-border">
          {tasks.map((task) => {
            const p = priorityConfig[task.priority];
            return (
              <div
                key={task.id}
                className="flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors hover:bg-accent/50"
              >
                <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge variant={p.variant} className="px-1.5 py-0 text-[10px]">
                      {p.label}
                    </Badge>
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                    )}
                  </div>
                </div>
                {task.assignee && (
                  <Avatar name={task.assignee.name} src={task.assignee.avatar} size="sm" />
                )}
              </div>
            );
          })}
        </div>
        <div className="border-t border-border p-4">
          <Button variant="ghost" className="w-full justify-between" onClick={onViewAll}>
            View all tasks
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
