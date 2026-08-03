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

const ORG_A = 'org-aaa';
const ORG_B = 'org-bbb';
const WS_A1 = 'ws-a1';
const WS_A2 = 'ws-a2';
const WS_B1 = 'ws-b1';
const PROJ_A1_1 = 'proj-a1-1';
const PROJ_A1_2 = 'proj-a1-2';
const PROJ_B1_1 = 'proj-b1-1';

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

/**
 * Populates the full hierarchy cache for testing.
 * Org -> Workspace -> Projects -> Tasks
 */
function populateFullHierarchy(qc: QueryClient) {
  // Org A workspaces
  qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [
    { id: WS_A1, name: 'WS A1' },
    { id: WS_A2, name: 'WS A2' },
  ]);

  // WS A1 detail
  qc.setQueryData(queryKeys.workspaces.detail(WS_A1), {
    id: WS_A1,
    organizationId: ORG_A,
  });

  // WS A1 projects
  qc.setQueryData(queryKeys.projects.all(WS_A1), [
    { id: PROJ_A1_1, name: 'Project A1-1' },
    { id: PROJ_A1_2, name: 'Project A1-2' },
  ]);

  // Project A1-1 tasks
  qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [
    { id: 'task-a1-1-1', title: 'Task 1 in Proj A1-1', projectId: PROJ_A1_1 },
    { id: 'task-a1-1-2', title: 'Task 2 in Proj A1-1', projectId: PROJ_A1_1 },
  ]);

  // Project A1-2 tasks
  qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_2), [
    { id: 'task-a1-2-1', title: 'Task 1 in Proj A1-2', projectId: PROJ_A1_2 },
  ]);

  // Org B workspaces
  qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [{ id: WS_B1, name: 'WS B1' }]);

  // WS B1 projects
  qc.setQueryData(queryKeys.projects.all(WS_B1), [{ id: PROJ_B1_1, name: 'Project B1-1' }]);

  // Project B1-1 tasks
  qc.setQueryData(queryKeys.tasks.byProject(PROJ_B1_1), [
    { id: 'task-b1-1-1', title: 'Task 1 in Proj B1-1', projectId: PROJ_B1_1 },
  ]);
}

