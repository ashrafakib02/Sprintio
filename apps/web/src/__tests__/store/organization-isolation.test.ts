import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient } from '@tanstack/react-query';
import activeOrganizationReducer, {
  setActiveOrganization,
} from '@/store/slices/activeOrganizationSlice';
import activeWorkspaceReducer, { setActiveWorkspace } from '@/store/slices/activeWorkspaceSlice';
import activeProjectReducer, { setActiveProject } from '@/store/slices/activeProjectSlice';
import { queryKeys } from '@/lib/query-keys';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const ORG_A = 'org-aaa-111';
const ORG_B = 'org-bbb-222';
const WORKSPACE_A1 = 'ws-a1';
const WORKSPACE_A2 = 'ws-a2';
const WORKSPACE_B1 = 'ws-b1';
const WORKSPACE_B2 = 'ws-b2';

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

describe('Organization Isolation — Redux Slice', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('should set the active organization ID', () => {
    store.dispatch(setActiveOrganization(ORG_A));
    expect(store.getState().activeOrganization.organizationId).toBe(ORG_A);
  });

  it('should only store a single active organization at a time', () => {
    store.dispatch(setActiveOrganization(ORG_A));
    expect(store.getState().activeOrganization.organizationId).toBe(ORG_A);

    store.dispatch(setActiveOrganization(ORG_B));
    expect(store.getState().activeOrganization.organizationId).toBe(ORG_B);
  });

  it('should not affect workspace state when organization changes', () => {
    store.dispatch(setActiveWorkspace(WORKSPACE_A1));
    store.dispatch(setActiveOrganization(ORG_B));

    expect(store.getState().activeOrganization.organizationId).toBe(ORG_B);
    expect(store.getState().activeWorkspace.workspaceId).toBe(WORKSPACE_A1);
  });

  it('should not affect project state when organization changes', () => {
    store.dispatch(setActiveProject('proj-1'));
    store.dispatch(setActiveOrganization(ORG_B));

    expect(store.getState().activeOrganization.organizationId).toBe(ORG_B);
    expect(store.getState().activeProject.projectId).toBe('proj-1');
  });

  it('should allow resetting organization to null', () => {
    store.dispatch(setActiveOrganization(ORG_A));
    store.dispatch(setActiveOrganization(null));

    expect(store.getState().activeOrganization.organizationId).toBeNull();
  });

  it('should handle organization switch — org A data not persisted in selection', () => {
    store.dispatch(setActiveOrganization(ORG_A));
    expect(store.getState().activeOrganization.organizationId).toBe(ORG_A);

    store.dispatch(setActiveOrganization(ORG_B));
    expect(store.getState().activeOrganization.organizationId).toBe(ORG_B);

    expect(store.getState().activeOrganization.organizationId).not.toBe(ORG_A);
  });

  it('should allow setting the same organization twice without error', () => {
    store.dispatch(setActiveOrganization(ORG_A));
    store.dispatch(setActiveOrganization(ORG_A));

    expect(store.getState().activeOrganization.organizationId).toBe(ORG_A);
  });
});

// ─── Query Key Isolation Tests ───────────────────────────────────────────────

describe('Organization Isolation — Query Key Scoping', () => {
  it('should generate distinct workspace query keys per organization', () => {
    const keyOrgA = queryKeys.workspaces.byOrganization(ORG_A);
    const keyOrgB = queryKeys.workspaces.byOrganization(ORG_B);

    expect(keyOrgA).toEqual(['workspaces', 'byOrganization', ORG_A]);
    expect(keyOrgB).toEqual(['workspaces', 'byOrganization', ORG_B]);
    expect(keyOrgA).not.toEqual(keyOrgB);
  });

  it('should generate workspace detail keys independent of organization', () => {
    const keyWsA = queryKeys.workspaces.detail(WORKSPACE_A1);
    const keyWsB = queryKeys.workspaces.detail(WORKSPACE_B1);

    expect(keyWsA).toEqual(['workspace', WORKSPACE_A1]);
    expect(keyWsB).toEqual(['workspace', WORKSPACE_B1]);
    expect(keyWsA).not.toEqual(keyWsB);
  });

  it('should isolate project keys to workspace scope, not organization scope', () => {
    const projKey1 = queryKeys.projects.all(WORKSPACE_A1);
    const projKey2 = queryKeys.projects.all(WORKSPACE_B1);

    expect(projKey1).toEqual(['projects', WORKSPACE_A1]);
    expect(projKey2).toEqual(['projects', WORKSPACE_B1]);
    expect(projKey1).not.toEqual(projKey2);
  });

  it('should isolate task keys to project scope', () => {
    const taskKey1 = queryKeys.tasks.byProject('proj-a');
    const taskKey2 = queryKeys.tasks.byProject('proj-b');

    expect(taskKey1).toEqual(['tasks', 'project', 'proj-a']);
    expect(taskKey2).toEqual(['tasks', 'project', 'proj-b']);
    expect(taskKey1).not.toEqual(taskKey2);
  });

  it('should produce a unique organizations.all key', () => {
    expect(queryKeys.organizations.all).toEqual(['organizations']);
  });
});

// ─── TanStack Query Cache Isolation Tests ────────────────────────────────────

