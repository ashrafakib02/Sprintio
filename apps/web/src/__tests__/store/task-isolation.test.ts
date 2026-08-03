import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient } from '@tanstack/react-query';
import activeOrganizationReducer from '@/store/slices/activeOrganizationSlice';
import activeWorkspaceReducer from '@/store/slices/activeWorkspaceSlice';
import activeProjectReducer from '@/store/slices/activeProjectSlice';
import { queryKeys } from '@/lib/query-keys';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const PROJECT_A1 = 'proj-a1';
const PROJECT_A2 = 'proj-a2';
const PROJECT_B1 = 'proj-b1';
const PROJECT_B2 = 'proj-b2';

type TaskData = {
  id: string;
  title: string;
  projectId: string;
  status: string;
  priority: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createStore() {
  return configureStore({
    reducer: {
      activeOrganization: activeOrganizationReducer,
      activeWorkspace: activeWorkspaceReducer,
      activeProject: activeProjectReducer,
    },
  });
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function createMockTask(overrides: Partial<TaskData>): TaskData {
  return {
    id: overrides.id ?? 'task-new',
    title: overrides.title ?? 'New Task',
    projectId: overrides.projectId ?? PROJECT_A1,
    status: overrides.status ?? 'todo',
    priority: overrides.priority ?? 'medium',
  };
}

// ─── Task CRUD Isolation Tests ───────────────────────────────────────────────

describe('Task Isolation — Create Operations', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('should add a task to project A without affecting project B', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({ id: 'existing-b1', projectId: PROJECT_B1 }),
    ]);

    const projectBBefore = qc.getQueryData<Array<{ id: string }>>(
      queryKeys.tasks.byProject(PROJECT_B1),
    );
    expect(projectBBefore).toHaveLength(1);

    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'new-a1', title: 'New Task in A', projectId: PROJECT_A1 }),
    ]);

    const projectAAfter = qc.getQueryData<Array<{ id: string }>>(
      queryKeys.tasks.byProject(PROJECT_A1),
    );
    expect(projectAAfter).toHaveLength(1);
    expect(projectAAfter?.[0].id).toBe('new-a1');

    const projectBAfter = qc.getQueryData<Array<{ id: string }>>(
      queryKeys.tasks.byProject(PROJECT_B1),
    );
    expect(projectBAfter).toHaveLength(1);
    expect(projectBAfter?.[0].id).toBe('existing-b1');
  });

  it('should invalidate only project A tasks after creation, not project B', async () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'a1-t1', projectId: PROJECT_A1 }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({ id: 'b1-t1', projectId: PROJECT_B1 }),
    ]);

    // Simulate the onSuccess of useCreateTask
    await qc.invalidateQueries({ queryKey: queryKeys.tasks.byProject(PROJECT_A1) });

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A1))).toHaveLength(1);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_B1))).toHaveLength(1);

    // Verify invalidation was scoped
    const queryCache = qc.getQueryCache();
    const queryA = queryCache.find({ queryKey: queryKeys.tasks.byProject(PROJECT_A1) });
    const queryB = queryCache.find({ queryKey: queryKeys.tasks.byProject(PROJECT_B1) });

    expect(queryA?.state.isInvalidated).toBe(true);
    expect(queryB?.state.isInvalidated).toBe(false);
  });

  it('should handle creating tasks in multiple projects sequentially', () => {
    const projects = [PROJECT_A1, PROJECT_A2, PROJECT_B1, PROJECT_B2];

    projects.forEach((pid) => {
      qc.setQueryData(queryKeys.tasks.byProject(pid), [
        createMockTask({ id: `task-${pid}-1`, title: `Task for ${pid}`, projectId: pid }),
      ]);
    });

    projects.forEach((pid) => {
      const tasks = qc.getQueryData<Array<{ id: string; projectId: string }>>(
        queryKeys.tasks.byProject(pid),
      );
      expect(tasks).toHaveLength(1);
      expect(tasks?.[0].projectId).toBe(pid);
    });
  });
});

describe('Task Isolation — Update Operations', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('should update a task in project A without affecting project B', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'task-a1', title: 'Original A', projectId: PROJECT_A1 }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({ id: 'task-b1', title: 'Original B', projectId: PROJECT_B1 }),
    ]);

    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({
        id: 'task-a1',
        title: 'Updated A',
        projectId: PROJECT_A1,
        status: 'in_progress',
      }),
    ]);

    const tasksA = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    expect(tasksA?.[0].title).toBe('Updated A');
    expect(tasksA?.[0].status).toBe('in_progress');

    const tasksB = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_B1));
    expect(tasksB?.[0].title).toBe('Original B');
    expect(tasksB?.[0].status).toBe('todo');
  });

  it('should update task status without altering other tasks in the same project', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'task-a1', title: 'Task 1', projectId: PROJECT_A1, status: 'todo' }),
      createMockTask({ id: 'task-a2', title: 'Task 2', projectId: PROJECT_A1, status: 'todo' }),
      createMockTask({
        id: 'task-a3',
        title: 'Task 3',
        projectId: PROJECT_A1,
        status: 'in_progress',
      }),
    ]);

    const tasks = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    const updatedTasks = tasks?.map((t: TaskData) =>
      t.id === 'task-a1' ? { ...t, status: 'done' } : t,
    );
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), updatedTasks);

    const result = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    expect(result?.[0].status).toBe('done');
    expect(result?.[1].status).toBe('todo');
    expect(result?.[2].status).toBe('in_progress');
  });

  it('should handle updating tasks across different projects independently', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'task-a1', title: 'Task A1', projectId: PROJECT_A1 }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({ id: 'task-b1', title: 'Task B1', projectId: PROJECT_B1 }),
    ]);

    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({
        id: 'task-a1',
        title: 'Updated A1',
        projectId: PROJECT_A1,
        priority: 'urgent',
      }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({
        id: 'task-b1',
        title: 'Updated B1',
        projectId: PROJECT_B1,
        priority: 'low',
      }),
    ]);

    const tasksA = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    const tasksB = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_B1));

    expect(tasksA?.[0].priority).toBe('urgent');
    expect(tasksB?.[0].priority).toBe('low');
  });
});

