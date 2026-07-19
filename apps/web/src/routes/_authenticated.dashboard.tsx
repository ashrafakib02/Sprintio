import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { GreetingBar } from '@/components/dashboard/greeting-bar';
import { TaskSummaryCards } from '@/components/dashboard/task-summary-cards';
import { MyTaskList } from '@/components/dashboard/my-task-list';
import { SprintOverview } from '@/components/dashboard/sprint-overview';
import { BurndownChart } from '@/components/dashboard/burndown-chart';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { BoardHealthGrid } from '@/components/dashboard/board-health-grid';
import { TeamWorkload } from '@/components/dashboard/team-workload';
import { VelocityTrend } from '@/components/dashboard/velocity-trend';
import { PlanUsage } from '@/components/dashboard/plan-usage';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isOwner = user?.role === 'owner';

  return (
    <div className="space-y-6">
      {/* T1 — Greeting & Context Bar */}
      <GreetingBar />

      {/* T1 — Task Summary Cards */}
      <TaskSummaryCards />

      {/* T2 — My Tasks + Sprint Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MyTaskList />
        </div>
        <div>
          <SprintOverview />
        </div>
      </div>

      {/* T3 — Burndown Chart + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BurndownChart />
        <ActivityFeed />
      </div>

      {/* T4 — Board Health Grid */}
      <BoardHealthGrid />

      {/* T4 — Team Workload + Velocity (admin/owner only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TeamWorkload />
          <VelocityTrend />
        </div>
      )}

      {/* T5 — Plan Usage (owner only) */}
      {isOwner && <PlanUsage />}
    </div>
  );
}