describe('Organization Isolation — QueryClient Cache', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('should cache workspace data separately per organization', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [
      { id: WORKSPACE_A1, name: 'Workspace A1' },
      { id: WORKSPACE_A2, name: 'Workspace A2' },
    ]);
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [
      { id: WORKSPACE_B1, name: 'Workspace B1' },
      { id: WORKSPACE_B2, name: 'Workspace B2' },
    ]);

    const orgACache = qc.getQueryData<Array<{ id: string; name: string }>>(
      queryKeys.workspaces.byOrganization(ORG_A),
    );
    expect(orgACache).toHaveLength(2);
    expect(orgACache?.[0].id).toBe(WORKSPACE_A1);

    const orgBCache = qc.getQueryData<Array<{ id: string; name: string }>>(
      queryKeys.workspaces.byOrganization(ORG_B),
    );
    expect(orgBCache).toHaveLength(2);
    expect(orgBCache?.[0].id).toBe(WORKSPACE_B1);
  });

  it('should remove only org A workspace cache without affecting org B', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [{ id: WORKSPACE_A1 }]);
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [{ id: WORKSPACE_B1 }]);

    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });

    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_B))).toHaveLength(1);
  });

  it('should remove ALL downstream caches when organization switches', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [{ id: WORKSPACE_A1 }]);
    qc.setQueryData(queryKeys.workspaces.detail(WORKSPACE_A1), {
      id: WORKSPACE_A1,
      name: 'Workspace A1',
    });
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A1), [{ id: 'proj-1', name: 'Project 1' }]);
    qc.setQueryData(queryKeys.tasks.byProject('proj-1'), [{ id: 'task-1', title: 'Task 1' }]);

    // Simulate org switch
    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.removeQueries({ queryKey: ['workspace'] });
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.workspaces.detail(WORKSPACE_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.projects.all(WORKSPACE_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject('proj-1'))).toBeUndefined();
  });

  it('should not leak Org A workspace data when Org B data is fetched', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [
      { id: WORKSPACE_A1, name: 'WS A1' },
      { id: WORKSPACE_A2, name: 'WS A2' },
    ]);

    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [
      { id: WORKSPACE_B1, name: 'WS B1' },
    ]);

    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toBeUndefined();

    const orgBCache = qc.getQueryData<Array<{ id: string }>>(
      queryKeys.workspaces.byOrganization(ORG_B),
    );
    expect(orgBCache).toHaveLength(1);
    expect(orgBCache?.[0].id).toBe(WORKSPACE_B1);
  });

  it('should isolate workspace detail caches between organizations', () => {
    qc.setQueryData(queryKeys.workspaces.detail(WORKSPACE_A1), {
      id: WORKSPACE_A1,
      organizationId: ORG_A,
    });
    qc.setQueryData(queryKeys.workspaces.detail(WORKSPACE_B1), {
      id: WORKSPACE_B1,
      organizationId: ORG_B,
    });

    const wsA = qc.getQueryData<{ organizationId: string }>(
      queryKeys.workspaces.detail(WORKSPACE_A1),
    );
    const wsB = qc.getQueryData<{ organizationId: string }>(
      queryKeys.workspaces.detail(WORKSPACE_B1),
    );

    expect(wsA?.organizationId).toBe(ORG_A);
    expect(wsB?.organizationId).toBe(ORG_B);
  });
});

// ─── Data Leakage Prevention Tests ──────────────────────────────────────────

describe('Organization Isolation — No Data Leakage', () => {
  let store: ReturnType<typeof createStore>;
  let qc: QueryClient;

  beforeEach(() => {
    store = createStore();
    qc = createQueryClient();
  });

  it('should not show Org A tasks when viewing Org B', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [{ id: WORKSPACE_A1 }]);
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A1), [{ id: 'proj-a1', name: 'Project A1' }]);
    qc.setQueryData(queryKeys.tasks.byProject('proj-a1'), [
      { id: 'task-a1', title: 'Task from Org A' },
    ]);

    // Switch to Org B
    store.dispatch(setActiveOrganization(ORG_B));
    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.removeQueries({ queryKey: ['workspace'] });
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [{ id: WORKSPACE_B1 }]);
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_B1), [{ id: 'proj-b1', name: 'Project B1' }]);
    qc.setQueryData(queryKeys.tasks.byProject('proj-b1'), [
      { id: 'task-b1', title: 'Task from Org B' },
    ]);

    expect(qc.getQueryData(queryKeys.tasks.byProject('proj-a1'))).toBeUndefined();

    const orgBTasks = qc.getQueryData<Array<{ id: string; title: string }>>(
      queryKeys.tasks.byProject('proj-b1'),
    );
    expect(orgBTasks).toHaveLength(1);
    expect(orgBTasks?.[0].title).toBe('Task from Org B');
  });

  it('should not allow Org B to read Org A workspace list via query keys', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [{ id: WORKSPACE_A1 }]);

    const orgBCache = qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_B));
    expect(orgBCache).toBeUndefined();

    const orgACache = qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A));
    expect(orgACache).toHaveLength(1);
  });

  it('should prevent task data from Org A appearing in Org B project cache', () => {
    qc.setQueryData(queryKeys.projects.all(WORKSPACE_A1), [{ id: 'proj-a', name: 'Project A' }]);
    qc.setQueryData(queryKeys.tasks.byProject('proj-a'), [{ id: 'task-a', title: 'Task A' }]);

    qc.setQueryData(queryKeys.projects.all(WORKSPACE_B1), [{ id: 'proj-b', name: 'Project B' }]);
    qc.setQueryData(queryKeys.tasks.byProject('proj-b'), [{ id: 'task-b', title: 'Task B' }]);

    const orgBTasks = qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject('proj-b'));
    expect(orgBTasks?.every((t) => t.id !== 'task-a')).toBe(true);

    const orgATasks = qc.getQueryData<Array<{ id: string }>>(queryKeys.tasks.byProject('proj-a'));
    expect(orgATasks?.every((t) => t.id !== 'task-b')).toBe(true);
  });
});