describe('Task Isolation — Delete Operations', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('should remove a task from project A without affecting project B', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'task-a1', projectId: PROJECT_A1 }),
      createMockTask({ id: 'task-a2', projectId: PROJECT_A1 }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({ id: 'task-b1', projectId: PROJECT_B1 }),
    ]);

    const tasksA = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    qc.setQueryData(
      queryKeys.tasks.byProject(PROJECT_A1),
      tasksA?.filter((t: TaskData) => t.id !== 'task-a1'),
    );

    const afterA = qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject(PROJECT_A1));
    expect(afterA).toHaveLength(1);
    expect(afterA?.[0].id).toBe('task-a2');

    const afterB = qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject(PROJECT_B1));
    expect(afterB).toHaveLength(1);
    expect(afterB?.[0].id).toBe('task-b1');
  });

  it('should delete the last task from a project without affecting other projects', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'last-task-a', projectId: PROJECT_A1 }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({ id: 'task-b1', projectId: PROJECT_B1 }),
      createMockTask({ id: 'task-b2', projectId: PROJECT_B1 }),
    ]);

    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), []);

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A1))).toHaveLength(0);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_B1))).toHaveLength(2);
  });

  it('should handle deleting all tasks from a project via removeQueries', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'a-t1', projectId: PROJECT_A1 }),
      createMockTask({ id: 'a-t2', projectId: PROJECT_A1 }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({ id: 'b-t1', projectId: PROJECT_B1 }),
    ]);

    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJECT_A1) });

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_B1))).toHaveLength(1);
  });

  it('should not leave stale references when deleting the last task in cache', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'only-task', projectId: PROJECT_A1 }),
    ]);

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A1))).toHaveLength(1);

    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), []);

    const cached = qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A1));
    expect(cached).toEqual([]);
  });
});

// ─── Cross-Project Task Contamination Prevention ────────────────────────────

describe('Task Isolation — Cross-Project Contamination Prevention', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('should not mix tasks from projects in different workspaces', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({
        id: 'wsa-proj-a1-task',
        title: 'WS A / Proj A1 Task',
        projectId: PROJECT_A1,
      }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({
        id: 'wsb-proj-b1-task',
        title: 'WS B / Proj B1 Task',
        projectId: PROJECT_B1,
      }),
    ]);

    const tasksA = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    const tasksB = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_B1));

    expect(tasksA?.every((t: TaskData) => t.projectId === PROJECT_A1)).toBe(true);
    expect(tasksB?.every((t: TaskData) => t.projectId === PROJECT_B1)).toBe(true);
  });

  it('should maintain isolation even when projects share the same name', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({
        id: 'unique-a1',
        title: 'Shared Name Task',
        projectId: PROJECT_A1,
      }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({
        id: 'unique-b1',
        title: 'Shared Name Task',
        projectId: PROJECT_B1,
      }),
    ]);

    const tasksA = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    const tasksB = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_B1));

    expect(tasksA?.[0].id).not.toBe(tasksB?.[0].id);
    expect(tasksA?.[0].projectId).not.toBe(tasksB?.[0].projectId);
  });

  it('should handle rapid CRUD operations across projects without data mixing', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      createMockTask({ id: 'a-t1', projectId: PROJECT_A1, title: 'A Task 1' }),
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      createMockTask({ id: 'b-t1', projectId: PROJECT_B1, title: 'B Task 1' }),
    ]);

    // 1. Add task to A
    const aTasks = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      ...(aTasks ?? []),
      createMockTask({ id: 'a-t2', projectId: PROJECT_A1, title: 'A Task 2' }),
    ]);

    // 2. Delete task from B
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), []);

    // 3. Update task in A
    const updatedA = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    qc.setQueryData(
      queryKeys.tasks.byProject(PROJECT_A1),
      updatedA?.map((t: TaskData) => (t.id === 'a-t1' ? { ...t, title: 'A Task 1 Updated' } : t)),
    );

    const finalA = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_A1));
    const finalB = qc.getQueryData<TaskData[]>(queryKeys.tasks.byProject(PROJECT_B1));

    expect(finalA).toHaveLength(2);
    expect(finalA?.[0].title).toBe('A Task 1 Updated');
    expect(finalA?.[1].id).toBe('a-t2');
    expect(finalB).toHaveLength(0);
  });
});
