import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Team Workload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.map((member) => {
          const percent = Math.round((member.assigned / member.capacity) * 100);
          const isOverloaded = percent >= 90;
          return (
            <div key={member.id} className="flex items-center gap-3">
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
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
