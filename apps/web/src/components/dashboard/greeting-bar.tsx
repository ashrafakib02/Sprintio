import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
}: GreetingBarProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {userName}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span>
              {sprintName} ends in {daysRemaining} days
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            <Timer className="mr-1 h-3 w-3" />
            {daysRemaining}d left
          </Badge>
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            New task
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
