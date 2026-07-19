import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Plus, Timer } from 'lucide-react';

export interface GreetingBarProps {
  userName?: string;
  greeting?: string;
  sprintName?: string;
  daysRemaining?: number;
  onNewTask?: () => void;
}

export function GreetingBar({
  userName = 'Alex',
  greeting = 'Good morning',
  sprintName = 'Sprint 3',
  daysRemaining = 4,
  onNewTask,
}: GreetingBarProps) {
  return (
    <Card className="animate-fade-in-up">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {userName}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" aria-hidden="true" />
            <span>
              {sprintName} ends in {daysRemaining} days
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="animate-fade-in stagger-2">
            <Timer className="mr-1 h-3 w-3" aria-hidden="true" />
            {daysRemaining}d left
          </Badge>
          <ThemeToggle />
          <Button size="sm" className="transition-transform hover:scale-105 active:scale-95" onClick={onNewTask}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New task
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