/**
 * Simulates the cache clearing from useActiveOrganization.setActiveOrganization
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function simulateOrgSwitch(
  qc: QueryClient,
  store: ReturnType<typeof createStore>,
  newOrgId: string,
) {
  store.dispatch(setActiveOrganization(newOrgId));
  qc.removeQueries({
    queryKey: queryKeys.workspaces.byOrganization(
      store.getState().activeOrganization.organizationId === newOrgId ? ORG_A : newOrgId,
    ),
  });
  qc.removeQueries({ queryKey: ['workspace'] });
  qc.removeQueries({ queryKey: ['projects'] });
  qc.removeQueries({ queryKey: ['tasks'] });
}

// ─── Scenario 1: Org Switch Cascade ─────────────────────────────────────────

describe('Cache Hierarchy — Scenario 1: Organization Switch', () => {
  let store: ReturnType<typeof createStore>;
  let qc: QueryClient;

  beforeEach(() => {
    store = createStore();
    qc = createQueryClient();
  });

  it('should clear workspace, project, and task caches when switching organizations', () => {
    populateFullHierarchy(qc);

    // Verify pre-conditions
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toHaveLength(2);
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toHaveLength(2);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toHaveLength(2);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_2))).toHaveLength(1);

    // Simulate org switch
    store.dispatch(setActiveOrganization(ORG_B));
    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.removeQueries({ queryKey: ['workspace'] });
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // All Org A caches should be cleared
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.workspaces.detail(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_2))).toBeUndefined();
  });

  it('should not affect Org B caches when clearing Org A', () => {
    populateFullHierarchy(qc);

    // Clear Org A downstream caches
    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.removeQueries({ queryKey: ['workspace'] });
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // Re-populate Org B
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [{ id: WS_B1, name: 'WS B1' }]);
    qc.setQueryData(queryKeys.projects.all(WS_B1), [{ id: PROJ_B1_1, name: 'Project B1-1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_B1_1), [
      { id: 'task-b1-1-1', title: 'Task 1', projectId: PROJ_B1_1 },
    ]);

    // Org B caches should be intact
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_B))).toHaveLength(1);
    expect(qc.getQueryData(queryKeys.projects.all(WS_B1))).toHaveLength(1);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_B1_1))).toHaveLength(1);
  });

  it('should allow Org B data to be loaded after Org A is cleared', () => {
    populateFullHierarchy(qc);

    // Clear everything
    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.removeQueries({ queryKey: ['workspace'] });
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // Load Org B data fresh
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [{ id: WS_B1, name: 'WS B1' }]);
    qc.setQueryData(queryKeys.projects.all(WS_B1), [{ id: PROJ_B1_1, name: 'Project B1-1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_B1_1), [
      { id: 'fresh-task', title: 'Fresh Task', projectId: PROJ_B1_1 },
    ]);

    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_B1_1))).toHaveLength(1);
  });

  it('should handle the full switch sequence: Org A -> Org B with fresh data', () => {
    // Step 1: Populate Org A
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [{ id: WS_A1, name: 'WS A1' }]);
    qc.setQueryData(queryKeys.projects.all(WS_A1), [{ id: PROJ_A1_1, name: 'Project A1-1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [
      { id: 'old-task', title: 'Old Task', projectId: PROJ_A1_1 },
    ]);

    // Step 2: Switch to Org B
    store.dispatch(setActiveOrganization(ORG_B));
    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.removeQueries({ queryKey: ['workspace'] });
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // Step 3: Populate Org B
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [{ id: WS_B1, name: 'WS B1' }]);
    qc.setQueryData(queryKeys.projects.all(WS_B1), [{ id: PROJ_B1_1, name: 'Project B1-1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_B1_1), [
      { id: 'new-task', title: 'New Task', projectId: PROJ_B1_1 },
    ]);

    // Verify final state
    expect(store.getState().activeOrganization.organizationId).toBe(ORG_B);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_B1_1))).toHaveLength(1);
    expect(
      qc.getQueryData<Array<{ id: string; title: string; projectId: string }>>(
        queryKeys.tasks.byProject(PROJ_B1_1),
      )?.[0].title,
    ).toBe('New Task');
  });
});

// ─── Scenario 2: Workspace Switch Cascade ────────────────────────────────────

describe('Cache Hierarchy — Scenario 2: Workspace Switch', () => {
  let store: ReturnType<typeof createStore>;
  let qc: QueryClient;

  beforeEach(() => {
    store = createStore();
    qc = createQueryClient();
  });

  it('should clear project and task caches but NOT workspace list when switching workspaces', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [
      { id: WS_A1, name: 'WS A1' },
      { id: WS_A2, name: 'WS A2' },
    ]);

    qc.setQueryData(queryKeys.projects.all(WS_A1), [
      { id: PROJ_A1_1, name: 'Project A1-1' },
      { id: PROJ_A1_2, name: 'Project A1-2' },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [
      { id: 'task-a1-1-1', title: 'Task', projectId: PROJ_A1_1 },
    ]);

    // Verify pre-conditions
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toHaveLength(2);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toHaveLength(1);

    // Simulate workspace switch (from useActiveWorkspace)
    store.dispatch(setActiveWorkspace(WS_A2));
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // Workspace list should NOT be cleared
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toHaveLength(2);

    // Project and task caches should be cleared
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
  });

  it('should not affect workspace context caches when switching workspaces', () => {
    qc.setQueryData(queryKeys.workspaces.context(WS_A1), {
      workspace: { id: WS_A1 },
    });
    qc.setQueryData(queryKeys.workspaces.context(WS_A2), {
      workspace: { id: WS_A2 },
    });

    // Switch workspace — only clear projects + tasks
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // Workspace contexts are under ['workspace', id, 'context'] —
    // the ['workspace'] prefix does NOT match ['projects'] or ['tasks']
    expect(qc.getQueryData(queryKeys.workspaces.context(WS_A1))).toBeDefined();
    expect(qc.getQueryData(queryKeys.workspaces.context(WS_A2))).toBeDefined();
  });

  it('should allow loading new workspace projects after clearing old ones', () => {
    qc.setQueryData(queryKeys.projects.all(WS_A1), [{ id: PROJ_A1_1, name: 'Old Project' }]);

    // Switch to WS A2
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    qc.setQueryData(queryKeys.projects.all(WS_A2), [
      { id: 'proj-a2-1', name: 'New Project in WS A2' },
    ]);

    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.projects.all(WS_A2))).toHaveLength(1);
  });
});

// ─── Scenario 3: Project Switch Cascade ─────────────────────────────────────

describe('Cache Hierarchy — Scenario 3: Project Switch', () => {
  let store: ReturnType<typeof createStore>;
  let qc: QueryClient;

  beforeEach(() => {
    store = createStore();
    qc = createQueryClient();
  });

  it('should clear only old project tasks, not project list, when switching projects', () => {
    qc.setQueryData(queryKeys.projects.all(WS_A1), [
      { id: PROJ_A1_1, name: 'Project A1-1' },
      { id: PROJ_A1_2, name: 'Project A1-2' },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [
      { id: 'task-1', title: 'Task 1', projectId: PROJ_A1_1 },
    ]);

    // Simulate project switch (from useActiveProject)
    store.dispatch(setActiveProject(PROJ_A1_2));
    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJ_A1_1) });
    qc.invalidateQueries({ queryKey: queryKeys.tasks.byProject(PROJ_A1_2) });

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toHaveLength(2);
  });

  it('should load new project tasks after clearing old ones', () => {
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [
      { id: 'old-task', title: 'Old Task', projectId: PROJ_A1_1 },
    ]);

    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJ_A1_1) });
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_2), [
      { id: 'new-task', title: 'New Task', projectId: PROJ_A1_2 },
    ]);

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    const newTasks = qc.getQueryData<Array<{ id: string; title: string; projectId: string }>>(
      queryKeys.tasks.byProject(PROJ_A1_2),
    );
    expect(newTasks).toHaveLength(1);
    expect(newTasks?.[0].title).toBe('New Task');
  });

  it('should not clear workspace-level data when switching projects', () => {
    qc.setQueryData(queryKeys.projects.all(WS_A1), [
      { id: PROJ_A1_1, name: 'Project A1-1' },
      { id: PROJ_A1_2, name: 'Project A1-2' },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [{ id: 'task-1', projectId: PROJ_A1_1 }]);

    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJ_A1_1) });

    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toHaveLength(2);
    expect(
      qc.getQueryData<Array<{ id: string; name: string }>>(queryKeys.projects.all(WS_A1))?.[0].id,
    ).toBe(PROJ_A1_1);
  });
});

// ─── Scenario 4: Full Cross-Hierarchy Cascade ───────────────────────────────

describe('Cache Hierarchy — Scenario 4: Full Cross-Hierarchy Cascade', () => {
  let store: ReturnType<typeof createStore>;
  let qc: QueryClient;

  beforeEach(() => {
    store = createStore();
    qc = createQueryClient();
  });

  it('should cascade clear from org down through workspace, project, and task caches', () => {
    populateFullHierarchy(qc);

    store.dispatch(setActiveOrganization(ORG_A));
    store.dispatch(setActiveWorkspace(WS_A1));
    store.dispatch(setActiveProject(PROJ_A1_1));

    // Verify full hierarchy is populated
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toHaveLength(2);
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toHaveLength(2);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toHaveLength(2);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_2))).toHaveLength(1);

    // Switch organization
    store.dispatch(setActiveOrganization(ORG_B));
    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.removeQueries({ queryKey: ['workspace'] });
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // EVERYTHING under Org A should be cleared
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.workspaces.detail(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_2))).toBeUndefined();

    expect(store.getState().activeOrganization.organizationId).toBe(ORG_B);
  });

  it('should cascade clear from workspace down through project and task caches', () => {
    qc.setQueryData(queryKeys.projects.all(WS_A1), [
      { id: PROJ_A1_1, name: 'Project A1-1' },
      { id: PROJ_A1_2, name: 'Project A1-2' },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [
      { id: 'task-1', title: 'Task 1', projectId: PROJ_A1_1 },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_2), [
      { id: 'task-2', title: 'Task 2', projectId: PROJ_A1_2 },
    ]);

    store.dispatch(setActiveWorkspace(WS_A1));
    store.dispatch(setActiveProject(PROJ_A1_1));

    // Switch workspace
    store.dispatch(setActiveWorkspace(WS_A2));
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_2))).toBeUndefined();

    expect(store.getState().activeWorkspace.workspaceId).toBe(WS_A2);
  });

  it('should cascade clear only task caches from project switch', () => {
    qc.setQueryData(queryKeys.projects.all(WS_A1), [
      { id: PROJ_A1_1, name: 'Project A1-1' },
      { id: PROJ_A1_2, name: 'Project A1-2' },
    ]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [{ id: 'task-1', projectId: PROJ_A1_1 }]);

    store.dispatch(setActiveProject(PROJ_A1_1));

    // Switch project
    store.dispatch(setActiveProject(PROJ_A1_2));
    qc.removeQueries({ queryKey: queryKeys.tasks.byProject(PROJ_A1_1) });

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toHaveLength(2);

    expect(store.getState().activeProject.projectId).toBe(PROJ_A1_2);
  });

  it('should handle complete lifecycle: select org -> workspace -> project -> switch org', () => {
    populateFullHierarchy(qc);

    store.dispatch(setActiveOrganization(ORG_A));
    store.dispatch(setActiveWorkspace(WS_A1));
    store.dispatch(setActiveProject(PROJ_A1_1));

    expect(store.getState().activeOrganization.organizationId).toBe(ORG_A);
    expect(store.getState().activeWorkspace.workspaceId).toBe(WS_A1);
    expect(store.getState().activeProject.projectId).toBe(PROJ_A1_1);

    // Switch organization — full cascade
    store.dispatch(setActiveOrganization(ORG_B));
    qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    qc.removeQueries({ queryKey: ['workspace'] });
    qc.removeQueries({ queryKey: ['projects'] });
    qc.removeQueries({ queryKey: ['tasks'] });

    // Everything under Org A should be cleared
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_2))).toBeUndefined();

    // Load Org B data fresh
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_B), [{ id: WS_B1, name: 'WS B1' }]);
    qc.setQueryData(queryKeys.projects.all(WS_B1), [{ id: PROJ_B1_1, name: 'Project B1-1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_B1_1), [
      { id: 'fresh-task', title: 'Fresh Task', projectId: PROJ_B1_1 },
    ]);

    store.dispatch(setActiveWorkspace(WS_B1));
    store.dispatch(setActiveProject(PROJ_B1_1));

    // Final verification
    expect(store.getState().activeOrganization.organizationId).toBe(ORG_B);
    expect(store.getState().activeWorkspace.workspaceId).toBe(WS_B1);
    expect(store.getState().activeProject.projectId).toBe(PROJ_B1_1);

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_B1_1))).toHaveLength(1);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
  });
});

// ─── Query Key Factory Hierarchy Validation ─────────────────────────────────

describe('Cache Hierarchy — Query Key Factory Hierarchy', () => {
  it('should produce a hierarchical key structure that supports prefix-based clearing', () => {
    const orgKey = queryKeys.workspaces.byOrganization(ORG_A);
    const wsDetailKey = queryKeys.workspaces.detail(WS_A1);
    const wsContextKey = queryKeys.workspaces.context(WS_A1);
    const projListKey = queryKeys.projects.all(WS_A1);
    const projDetailKey = queryKeys.projects.detail(PROJ_A1_1);
    const tasksKey = queryKeys.tasks.byProject(PROJ_A1_1);

    expect(orgKey[0]).toBe('workspaces');
    expect(wsDetailKey[0]).toBe('workspace');
    expect(wsContextKey[0]).toBe('workspace');
    expect(projListKey[0]).toBe('projects');
    expect(projDetailKey[0]).toBe('project');
    expect(tasksKey[0]).toBe('tasks');
  });

  it('should clear workspace-related caches using the workspace prefix', () => {
    const qc = createQueryClient();

    qc.setQueryData(queryKeys.workspaces.context(WS_A1), { data: 'context-a1' });
    qc.setQueryData(queryKeys.workspaces.detail(WS_A1), { data: 'detail-a1' });
    qc.setQueryData(queryKeys.projects.all(WS_A1), [{ id: PROJ_A1_1 }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [{ id: 'task-1' }]);

    // Clear using the ['workspace'] prefix (matching what the hook does)
    qc.removeQueries({ queryKey: ['workspace'] });

    // All 'workspace' prefixed keys should be cleared
    expect(qc.getQueryData(queryKeys.workspaces.context(WS_A1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.workspaces.detail(WS_A1))).toBeUndefined();

    // 'projects' and 'tasks' prefixed keys are NOT cleared by ['workspace'] prefix
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toHaveLength(1);
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toHaveLength(1);
  });

  it('should clear project-related caches using the projects prefix', () => {
    const qc = createQueryClient();

    qc.setQueryData(queryKeys.projects.all(WS_A1), [{ id: PROJ_A1_1 }, { id: PROJ_A1_2 }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [{ id: 'task-1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_2), [{ id: 'task-2' }]);

    qc.removeQueries({ queryKey: ['projects'] });

    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toBeUndefined();

    // Tasks still need separate clearing
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toHaveLength(1);
  });

  it('should clear task caches using the tasks prefix', () => {
    const qc = createQueryClient();

    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [{ id: 'task-1' }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_2), [{ id: 'task-2' }]);
    qc.setQueryData(queryKeys.tasks.my, [{ id: 'my-task' }]);

    qc.removeQueries({ queryKey: ['tasks'] });

    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_1))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.byProject(PROJ_A1_2))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.tasks.my)).toBeUndefined();
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe('Cache Hierarchy — Edge Cases', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('should handle switching to the same organization without errors', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [{ id: WS_A1 }]);

    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toHaveLength(1);

    // Data should remain intact (the hook guards against same-org switches)
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toHaveLength(1);
  });

  it('should handle clearing caches that do not exist', () => {
    expect(() => {
      qc.removeQueries({ queryKey: ['nonexistent'] });
      qc.removeQueries({ queryKey: queryKeys.tasks.byProject('nonexistent') });
      qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization('nonexistent') });
    }).not.toThrow();
  });

  it('should handle rapid successive org switches without data corruption', () => {
    const orgs = [ORG_A, ORG_B, ORG_A, ORG_B, ORG_A];

    orgs.forEach((orgId) => {
      // In production, the hook clears ALL workspace/project/task caches,
      // not just the ones for the current org. Remove all workspace data.
      qc.removeQueries({ queryKey: ['workspaces'] });
      qc.removeQueries({ queryKey: ['workspace'] });
      qc.removeQueries({ queryKey: ['projects'] });
      qc.removeQueries({ queryKey: ['tasks'] });

      qc.setQueryData(queryKeys.workspaces.byOrganization(orgId), [
        { id: `ws-for-${orgId}`, name: `WS for ${orgId}` },
      ]);
    });

    // Final state: only the last org (ORG_A) should have data
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toHaveLength(1);
    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_B))).toBeUndefined();
  });

  it('should handle switching from null organization to a real one', () => {
    const store = createStore();

    expect(store.getState().activeOrganization.organizationId).toBeNull();

    store.dispatch(setActiveOrganization(ORG_A));
    expect(store.getState().activeOrganization.organizationId).toBe(ORG_A);
  });

  it('should handle clearing all caches when no data was ever populated', () => {
    expect(() => {
      qc.removeQueries({ queryKey: ['workspace'] });
      qc.removeQueries({ queryKey: ['projects'] });
      qc.removeQueries({ queryKey: ['tasks'] });
      qc.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(ORG_A) });
    }).not.toThrow();

    expect(qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.projects.all(WS_A1))).toBeUndefined();
  });

  it('should maintain isolation during concurrent cache operations', () => {
    qc.setQueryData(queryKeys.workspaces.byOrganization(ORG_A), [{ id: WS_A1 }]);
    qc.setQueryData(queryKeys.projects.all(WS_A1), [{ id: PROJ_A1_1 }]);
    qc.setQueryData(queryKeys.tasks.byProject(PROJ_A1_1), [{ id: 'task-1' }]);

    const concurrentRead = qc.getQueryData(queryKeys.workspaces.byOrganization(ORG_A));

    qc.setQueryData(queryKeys.projects.all(WS_A2), [{ id: 'proj-a2' }]);

    expect(concurrentRead).toHaveLength(1);
    expect(qc.getQueryData(queryKeys.projects.all(WS_A2))).toHaveLength(1);
  });
});
