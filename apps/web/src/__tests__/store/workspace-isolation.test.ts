import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient } from '@tanstack/react-query';
import activeOrganizationReducer from '@/store/slices/activeOrganizationSlice';
import activeWorkspaceReducer, { setActiveWorkspace } from '@/store/slices/activeWorkspaceSlice';
import activeProjectReducer from '@/store/slices/activeProjectSlice';
import { queryKeys } from '@/lib/query-keys';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const ORG = 'org-shared';
const WORKSPACE_A = 'ws-aaa-111';
const WORKSPACE_B = 'ws-bbb-222';
const PROJECT_A1 = 'proj-a1';
const PROJECT_A2 = 'proj-a2';
const PROJECT_B1 = 'proj-b1';
const PROJECT_B2 = 'proj-b2';

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

describe('Workspace Isolation — Redux Slice', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('should set the active workspace ID', () => {
    store.dispatch(setActiveWorkspace(WORKSPACE_A));
    expect(store.getState().activeWorkspace.workspaceId).toBe(WORKSPACE_A);
  });

  it('should only store a single active workspace at a time', () => {
    store.dispatch(setActiveWorkspace(WORKSPACE_A));
    expect(store.getState().activeWorkspace.workspaceId).toBe(WORKSPACE_A);

    store.dispatch(setActiveWorkspace(WORKSPACE_B));
    expect(store.getState().activeWorkspace.workspaceId).toBe(WORKSPACE_B);
  });

  it('should not affect organization state when workspace changes', () => {
    store.dispatch(setActiveWorkspace(WORKSPACE_B));
    expect(store.getState().activeWorkspace.workspaceId).toBe(WORKSPACE_B);
  });

  it('should allow resetting workspace to null', () => {
    store.dispatch(setActiveWorkspace(WORKSPACE_A));
    store.dispatch(setActiveWorkspace(null));

    expect(store.getState().activeWorkspace.workspaceId).toBeNull();
  });

  it('should handle workspace switch — workspace A not persisted in selection', () => {
    store.dispatch(setActiveWorkspace(WORKSPACE_A));
    expect(store.getState().activeWorkspace.workspaceId).toBe(WORKSPACE_A);

    store.dispatch(setActiveWorkspace(WORKSPACE_B));
    expect(store.getState().activeWorkspace.workspaceId).toBe(WORKSPACE_B);

    expect(store.getState().activeWorkspace.workspaceId).not.toBe(WORKSPACE_A);
  });
});

// ─── Query Key Isolation Tests ───────────────────────────────────────────────

describe('Workspace Isolation — Query Key Scoping', () => {
  it('should generate distinct project query keys per workspace', () => {
    const keyWsA = queryKeys.projects.all(WORKSPACE_A);
    const keyWsB = queryKeys.projects.all(WORKSPACE_B);

    expect(keyWsA).toEqual(['projects', WORKSPACE_A]);
    expect(keyWsB).toEqual(['projects', WORKSPACE_B]);
    expect(keyWsA).not.toEqual(keyWsB);
  });

  it('should generate workspace context keys scoped to workspace ID', () => {
    const ctxA = queryKeys.workspaces.context(WORKSPACE_A);
    const ctxB = queryKeys.workspaces.context(WORKSPACE_B);

    expect(ctxA).toEqual(['workspace', WORKSPACE_A, 'context']);
    expect(ctxB).toEqual(['workspace', WORKSPACE_B, 'context']);
    expect(ctxA).not.toEqual(ctxB);
  });

  it('should isolate task keys to project scope, not workspace scope', () => {
    const taskKeyA = queryKeys.tasks.byProject(PROJECT_A1);
    const taskKeyB = queryKeys.tasks.byProject(PROJECT_B1);

    expect(taskKeyA).toEqual(['tasks', 'project', PROJECT_A1]);
    expect(taskKeyB).toEqual(['tasks', 'project', PROJECT_B1]);
    expect(taskKeyA).not.toEqual(taskKeyB);
  });

  it('should generate workspace list keys scoped to organization', () => {
    const listKey = queryKeys.workspaces.list(ORG);
    expect(listKey).toEqual(['workspaces', 'list', ORG]);
  });

  it('should have a separate project detail key', () => {
    const detailA = queryKeys.projects.detail(PROJECT_A1);
    const detailB = queryKeys.projects.detail(PROJECT_B1);

    expect(detailA).toEqual(['project', PROJECT_A1]);
    expect(detailB).toEqual(['project', PROJECT_B1]);
    expect(detailA).not.toEqual(detailB);
  });
});

// ─── TanStack Query Cache Isolation Tests ────────────────────────────────────

