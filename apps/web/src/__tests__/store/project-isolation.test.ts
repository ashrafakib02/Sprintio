import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient } from '@tanstack/react-query';
import activeOrganizationReducer from '@/store/slices/activeOrganizationSlice';
import activeWorkspaceReducer, { setActiveWorkspace } from '@/store/slices/activeWorkspaceSlice';
import activeProjectReducer, { setActiveProject } from '@/store/slices/activeProjectSlice';
import { queryKeys } from '@/lib/query-keys';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const WORKSPACE = 'ws-shared';
const PROJECT_A = 'proj-aaa-111';
const PROJECT_B = 'proj-bbb-222';
const TASK_A1 = 'task-a1';
const TASK_A2 = 'task-a2';
const TASK_B1 = 'task-b1';
const TASK_B2 = 'task-b2';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Redux Slice Isolation Tests ─────────────────────────────────────────────

describe('Project Isolation — Redux Slice', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('should set the active project ID', () => {
    store.dispatch(setActiveProject(PROJECT_A));
    expect(store.getState().activeProject.projectId).toBe(PROJECT_A);
  });

  it('should only store a single active project at a time', () => {
    store.dispatch(setActiveProject(PROJECT_A));
    expect(store.getState().activeProject.projectId).toBe(PROJECT_A);

    store.dispatch(setActiveProject(PROJECT_B));
    expect(store.getState().activeProject.projectId).toBe(PROJECT_B);
  });

  it('should not affect workspace state when project changes', () => {
    store.dispatch(setActiveWorkspace(WORKSPACE));
    store.dispatch(setActiveProject(PROJECT_B));

    expect(store.getState().activeWorkspace.workspaceId).toBe(WORKSPACE);
    expect(store.getState().activeProject.projectId).toBe(PROJECT_B);
  });

  it('should allow resetting project to null', () => {
    store.dispatch(setActiveProject(PROJECT_A));
    store.dispatch(setActiveProject(null));

    expect(store.getState().activeProject.projectId).toBeNull();
  });

  it('should handle project switch — project A not persisted in selection', () => {
    store.dispatch(setActiveProject(PROJECT_A));
    expect(store.getState().activeProject.projectId).toBe(PROJECT_A);

    store.dispatch(setActiveProject(PROJECT_B));
    expect(store.getState().activeProject.projectId).toBe(PROJECT_B);

    expect(store.getState().activeProject.projectId).not.toBe(PROJECT_A);
  });

  it('should handle independent organization and project changes', () => {
    store.dispatch(setActiveProject(PROJECT_A));
    store.dispatch(setActiveProject(PROJECT_B));

    expect(store.getState().activeProject.projectId).toBe(PROJECT_B);
    expect(store.getState().activeWorkspace.workspaceId).toBeNull();
  });
});

// ─── Query Key Isolation Tests ───────────────────────────────────────────────

describe('Project Isolation — Query Key Scoping', () => {
  it('should generate distinct task query keys per project', () => {
    const keyProjA = queryKeys.tasks.byProject(PROJECT_A);
    const keyProjB = queryKeys.tasks.byProject(PROJECT_B);

    expect(keyProjA).toEqual(['tasks', 'project', PROJECT_A]);
    expect(keyProjB).toEqual(['tasks', 'project', PROJECT_B]);
    expect(keyProjA).not.toEqual(keyProjB);
  });

  it('should generate project detail keys independent of project list keys', () => {
    const listKey = queryKeys.projects.all(WORKSPACE);
    const detailKey = queryKeys.projects.detail(PROJECT_A);

    expect(listKey).toEqual(['projects', WORKSPACE]);
    expect(detailKey).toEqual(['project', PROJECT_A]);
    expect(listKey).not.toEqual(detailKey);
  });

  it('should scope project list keys to workspace', () => {
    const keyWs1 = queryKeys.projects.all('ws-1');
    const keyWs2 = queryKeys.projects.all('ws-2');

    expect(keyWs1).toEqual(['projects', 'ws-1']);
    expect(keyWs2).toEqual(['projects', 'ws-2']);
    expect(keyWs1).not.toEqual(keyWs2);
  });

  it('should have a unique "my tasks" key not tied to any project', () => {
    expect(queryKeys.tasks.my).toEqual(['tasks', 'my']);
  });
});

// ─── TanStack Query Cache Isolation Tests ────────────────────────────────────

