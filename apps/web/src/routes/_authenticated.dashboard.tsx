import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useDashboardState } from '@/hooks/use-dashboard-state';
import { DashboardSkeleton } from '@/components/dashboard/skeleton';
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
import { ClipboardList, CalendarClock, CalendarRange, AlertTriangle } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const dashboard = useDashboardState();

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isOwner = user?.role === 'owner';

  const summaryItems = useMemo(
    () => [
      { label: 'Assigned', count: dashboard.taskSummary.assigned, icon: ClipboardList },
      {
        label: 'Due today',
        count: dashboard.taskSummary.dueToday,
        icon: CalendarClock,
        color: 'text-primary',
      },
      { label: 'This week', count: dashboard.taskSummary.dueThisWeek, icon: CalendarRange },
      {
        label: 'Overdue',
        count: dashboard.taskSummary.overdue,
        icon: AlertTriangle,
        color: 'text-destructive',
      },
    ],
    [
      dashboard.taskSummary.assigned,
      dashboard.taskSummary.dueToday,
      dashboard.taskSummary.dueThisWeek,
      dashboard.taskSummary.overdue,
    ],
  );

  const mappedTasks = useMemo(
    () =>
      dashboard.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate
          ? new Date(t.dueDate).toLocaleDateString('en-US', { weekday: 'short' })
          : undefined,
        assignee: t.assignee
          ? { name: t.assignee.name, avatarUrl: t.assignee.avatarUrl }
          : undefined,
      })),
    [dashboard.tasks],
  );

  const sprintProp = useMemo(
    () =>
      dashboard.sprint
        ? {
            name: dashboard.sprint.name,
            goal: dashboard.sprint.goal ?? undefined,
            daysRemaining: dashboard.sprint.daysRemaining,
            progress: dashboard.sprint.progress,
            status: dashboard.sprint.health,
            completedToday: dashboard.sprint.completedToday,
            inProgress: dashboard.sprint.inProgress,
            blocked: dashboard.sprint.blocked,
          }
        : null,
    [dashboard.sprint],
  );

  // Show skeleton while initial data loads
  if (dashboard.isLoading.tasks && dashboard.isLoading.sprint) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6" id="main-content">
      {/* Skip-link target & live region for screen readers */}
      <div aria-live="polite" className="sr-only">
        {dashboard.tasks.length} tasks, {dashboard.taskSummary.dueToday} due today,{' '}
        {dashboard.taskSummary.overdue} overdue
      </div>

      {/* T1 — Greeting & Context Bar */}
      <GreetingBar
        userName={user?.name?.split(' ')[0] ?? 'there'}
        sprintName={dashboard.sprint?.name}
        daysRemaining={dashboard.sprint?.daysRemaining}
      />

      {/* T1 — Task Summary Cards */}
      <TaskSummaryCards summaries={summaryItems} />

      {/* T2 — My Tasks + Sprint Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MyTaskList tasks={mappedTasks} total={dashboard.allTasks.length} />
        </div>
        <div>{sprintProp && <SprintOverview sprint={sprintProp} />}</div>
      </div>

      {/* T3 — Burndown Chart + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BurndownChart data={dashboard.burndown} />
        <ActivityFeed activities={dashboard.activity} />
      </div>

      {/* T4 — Board Health Grid */}
      <BoardHealthGrid boards={dashboard.boards} />

      {/* T4 — Team Workload + Velocity (admin/owner only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TeamWorkload members={dashboard.teamWorkload} />
          <VelocityTrend data={dashboard.velocity} />
        </div>
      )}

      {/* T5 — Plan Usage (owner only) */}
      {isOwner && dashboard.workspace && (
        <PlanUsage usage={dashboard.workspace.usage} planName={dashboard.workspace.plan} />
      )}
    </div>
  );
}
