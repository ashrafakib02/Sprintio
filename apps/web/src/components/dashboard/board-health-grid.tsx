import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export interface BoardColumn {
  name: string;
  count: number;
  colorToken: string;
}

export interface BoardHealth {
  boardId: string;
  name: string;
  totalCards: number;
  columns: BoardColumn[];
}

const colorMap: Record<string, string> = {
  'muted-foreground': 'bg-muted-foreground',
  primary: 'bg-primary',
  '--priority-medium': 'bg-amber-500',
  '--sprint-on-track': 'bg-emerald-500',
  destructive: 'bg-destructive',
};

const demoBoards: BoardHealth[] = [
  {
    boardId: '1',
    name: 'Sprint Board',
    totalCards: 12,
    columns: [
      { name: 'To Do', count: 3, colorToken: 'muted-foreground' },
      { name: 'In Progress', count: 5, colorToken: 'primary' },
      { name: 'Review', count: 2, colorToken: '--priority-medium' },
      { name: 'Done', count: 2, colorToken: '--sprint-on-track' },
    ],
  },
  {
    boardId: '2',
    name: 'Bug Tracker',
    totalCards: 8,
    columns: [
      { name: 'Open', count: 4, colorToken: 'muted-foreground' },
      { name: 'In Progress', count: 2, colorToken: 'primary' },
      { name: 'Resolved', count: 2, colorToken: '--sprint-on-track' },
    ],
  },
  {
    boardId: '3',
    name: 'Feature Backlog',
    totalCards: 21,
    columns: [
      { name: 'Backlog', count: 12, colorToken: 'muted-foreground' },
      { name: 'Ready', count: 5, colorToken: 'primary' },
      { name: 'In Progress', count: 3, colorToken: '--priority-medium' },
      { name: 'Done', count: 1, colorToken: '--sprint-on-track' },
    ],
  },
];

export interface BoardHealthGridProps {
  boards?: BoardHealth[];
}

export function BoardHealthGrid({ boards = demoBoards }: BoardHealthGridProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Board Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => {
            return (
              <div
                key={board.boardId}
                className="cursor-pointer rounded-lg border border-border p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">{board.name}</h4>
                  <span className="text-xs text-muted-foreground">{board.totalCards} cards</span>
                </div>
                {/* Column distribution bar */}
                <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-muted">
                  {board.columns.map((col) => (
                    <div
                      key={col.name}
                      className={cn(
                        'h-full transition-all',
                        colorMap[col.colorToken] ?? 'bg-muted-foreground',
                      )}
                      style={{ width: `${(col.count / board.totalCards) * 100}%` }}
                      title={`${col.name}: ${col.count}`}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {board.columns.map((col) => (
                    <div key={col.name} className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          colorMap[col.colorToken] ?? 'bg-muted-foreground',
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        {col.name} ({col.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