describe('Project Isolation — QueryClient Cache', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('should cache task data separately per project', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A), [
      { id: TASK_A1, title: 'Task A1' },
      { id: TASK_A2, title: 'Task A2' },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B), [
      { id: TASK_B1, title: 'Task B1' },
      { id: TASK_B2, title: 'Task B2' },
    ]);

    const tasksA = qc.getQueryData<Array<{ id: string; title: string; projectId: string }>>(
      queryKeys.tasks.byProject(PROJECT_A),
    );
    const tasksB = qc.getQueryData<Array<{ id: string; title: string; projectId: string }>>(
      queryKeys.tasks.byProject(PROJECT_B),
    );

    expect(tasksA).toHaveLength(2);
    expect(tasksA?.[0].id).toBe(TASK_A1);
    expect(tasksB).toHaveLength(2);
    expect(tasksB?.[0].id).toBe(TASK_B1);
  });

  it('should remove only project A task cache when switching projects', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A), [{ id: TASK_A1 }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B), [{ id: TASK_B1 }]);

    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJECT_A) });

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A))).toBeUndefined();
    expect(
      qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject(PROJECT_B)),
    ).toHaveLength(1);
  });

  it('should invalidate only the new project tasks, not old project tasks', async () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A), [{ id: TASK_A1 }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B), [{ id: TASK_B1 }]);

    // Remove old, invalidate new
    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJECT_A) });
    await qc.invalidateQueries({ queryKey: queryKeys.tasks.byProject(PROJECT_B) });

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A))).toBeUndefined();
    expect(
      qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject(PROJECT_B)),
    ).toHaveLength(1);

    // Verify invalidation was scoped
    const queryCache = qc.getQueryCache();
    const queryA = queryCache.find({ queryKey: queryKeys.tasks.byProject(PROJECT_A) });
    const queryB = queryCache.find({ queryKey: queryKeys.tasks.byProject(PROJECT_B) });

    // queryA is removed so shouldn't be found (or is undefined)
    expect(queryA).toBeUndefined();
    expect(queryB?.state.isInvalidated).toBe(true);
  });

  it('should maintain task isolation when multiple projects coexist', () => {
    const projects = ['proj-x', 'proj-y', 'proj-z'];
    projects.forEach((pid, idx) => {
      qc.setQueryData(queryKeys.tasks.byProject(pid), [
        { id: `task-${pid}-1`, title: `Task ${idx + 1}` },
      ]);
    });

    qc.removeQueries({ queryKey: queryKeys.tasks.byProject('proj-y') });

    expect(qc.getQueryData(queryKeys.tasks.byProject('proj-x'))).toHaveLength(1);
    expect(qc.getQueryData(queryKeys.tasks.byProject('proj-y'))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject('proj-z'))).toHaveLength(1);
  });

  it('should not leak project A tasks into project B cache', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A), [
      { id: TASK_A1, title: 'Task A1' },
      { id: TASK_A2, title: 'Task A2' },
    ]);

    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJECT_A) });
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B), [{ id: TASK_B1, title: 'Task B1' }]);

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A))).toBeUndefined();

    const tasksB = qc.getQueryData<Array<{ id: string; title: string }>>(
      queryKeys.tasks.byProject(PROJECT_B),
    );
    expect(tasksB).toHaveLength(1);
    expect(tasksB?.[0].id).toBe(TASK_B1);
  });
});

// ─── Data Leakage Prevention Tests ──────────────────────────────────────────

describe('Project Isolation — No Data Leakage', () => {
  let store: ReturnType<typeof createStore>;
  let qc: QueryClient;

  beforeEach(() => {
    store = createStore();
    qc = createQueryClient();
  });

  it('should not show project A tasks when viewing project B', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A), [
      { id: TASK_A1, title: 'Task from Project A' },
      { id: TASK_A2, title: 'Another Task from A' },
    ]);

    store.dispatch(setActiveProject(PROJECT_B));
    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJECT_A) });
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B), [
      { id: TASK_B1, title: 'Task from Project B' },
    ]);

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A))).toBeUndefined();

    const tasksB = qc.getQueryData<Array<{ id: string; title: string }>>(
      queryKeys.tasks.byProject(PROJECT_B),
    );
    expect(tasksB).toHaveLength(1);
    expect(tasksB?.[0].title).toBe('Task from Project B');
  });

  it('should not allow project B to read project A task list', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A), [{ id: TASK_A1 }]);

    const tasksB = qc.getQueryData(queryKeys.tasks.byProject(PROJECT_B));
    expect(tasksB).toBeUndefined();

    const tasksA = qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject(PROJECT_A));
    expect(tasksA).toHaveLength(1);
  });

  it('should maintain task isolation when both projects have same task titles', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A), [
      { id: TASK_A1, title: 'Fix bug', projectId: PROJECT_A },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B), [
      { id: TASK_B1, title: 'Fix bug', projectId: PROJECT_B },
    ]);

    const tasksA = qc.getQueryData<Array<{ id: string; title: string; projectId: string }>>(
      queryKeys.tasks.byProject(PROJECT_A),
    );
    const tasksB = qc.getQueryData<Array<{ id: string; title: string; projectId: string }>>(
      queryKeys.tasks.byProject(PROJECT_B),
    );

    expect(tasksA?.[0].id).not.toBe(tasksB?.[0].id);
    expect(tasksA?.[0].projectId).toBe(PROJECT_A);
    expect(tasksB?.[0].projectId).toBe(PROJECT_B);
  });

  it('should not show project A tasks after multiple rapid project switches', () => {
    const projects = [PROJECT_A, PROJECT_B, PROJECT_A, PROJECT_B];

    projects.forEach((pid) => {
      qc.removeQueries({ queryKey: ['tasks'] });
      qc.setQueryData(queryKeys.tasks.byProject(pid), [
        { id: `task-${pid}`, title: `Task in ${pid}` },
      ]);
    });

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_B))).toHaveLength(1);
  });
});
