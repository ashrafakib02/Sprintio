import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const demoData = [
  { day: 'Day 1', ideal: 20, actual: 20 },
  { day: 'Day 2', ideal: 17.5, actual: 18 },
  { day: 'Day 3', ideal: 15, actual: 16 },
  { day: 'Day 4', ideal: 12.5, actual: 13 },
  { day: 'Day 5', ideal: 10, actual: 11 },
  { day: 'Day 6', ideal: 7.5, actual: 9 },
  { day: 'Day 7', ideal: 5, actual: 6 },
  { day: 'Day 8', ideal: 2.5, actual: 4 },
  { day: 'Day 9', ideal: 0, actual: null },
  { day: 'Day 10', ideal: 0, actual: null },
];

export interface BurndownChartProps {
  data?: typeof demoData;
}

export function BurndownChart({ data = demoData }: BurndownChartProps) {
  return (
    <Card className="animate-fade-in-up stagger-8">
      <CardHeader className="pb-2">
        <CardTitle headingLevel="h2" className="text-lg font-medium">
          Burndown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={240}
          aria-label="Burndown chart showing ideal vs actual story points"
        >
          <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }} />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              dot={false}
              name="Ideal"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              name="Actual"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
