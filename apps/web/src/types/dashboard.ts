import type { Task, TaskPriority, TaskStatus } from '@sprintio/shared';
import type { Sprint } from '@sprintio/shared';
import type { Workspace } from '@sprintio/shared';
import type { User } from '@sprintio/shared';

// ─── Dashboard UI State (Redux) ──────────────────────────────────────────────

export interface DashboardFilters {
  priority: TaskPriority[];
  status: TaskStatus[];
  search: string;
  assigneeId: string | null;
}

export interface DashboardViewPreferences {
  layout: 'grid' | 'list';
  showBurndown: boolean;
  showVelocity: boolean;
  showTeamWorkload: boolean;
  showPlanUsage: boolean;
  collapsedSections: string[];
}

export interface DashboardUIState {
  filters: DashboardFilters;
  viewPreferences: DashboardViewPreferences;
  selectedTaskId: string | null;
  sidebarCollapsed: boolean;
}

// ─── Dashboard Data Shapes (TanStack Query) ──────────────────────────────────

export interface TaskWithAssignee extends Task {
  assignee?: User | null;
}

export interface SprintWithProgress extends Omit<Sprint, 'status'> {
  sprintStatus: 'planned' | 'active' | 'completed';
  health: 'on_track' | 'at_risk' | 'behind';
  progress: number;
  daysRemaining: number;
  completedToday: number;
  inProgress: number;
  blocked: number;
}

export interface BoardHealthData {
  boardId: string;
  name: string;
  totalCards: number;
  columns: {
    name: string;
    count: number;
    colorToken: string;
  }[];
}

export interface ActivityItem {
  id: string;
  actor: { name: string; avatar?: string | null };
  action: string;
  target: string;
  timestamp: string;
}

export interface MemberWorkload {
  id: string;
  name: string;
  avatar?: string | null;
  assigned: number;
  capacity: number;
}

export interface UsageItem {
  label: string;
  current: number;
  limit: number;
  unit?: string;
}

export interface WorkspaceData extends Workspace {
  memberCount: number;
  boardCount: number;
  usage: UsageItem[];
}

export interface BurndownPoint {
  day: string;
  ideal: number;
  actual: number | null;
}

export interface VelocityPoint {
  sprint: string;
  planned: number;
  completed: number;
}

export interface TaskSummary {
  label: string;
  count: number;
  icon: string; // Lucide icon name
  color?: string;
}

// ─── Dashboard State (Combined) ──────────────────────────────────────────────

export interface DashboardState {
  // Data from queries
  tasks: TaskWithAssignee[];
  taskSummary: TaskSummary[];
  sprint: SprintWithProgress | null;
  boards: BoardHealthData[];
  activity: ActivityItem[];
  teamWorkload: MemberWorkload[];
  velocity: VelocityPoint[];
  burndown: BurndownPoint[];
  workspace: WorkspaceData | null;

  // Loading states
  isLoading: {
    tasks: boolean;
    sprint: boolean;
    boards: boolean;
    activity: boolean;
    workspace: boolean;
    analytics: boolean;
  };

  // Derived from Redux filters
  filteredTasks: TaskWithAssignee[];
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
}