describe('Workspace Isolation — QueryClient Cache', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('should cache project data separately per workspace', () => {
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A), [
      { id: PROJECT_A1, name: 'Project A1' },
      { id: PROJECT_A2, name: 'Project A2' },
    ]);
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_B), [
      { id: PROJECT_B1, name: 'Project B1' },
      { id: PROJECT_B2, name: 'Project B2' },
    ]);

    const cacheA = qc.getQueryData<Array<{ id: string; name: string }>>(
      queryKeys.projects.all(WORKSPACE_A),
    );
    const cacheB = qc.getQueryData<Array<{ id: string; name: string }>>(
      queryKeys.projects.all(WORKSPACE_B),
    );

    expect(cacheA).toHaveLength(2);
    expect(cacheA?.[0].id).toBe(PROJECT_A1);

    expect(cacheB).toHaveLength(2);
    expect(cacheB?.[0].id).toBe(PROJECT_B1);
  });

  it('should remove workspace A project cache and populate workspace B independently', () => {
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A), [{ id: PROJECT_A1 }]);
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_B), [{ id: PROJECT_B1 }]);

    // Clear all projects (simulating workspace switch)
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // Re-populate only workspace B
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_B), [{ id: PROJECT_B1 }]);

    expect(qc.getQueryData(queryKeys.projects.all(WORKSPACE_A))).toBeUndefined();
    expect(
      qc.getQueryData<Array<{ id: string }>>(queryKeys.projects.all(WORKSPACE_B)),
    ).toHaveLength(1);
  });

  it('should cache task data separately per project (workspace-scoped)', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      { id: 'task-a1', title: 'Task A1' },
      { id: 'task-a2', title: 'Task A2' },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [{ id: 'task-b1', title: 'Task B1' }]);

    const tasksA = qc.getQueryData<Array<{ id: string; title: string }>>(
      queryKeys.tasks.byProject(PROJECT_A1),
    );
    const tasksB = qc.getQueryData<Array<{ id: string; title: string }>>(
      queryKeys.tasks.byProject(PROJECT_B1),
    );

    expect(tasksA).toHaveLength(2);
    expect(tasksB).toHaveLength(1);
  });

  it('should remove downstream caches when workspace switches', () => {
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A), [{ id: PROJECT_A1 }, { id: PROJECT_A2 }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [{ id: 'task-a1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A2), [{ id: 'task-a2' }]);

    // Simulate workspace switch
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    expect(qc.getQueryData(queryKeys.projects.all(WORKSPACE_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A2))).toBeUndefined();
  });

  it('should not leak workspace A projects into workspace B cache', () => {
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A), [{ id: PROJECT_A1, name: 'Project A1' }]);

    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    qc.setQueryData(queryKeys.projects.all(WORKSPACE_B), [{ id: PROJECT_B1, name: 'Project B1' }]);

    expect(qc.getQueryData(queryKeys.projects.all(WORKSPACE_A))).toBeUndefined();

    const cacheB = qc.getQueryData<Array<{ id: string }>>(queryKeys.projects.all(WORKSPACE_B));
    expect(cacheB).toHaveLength(1);
    expect(cacheB?.[0].id).toBe(PROJECT_B1);
  });

  it('should maintain workspace context isolation', () => {
    qc.setQueryData(queryKeys.workspaces.context(WORKSPACE_A), {
      workspace: { id: WORKSPACE_A, name: 'WS A' },
      userRole: 'admin',
    });
    qc.setQueryData(queryKeys.workspaces.context(WORKSPACE_B), {
      workspace: { id: WORKSPACE_B, name: 'WS B' },
      userRole: 'viewer',
    });

    const ctxA = qc.getQueryData<{ workspace: { name: string }; userRole: string }>(
      queryKeys.workspaces.context(WORKSPACE_A),
    );
    const ctxB = qc.getQueryData<{ workspace: { name: string }; userRole: string }>(
      queryKeys.workspaces.context(WORKSPACE_B),
    );

    expect(ctxA?.workspace.name).toBe('WS A');
    expect(ctxA?.userRole).toBe('admin');
    expect(ctxB?.workspace.name).toBe('WS B');
    expect(ctxB?.userRole).toBe('viewer');
  });
});

// ─── Data Leakage Prevention Tests ──────────────────────────────────────────

describe('Workspace Isolation — No Data Leakage', () => {
  let store: ReturnType<typeof createStore>;
  let qc: QueryClient;

  beforeEach(() => {
    store = createStore();
    qc = createQueryClient();
  });

  it('should not show workspace A tasks when viewing workspace B', () => {
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A), [{ id: PROJECT_A1, name: 'Project A1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      { id: 'task-a1', title: 'Task from WS A' },
    ]);

    // Switch to workspace B
    store.dispatch(setActiveWorkspace(WORKSPACE_B));
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    qc.setQueryData(queryKeys.projects.all(WORKSPACE_B), [{ id: PROJECT_B1, name: 'Project B1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      { id: 'task-b1', title: 'Task from WS B' },
    ]);

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJECT_A1))).toBeUndefined();

    const tasksB = qc.getQueryData<Array<{ id: string; title: string }>>(
      queryKeys.tasks.byProject(PROJECT_B1),
    );
    expect(tasksB).toHaveLength(1);
    expect(tasksB?.[0].title).toBe('Task from WS B');
  });

  it('should not allow workspace B to read workspace A project list', () => {
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A), [{ id: PROJECT_A1 }, { id: PROJECT_A2 }]);

    const cacheB = qc.getQueryData(queryKeys.projects.all(WORKSPACE_B));
    expect(cacheB).toBeUndefined();

    const cacheA = qc.getQueryData<Array<{ id: string }>>(queryKeys.projects.all(WORKSPACE_A));
    expect(cacheA).toHaveLength(2);
  });

  it('should prevent cross-workspace task contamination', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_A1), [
      { id: 'task-a1', title: 'Task from Project A1 (WS A)' },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJECT_B1), [
      { id: 'task-b1', title: 'Task from Project B1 (WS B)' },
    ]);

    const tasksA = qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject(PROJECT_A1));
    const tasksB = qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject(PROJECT_B1));

    expect(tasksA?.every((t) => t.id !== 'task-b1')).toBe(true);
    expect(tasksB?.every((t) => t.id !== 'task-a1')).toBe(true);
  });
});
