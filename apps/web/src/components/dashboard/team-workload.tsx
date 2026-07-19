import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
export interface MemberWorkload {
  id: string;
  name: string;
  avatar?: string | null;
  assigned: number;
  capacity: number;
}

const demoMembers: MemberWorkload[] = [
  { id: '1', name: 'Alex Chen', assigned: 8, capacity: 10 },
  { id: '2', name: 'Sam Wilson', assigned: 6, capacity: 10 },
  { id: '3', name: 'Jordan Lee', assigned: 10, capacity: 10 },
  { id: '4', name: 'Casey Morgan', assigned: 3, capacity: 10 },
  { id: '5', name: 'Taylor Swift', assigned: 7, capacity: 10 },
];

export interface TeamWorkloadProps {
  members?: MemberWorkload[];
}

export function TeamWorkload({ members = demoMembers }: TeamWorkloadProps) {
  return (
    <Card className="animate-fade-in-up stagger-7">
      <CardHeader className="pb-2">
        <CardTitle headingLevel="h2" className="text-lg font-medium">
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.map((member, i) => {
          const percent = member.capacity > 0 ? Math.round((member.assigned / member.capacity) * 100) : 0;
          const isOverloaded = percent >= 90;
          return (
            <div
              key={member.id}
              className={cn(
                'flex items-center gap-3 rounded-md p-1.5 transition-colors duration-200 hover:bg-muted/50',
                'animate-fade-in',
                `stagger-${Math.min(i + 4, 8)}`,
              )}
            >
              <Avatar name={member.name} src={member.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-foreground">
                    {member.name}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {member.assigned}/{member.capacity}
                  </span>
                </div>
                <Progress
                  value={percent}
                  variant={isOverloaded ? 'warning' : 'default'}
                  size="sm"
                  aria-label={`${member.name} workload: ${percent}%`}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
