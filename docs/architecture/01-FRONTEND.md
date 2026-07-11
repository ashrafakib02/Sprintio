# Sprintio — Frontend Architecture

---

| Field         | Value                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Document Type | Frontend Architecture                                                                                                                                                                                        |
| Product       | Sprintio — Sprint fast. Ship together.                                                                                                                                                                       |
| Version       | 1.0                                                                                                                                                                                                          |
| Status        | Finalized                                                                                                                                                                                                    |
| Date          | 2026-07-08                                                                                                                                                                                                   |
| Author        | Engineering Team                                                                                                                                                                                             |
| Related Docs  | [MVP Definition](../MVP_DEFINITION.md), [PRD](../PRD.md), [Design System](../Design-System/DESIGN-SYSTEM-CONSOLIDATED.md), [NFRs](../NON_FUNCTIONAL_REQUIREMENTS.md), [Future Roadmap](../FUTURE_ROADMAP.md) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Application Shell](#2-application-shell)
3. [Routing Architecture](#3-routing-architecture)
4. [State Management](#4-state-management)
5. [Data Fetching](#5-data-fetching)
6. [Real-time Sync](#6-real-time-sync)
7. [Component Architecture](#7-component-architecture)
8. [Rich Text Editor](#8-rich-text-editor)
9. [Drag & Drop](#9-drag--drop)
10. [Performance Strategy](#10-performance-strategy)
11. [Error Handling](#11-error-handling)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)
13. [Internationalization](#13-internationalization)
14. [File Structure](#14-file-structure)
15. [Quick Reference Cheat Sheet](#15-quick-reference-cheat-sheet)

---

## 1. Executive Summary

This document defines the complete frontend architecture for Sprintio's web application. It is the single source of truth for how the frontend is structured, how data flows, how real-time collaboration works, and how every component, route, and state interaction is organized.

The frontend is a **React 18 SPA** built with **TypeScript**, **Vite**, **TanStack Router** (file-based routing), **TanStack Query** (server state), **Redux Toolkit** (client state), **Tailwind CSS** (styling), **21st.dev (shadcn/ui-compatible component marketplace)** (component primitives), **TipTap** (rich text), and **Yjs** (CRDT real-time sync).

### Design Principles

| #   | Principle                               | Application                                                                                                                              |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Server state is the source of truth** | TanStack Query owns all server-derived data. Redux Toolkit owns only ephemeral UI state. Never duplicate server data in Redux Toolkit.   |
| 2   | **Offline-first, connected-by-default** | Yjs CRDTs queue local changes. WebSocket syncs when connected. Users never see "offline" banners — work just continues.                  |
| 3   | **Composition over configuration**      | Components are small, focused, and composable. No "god components" with 20+ props.                                                       |
| 4   | **Lazy everything**                     | Routes, heavy components (editor, board, calendar), and panels are lazy-loaded. The initial bundle is under 300KB gzipped (NFR-PERF-13). |
| 5   | **Token-first styling**                 | Every color, spacing, and sizing value references a design token from the 3-layer system. Never raw hex/px/rem in component code.        |
| 6   | **Progressive disclosure**              | The UI reveals complexity only when needed. Default views are simple. Power features (custom fields, automations) are opt-in.            |

---

## 2. Application Shell

The application shell is the persistent layout that wraps all authenticated views. It provides navigation, global UI surfaces, and contextual panels.

### 2.1 Layout Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER BAR (workspace selector, search trigger, notifications,     │
│              user menu, command palette trigger ⌘K)                  │
├──────────┬───────────────────────────────────────────────────────────┤
│          │                                                           │
│  SIDEBAR │                    CONTENT AREA                          │
│          │                                                           │
│  - Work- │  ┌─────────────────────────────────┬──────────────────┐  │
│    space │  │                                 │                  │  │
│    tree  │  │     Main View                   │  AI Panel        │  │
│          │  │     (List / Board / Doc /        │  (Collapsible)   │  │
│  - Nav   │  │      Dashboard)                  │                  │  │
│    links │  │                                 │  - Chat sidebar  │  │
│          │  │                                 │  - Context-aware  │  │
│  - Starred│ │                                 │  - Streaming      │  │
│    items │  │                                 │                  │  │
│          │  └─────────────────────────────────┴──────────────────┘  │
│          │                                                           │
│  ┌───────┤                                                           │
│  │ Collapse│  STATUS BAR (optional: sync status, online indicator)  │
│  │ toggle │                                                           │
└──────────┴───────────────────────────────────────────────────────────┘
│  COMMAND PALETTE (⌘K overlay — modal, search-first)                 │
│  TOAST CONTAINER (bottom-right, stacked)                            │
│  MODAL PORTAL (dialogs, confirmations)                              │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Shell Component Hierarchy

```tsx
// src/app/Root.tsx — The outermost shell
function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            <YjsProvider>
              <RouterProvider router={router} />
              <Toaster position="bottom-right" />
              <CommandPalette />
            </YjsProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// src/routes/__root.tsx — TanStack Router root layout
function RootLayout() {
  const { workspace } = useCurrentWorkspace();

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar workspace={workspace} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <AiPanel />
    </div>
  );
}
```

### 2.3 Shell Surfaces

| Surface             | Component            | Behavior                                                                                                                 | State Owner                          |
| ------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| **Sidebar**         | `<Sidebar />`        | Collapsible (icon-only mode). Workspace tree, nav links, starred items. Resizable width (240px default, 48px collapsed). | RTK (`useAppSelector`/`useDispatch`) |
| **Header**          | `<Header />`         | Workspace name, search trigger, notification bell, user avatar/menu, ⌘K hint. Fixed height (48px).                       | Static                               |
| **Content Area**    | `<Outlet />`         | Router outlet. Fills remaining space. Scrollable.                                                                        | Router                               |
| **AI Panel**        | `<AiPanel />`        | Slide-in from right. 360px width. Context-aware (knows current task/doc). Collapsible.                                   | RTK (`useAppSelector`/`useDispatch`) |
| **Command Palette** | `<CommandPalette />` | Modal overlay. ⌘K opens. Search-first with categorized results. Keyboard navigable.                                      | RTK (`useAppSelector`/`useDispatch`) |
| **Toast Container** | `<Toaster />`        | Bottom-right. Auto-dismiss. Stacked. Supports action buttons.                                                            | React Hot Toast / Sonner             |

### 2.4 Responsive Behavior

| Breakpoint             | Sidebar             | AI Panel                   | Content     | Board View    |
| ---------------------- | ------------------- | -------------------------- | ----------- | ------------- |
| `< 768px` (mobile)     | Hidden (slide-over) | Hidden (full-screen modal) | Full width  | Single column |
| `768–1023px` (tablet)  | Collapsed (icons)   | Hidden (slide-over)        | Full width  | 2 columns     |
| `1024–1439px` (laptop) | Expanded            | Collapsible                | Fills space | 3–4 columns   |
| `≥ 1440px` (desktop)   | Expanded            | Persistent                 | Fills space | 5+ columns    |

---

## 3. Routing Architecture

Sprintio uses **TanStack Router** with file-based routing. Routes are nested to reflect the data hierarchy: Workspace → Space → Folder → List → Task/Doc.

### 3.1 Route Tree

```
/                                          → Redirect to /ws/$workspaceId
├── /auth                                  → Auth layout (login, signup, forgot)
│   ├── /auth/login
│   ├── /auth/signup
│   └── /auth/forgot-password
│
├── /onboarding                            → Onboarding wizard (first-time)
│
└── /ws/$workspaceId                       → Workspace layout (sidebar + header)
    ├── /                                  → Workspace home (recent, my work)
    ├── /settings                          → Workspace settings
    │   ├── /settings/general
    │   ├── /settings/members
    │   ├── /settings/billing
    │   ├── /settings/automations
    │   └── /settings/integrations
    │
    ├── /s/$spaceId                        → Space layout (space nav + content)
    │   ├── /                              → Space home / overview
    │   ├── /list/$listId                  → List view (Table/List/Board)
    │   │   ├── ?view=board                → Board view
    │   │   ├── ?view=list                 → List view
    │   │   ├── ?view=calendar             → Calendar (Phase 2)
    │   │   └── ?view=timeline             → Timeline (Phase 2)
    │   │
    │   ├── /task/$taskId                  → Task detail (slide-over or page)
    │   ├── /doc/$docId                    → Document editor
    │   └── /folder/$folderId              → Folder contents
    │
    ├── /notifications                     → Notification center
    ├── /search                            → Global search results
    └── /me                                → User profile & preferences
```

### 3.2 Route Configuration

```typescript
// src/routeTree.gen.ts (auto-generated by TanStack Router)
// Manual route definitions for key routes:

import { Route, redirect } from '@tanstack/react-router';

// Root route — wraps everything
const rootRoute = new RootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    // Check auth, redirect to /auth/login if not authenticated
    const session = await getSession();
    if (!session && !location.pathname.startsWith('/auth')) {
      throw redirect({ to: '/auth/login' });
    }
  },
});

// Workspace layout — loads workspace context
const workspaceLayout = new Route({
  getParentRoute: () => rootRoute,
  id: 'workspace',
  path: '/ws/$workspaceId',
  component: WorkspaceLayout,
  beforeLoad: async ({ params }) => {
    // Prefetch workspace data, set active workspace
    const workspace = await queryClient.ensureQueryData(workspaceQueryOptions(params.workspaceId));
    return { workspace };
  },
});

// List view — the main working view
const listViewRoute = new Route({
  getParentRoute: () => workspaceLayout,
  path: '/s/$spaceId/list/$listId',
  component: ListView,
  validateSearch: (search) =>
    z
      .object({
        view: z.enum(['board', 'list', 'calendar', 'timeline']).default('list'),
        status: z.string().optional(),
        assignee: z.string().optional(),
        priority: z.string().optional(),
        sort: z.string().optional(),
      })
      .parse(search),
  loader: async ({ params, search }) => {
    // Prefetch list data based on view type
    await queryClient.ensureQueryData(listQueryOptions(params.listId, search));
  },
});
```

### 3.3 Route Loaders & Prefetching

| Route                      | Loader Strategy                                         | Prefetch Target                   |
| -------------------------- | ------------------------------------------------------- | --------------------------------- |
| `/ws/$workspaceId`         | `beforeLoad` — fetch workspace + spaces tree            | Workspace summary, space list     |
| `/s/$spaceId/list/$listId` | `loader` — fetch list tasks based on view/filter params | Task list, filters, view config   |
| `/task/$taskId`            | `loader` — fetch task detail + comments + activity      | Full task, comments, activity log |
| `/doc/$docId`              | `loader` — fetch document + Yjs awareness               | Document content, collaborators   |
| `/settings/*`              | No loader — lazy load settings module                   | Settings data on demand           |

### 3.4 Prefetching Strategy

```typescript
// Prefetch on hover (for sidebar links)
<Link
  to="/s/$spaceId/list/$listId"
  params={{ spaceId, listId }}
  preload="intent"           // Fetch on mouse hover
  preloadDelay={200}         // Debounce 200ms
/>

// Prefetch on focus (for keyboard navigation)
<Link preload="viewport" />  // Fetch when element enters viewport

// Manual prefetch for critical paths
const prefetchList = useCallback(() => {
  queryClient.prefetchQuery(listQueryOptions(listId, filters));
}, [listId, filters]);
```

---

## 4. State Management

Sprintio separates **server state** (TanStack Query) from **client state** (Redux Toolkit). This prevents duplication, stale data, and unnecessary re-renders.

### 4.1 State Ownership Matrix

| State Category                                     | Owner                         | Storage          | Example                                           |
| -------------------------------------------------- | ----------------------------- | ---------------- | ------------------------------------------------- |
| **Server data** (tasks, users, projects)           | TanStack Query                | Query cache      | Task list, user profile, workspace settings       |
| **UI ephemeral state** (sidebar open, panel width) | Redux Toolkit                 | In-memory        | Sidebar collapsed, AI panel open, modal stack     |
| **Form state** (unsubmitted edits)                 | React Hook Form / local state | Component state  | Task edit form, filter builder                    |
| **Real-time state** (cursors, presence)            | Yjs awareness                 | Yjs Doc          | User cursors, selection highlights, online status |
| **Auth state** (token, user session)               | React Context + cookie        | HTTP-only cookie | Current user, workspace role                      |
| **Theme state** (dark/light)                       | Redux Toolkit (redux-persist) | Persisted        | Theme preference, locale                          |

### 4.2 Redux Toolkit Store Definitions

```typescript
// src/slices/sidebar.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

interface SidebarState {
  collapsed: boolean;
  width: number;
  expandedSections: string[];
}

const initialState: SidebarState = {
  collapsed: false,
  width: 240,
  expandedSections: ['spaces', 'starred'],
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    toggle(state) {
      state.collapsed = !state.collapsed;
    },
    setWidth(state, action: PayloadAction<number>) {
      state.width = action.payload;
    },
    toggleSection(state, action: PayloadAction<string>) {
      const section = action.payload;
      const idx = state.expandedSections.indexOf(section);
      if (idx >= 0) {
        state.expandedSections.splice(idx, 1);
      } else {
        state.expandedSections.push(section);
      }
    },
  },
});

export const { toggle, setWidth, toggleSection } = sidebarSlice.actions;

// Persisted reducer — equivalent to persist middleware from the previous stack
export const persistedSidebarReducer = persistReducer(
  { key: 'sprintio-sidebar', storage },
  sidebarSlice.reducer,
);

// src/slices/ai-panel.slice.ts
interface AiPanelState {
  open: boolean;
  width: number;
  context: AiContext | null; // Current task/doc context
  conversationId: string | null;
}

const aiPanelInitialState: AiPanelState = {
  open: false,
  width: 360,
  context: null,
  conversationId: null,
};

const aiPanelSlice = createSlice({
  name: 'aiPanel',
  initialState: aiPanelInitialState,
  reducers: {
    toggle(state) {
      state.open = !state.open;
    },
    setContext(state, action: PayloadAction<AiContext>) {
      state.context = action.payload;
    },
    setConversationId(state, action: PayloadAction<string>) {
      state.conversationId = action.payload;
    },
  },
});

export const { toggle: toggleAiPanel, setContext, setConversationId } = aiPanelSlice.actions;
export const aiPanelReducer = aiPanelSlice.reducer;

// src/slices/command-palette.slice.ts
interface CommandPaletteState {
  open: boolean;
  query: string;
  selectedIndex: number;
}

const commandPaletteInitialState: CommandPaletteState = {
  open: false,
  query: '',
  selectedIndex: 0,
};

const commandPaletteSlice = createSlice({
  name: 'commandPalette',
  initialState: commandPaletteInitialState,
  reducers: {
    openCmd(state) {
      state.open = true;
      state.query = '';
      state.selectedIndex = 0;
    },
    closeCmd(state) {
      state.open = false;
    },
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
      state.selectedIndex = 0;
    },
    setSelectedIndex(state, action: PayloadAction<number>) {
      state.selectedIndex = action.payload;
    },
  },
});

export const { openCmd, closeCmd, setQuery, setSelectedIndex } = commandPaletteSlice.actions;
export const commandPaletteReducer = commandPaletteSlice.reducer;

// src/slices/view-filters.slice.ts
interface ViewFiltersState {
  // Per-list view preferences (persisted to server)
  filters: Record<string, FilterState>;
  sorting: Record<string, SortState>;
  viewMode: Record<string, 'board' | 'list' | 'calendar' | 'timeline'>;
}

const viewFiltersInitialState: ViewFiltersState = {
  filters: {},
  sorting: {},
  viewMode: {},
};

const viewFiltersSlice = createSlice({
  name: 'viewFilters',
  initialState: viewFiltersInitialState,
  reducers: {
    setFilters(state, action: PayloadAction<{ listId: string; filters: FilterState }>) {
      state.filters[action.payload.listId] = action.payload.filters;
    },
    setSorting(state, action: PayloadAction<{ listId: string; sorting: SortState }>) {
      state.sorting[action.payload.listId] = action.payload.sorting;
    },
    setViewMode(state, action: PayloadAction<{ listId: string; mode: string }>) {
      state.viewMode[action.payload.listId] = action.payload
        .mode as ViewFiltersState['viewMode'][string];
    },
  },
});

export const { setFilters, setSorting, setViewMode } = viewFiltersSlice.actions;

export const persistedViewFiltersReducer = persistReducer(
  { key: 'sprintio-view-filters', storage },
  viewFiltersSlice.reducer,
);

// src/store.ts — configureStore assembles all slices
import { configureStore } from '@reduxjs/toolkit';
import { persistStore } from 'redux-persist';

export const store = configureStore({
  reducer: {
    sidebar: persistedSidebarReducer,
    aiPanel: aiPanelReducer,
    commandPalette: commandPaletteReducer,
    viewFilters: persistedViewFiltersReducer,
  },
});

export const persistor = persistStore(store);

// Hooks for type-safe selector/dispatch access
import { useDispatch, useSelector } from 'react-redux';
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

### 4.3 Store Selection Guide

| Question                                             | Answer                                |
| ---------------------------------------------------- | ------------------------------------- |
| Does this data come from the API?                    | → TanStack Query                      |
| Does this data need to persist across sessions?      | → Redux Toolkit (`redux-persist`)     |
| Is this data ephemeral (UI open/close, hover state)? | → Redux Toolkit (no persist)          |
| Is this form data not yet submitted?                 | → React Hook Form or local `useState` |
| Is this real-time collaborative state?               | → Yjs awareness                       |
| Is this auth/session data?                           | → React Context + cookie              |

### 4.4 Anti-Patterns to Avoid

| Anti-Pattern                        | Why It's Bad                                                       | Correct Approach                                |
| ----------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Storing API data in Redux Toolkit   | Duplicates TanStack Query cache, stale data, no background refetch | Use `useQuery` / `useSuspenseQuery`             |
| Redux Toolkit slice with 50+ fields | God slice, hard to reason about, causes unnecessary re-renders     | Split into focused slices by domain             |
| Global state for component-local UI | Unnecessary complexity, hard to test                               | Use `useState` / `useReducer` in component      |
| Storing derived data                | Can be recomputed, wastes memory                                   | Use `useMemo` / selector functions              |
| Mixing auth state with UI state     | Security concerns, different lifecycles                            | Separate Context for auth, Redux Toolkit for UI |

---

## 5. Data Fetching

TanStack Query manages all server-state interactions. Every API call goes through a query or mutation hook with consistent patterns for caching, invalidation, and optimistic updates.

### 5.1 Query Key Convention

Query keys follow a hierarchical pattern that mirrors the data model:

```typescript
// Key factory — every domain has a factory
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
  comments: (taskId: string) => [...taskKeys.detail(taskId), 'comments'] as const,
  activity: (taskId: string) => [...taskKeys.detail(taskId), 'activity'] as const,
};

export const listKeys = {
  all: ['lists'] as const,
  detail: (listId: string) => [...listKeys.all, listId] as const,
  tasks: (listId: string, view: string) => [...listKeys.detail(listId), 'tasks', view] as const,
};

export const workspaceKeys = {
  all: ['workspaces'] as const,
  detail: (id: string) => [...workspaceKeys.all, id] as const,
  spaces: (id: string) => [...workspaceKeys.detail(id), 'spaces'] as const,
};
```

### 5.2 Query Options Factories

```typescript
// src/lib/query-options.ts

// Task list query — used by Board and List views
export function listTasksQueryOptions(listId: string, filters: TaskFilters, sort: SortState) {
  return queryOptions({
    queryKey: taskKeys.list({ listId, ...filters, sort }),
    queryFn: () => api.tasks.list(listId, { filters, sort }),
    staleTime: 30_000, // 30s — data is fresh
    gcTime: 5 * 60_000, // 5min — keep in cache
    placeholderData: keepPreviousData, // Smooth filter transitions
  });
}

// Task detail query — used by task slide-over / page
export function taskDetailQueryOptions(taskId: string) {
  return queryOptions({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => api.tasks.get(taskId),
    staleTime: 10_000, // 10s — task detail updates frequently
    enabled: !!taskId,
  });
}

// Document query — used by editor
export function documentQueryOptions(docId: string) {
  return queryOptions({
    queryKey: ['documents', docId],
    queryFn: () => api.documents.get(docId),
    staleTime: Infinity, // Docs are managed by Yjs CRDT, not polling
    enabled: !!docId,
  });
}
```

### 5.3 Optimistic Updates Pattern

```typescript
// Mutations with optimistic updates for instant UI feedback
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTaskInput) => api.tasks.update(data.id, data),

    // 1. Optimistically update the cache
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(data.id) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData(taskKeys.detail(data.id));

      // Optimistically update
      queryClient.setQueryData(taskKeys.detail(data.id), (old: Task) => ({
        ...old,
        ...data,
      }));

      return { previousTask };
    },

    // 2. If mutation fails, roll back
    onError: (err, data, context) => {
      queryClient.setQueryData(taskKeys.detail(data.id), context?.previousTask);
      toast.error('Failed to update task. Changes reverted.');
    },

    // 3. After success, invalidate to get server truth
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.detail(variables.id),
      });
      // Also invalidate the list view this task belongs to
      queryClient.invalidateQueries({
        queryKey: taskKeys.lists(),
      });
    },
  });
}
```

### 5.4 Cache Invalidation Strategy

| Event                     | Invalidation Scope                            | Rationale                                   |
| ------------------------- | --------------------------------------------- | ------------------------------------------- |
| Task updated              | `taskKeys.detail(id)` + `taskKeys.lists()`    | Task detail + any list containing this task |
| Task created              | `taskKeys.lists()` + `listKeys.tasks(listId)` | List views need refresh                     |
| Task deleted              | `taskKeys.lists()` + `taskKeys.detail(id)`    | Remove from list + clean detail cache       |
| Comment added             | `taskKeys.comments(taskId)`                   | Only comment thread needs refresh           |
| Space renamed             | `workspaceKeys.spaces(wsId)`                  | Sidebar tree needs refresh                  |
| Settings changed          | Specific settings key                         | Only the changed settings section           |
| Real-time update received | Invalidate affected query keys via Yjs sync   | CRDT merge triggers selective invalidation  |

### 5.5 API Client Setup

```typescript
// src/lib/api-client.ts
import { QueryClient } from '@tanstack/query-client';

// Custom fetch wrapper with auth, error handling, retry
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // Send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || 'Request failed');
  }

  return response.json();
}

// Query client with global defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s default
      gcTime: 5 * 60_000, // 5min cache
      retry: 2, // Retry twice on failure
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: true, // Refetch when tab gains focus
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 1,
    },
  },
});
```

---

## 6. Real-time Sync

Sprintio uses **Yjs** (CRDT) for real-time collaborative editing and **WebSocket** for live data updates. The system is designed for offline-first operation with automatic sync on reconnect.

### 6.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  TanStack    │  │  Yjs Doc     │  │  WebSocket           │  │
│  │  Query Cache │  │  (CRDT)      │  │  Connection          │  │
│  │              │  │              │  │                      │  │
│  │  - Tasks     │  │  - Documents │  │  - Task updates      │  │
│  │  - Users     │  │  - Cursors   │  │  - Presence          │  │
│  │  - Settings  │  │  - Presence  │  │  - Notifications     │  │
│  │  - Lists     │  │  - Undo/Redo │  │  - Status changes    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │               │
│         │         ┌────────┴────────┐             │               │
│         │         │  Yjs Provider   │             │               │
│         │         │  (y-websocket / │             │               │
│         │         │   y-webrtc)     │             │               │
│         │         └────────┬────────┘             │               │
│         │                  │                      │               │
└─────────┼──────────────────┼──────────────────────┼───────────────┘
          │                  │                      │
          ▼                  ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND                                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  REST API    │  │  WebSocket   │  │  Redis Pub/Sub       │  │
│  │  (Express)   │  │  Server      │  │  (Fan-out)           │  │
│  │              │  │  (Yjs sync)  │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL + Yjs persistence (y-postgres)                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 WebSocket Connection Management

```typescript
// src/lib/yjs/websocket-provider.ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class SprintioWebSocketManager {
  private providers: Map<string, WebsocketProvider> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 10;

  getProvider(docId: string, doc: Y.Doc): WebsocketProvider {
    if (this.providers.has(docId)) {
      return this.providers.get(docId)!;
    }

    const wsUrl = `${WS_BASE}/yjs/${docId}`;
    const provider = new WebsocketProvider(wsUrl, docId, doc, {
      connect: true,
      params: {
        token: getAuthToken(),
        workspaceId: getCurrentWorkspaceId(),
      },
      resyncInterval: 30_000, // Resync every 30s
      maxBackoffTime: 30_000, // Max 30s between reconnects
    });

    // Connection status events
    provider.on('sync', (synced: boolean) => {
      if (synced) {
        this.reconnectAttempts.set(docId, 0);
        updateSyncStatus('synced');
      }
    });

    provider.on('status', ({ status }: { status: string }) => {
      if (status === 'disconnected') {
        this.handleReconnect(docId, doc);
      }
      updateConnectionStatus(status);
    });

    this.providers.set(docId, provider);
    return provider;
  }

  private handleReconnect(docId: string, doc: Y.Doc) {
    const attempts = this.reconnectAttempts.get(docId) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      updateSyncStatus('failed');
      return;
    }
    this.reconnectAttempts.set(docId, attempts + 1);
    // Exponential backoff is handled by y-websocket internally
  }

  disconnect(docId: string) {
    const provider = this.providers.get(docId);
    if (provider) {
      provider.destroy();
      this.providers.delete(docId);
      this.reconnectAttempts.delete(docId);
    }
  }

  disconnectAll() {
    this.providers.forEach((provider) => provider.destroy());
    this.providers.clear();
    this.reconnectAttempts.clear();
  }
}

export const wsManager = new SprintioWebSocketManager();
```

### 6.3 Presence & Awareness

```typescript
// src/lib/yjs/presence.ts
import * as Y from 'yjs';

interface PresenceState {
  user: {
    id: string;
    name: string;
    avatar: string;
    color: string; // Unique cursor color
  };
  cursor: {
    clientId: string;
    // For docs: ProseMirror cursor position
    // For boards: column + card position
  } | null;
  selection: {
    // For docs: ProseMirror selection range
    from: number;
    to: number;
  } | null;
  activeView: string; // Which view this user is on
  lastActive: number; // Timestamp
}

// Yjs awareness for presence
export function setupPresence(provider: WebsocketProvider) {
  const awareness = provider.awareness;

  // Set local user state
  awareness.setLocalStateField('user', {
    id: currentUser.id,
    name: currentUser.name,
    avatar: currentUser.avatar,
    color: generateCursorColor(currentUser.id),
  });

  // Listen for awareness changes (other users' cursors/presence)
  awareness.on('change', () => {
    const states = Array.from(awareness.getStates().entries());
    const remoteUsers = states
      .filter(([clientId]) => clientId !== awareness.clientID)
      .map(([, state]) => state as PresenceState);

    updatePresenceDisplay(remoteUsers);
  });

  return awareness;
}

// Cursor color generator — unique per user, consistent across sessions
function generateCursorColor(userId: string): string {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
```

### 6.4 Yjs Provider Integration

```typescript
// src/providers/yjs-provider.tsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { SprintioWebSocketManager } from '@/lib/yjs/websocket-provider';

interface YjsContextValue {
  doc: Y.Doc;
  provider: WebsocketProvider;
  awareness: Awareness;
  isSynced: boolean;
}

const YjsContext = createContext<YjsContextValue | null>(null);

export function YjsProvider({
  docId,
  children,
}: {
  docId: string;
  children: React.ReactNode;
}) {
  const docRef = useRef(new Y.Doc());
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    const doc = docRef.current;
    const provider = wsManager.getProvider(docId, doc);

    provider.on('sync', setIsSynced);

    return () => {
      provider.off('sync', setIsSynced);
      wsManager.disconnect(docId);
      // Don't destroy doc here — it may be reused
    };
  }, [docId]);

  const value = useMemo(() => ({
    doc: docRef.current,
    provider: wsManager.getProvider(docId, docRef.current),
    awareness: wsManager.getProvider(docId, docRef.current).awareness,
    isSynced,
  }), [docId, isSynced]);

  return (
    <YjsContext.Provider value={value}>
      {children}
    </YjsContext.Provider>
  );
}

export function useYjs() {
  const ctx = useContext(YjsContext);
  if (!ctx) throw new Error('useYjs must be used within YjsProvider');
  return ctx;
}
```

### 6.5 Non-CRDT Real-time Updates

For data that doesn't need CRDT (task status changes, notifications, presence), Sprintio uses a separate WebSocket channel:

```typescript
// src/lib/realtime/events.ts
type RealtimeEvent =
  | { type: 'task.updated'; taskId: string; changes: Partial<Task> }
  | { type: 'task.moved'; taskId: string; fromList: string; toList: string }
  | { type: 'comment.added'; taskId: string; comment: Comment }
  | { type: 'notification'; notification: Notification }
  | { type: 'presence.joined'; userId: string; listId: string }
  | { type: 'presence.left'; userId: string; listId: string };

// Handler — invalidates TanStack Query caches
function handleRealtimeEvent(event: RealtimeEvent) {
  switch (event.type) {
    case 'task.updated':
      queryClient.setQueryData(taskKeys.detail(event.taskId), (old: Task | undefined) =>
        old ? { ...old, ...event.changes } : old,
      );
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      break;

    case 'task.moved':
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      break;

    case 'comment.added':
      queryClient.invalidateQueries({
        queryKey: taskKeys.comments(event.taskId),
      });
      break;

    case 'notification':
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.info(event.notification.title);
      break;
  }
}
```

---

## 7. Component Architecture

Sprintio follows a composition-based component architecture with three layers: **UI primitives** (21st.dev — shadcn/ui-compatible), **domain components** (Sprintio-specific), and **page compositions** (routes).

### 7.1 Component Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 3: PAGE COMPOSITIONS                                      │
│  Route-level components that compose domain components           │
│  src/routes/                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ BoardView   │  │ ListView     │  │ DocumentEditorPage   │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘   │
├─────────┼────────────────┼──────────────────────┼───────────────┤
│  LAYER 2: DOMAIN COMPONENTS                                       │
│  Sprintio-specific composed components                            │
│  src/components/sprintio/                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │TaskCard  │ │BoardColumn│ │SidebarNav│ │CommandPalette    │   │
│  │TaskDetail│ │FilterBar  │ │SpaceTree │ │AiCopilotPanel   │   │
│  │Comment   │ │SortMenu   │ │UserMenu  │ │NotificationCenter│   │
│  └──────┬───┘ └──────┬───┘ └──────┬───┘ └────────┬─────────┘   │
├─────────┼────────────┼────────────┼───────────────┼──────────────┤
│  LAYER 1: UI PRIMITIVES                                           │
│  21st.dev (generates shadcn/ui + Radix UI components)                                  │
│  src/components/ui/                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │Button│ │Input │ │Dialog│ │Select│ │Toast │ │Badge │        │
│  │Card  │ │Tabs  │ │Dropdown│ │Popover│ │Tooltip│ │Avatar│       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Component File Structure

```
src/components/
├── ui/                              # Layer 1: UI Primitives (21st.dev / shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── select.tsx
│   ├── dropdown-menu.tsx
│   ├── popover.tsx
│   ├── tooltip.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── card.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   ├── separator.tsx
│   ├── scroll-area.tsx
│   ├── skeleton.tsx
│   └── index.ts                     # Re-export barrel
│
├── sprintio/                        # Layer 2: Domain Components
│   ├── task/
│   │   ├── task-card.tsx            # Board card
│   │   ├── task-row.tsx             # List row
│   │   ├── task-detail.tsx          # Full task view
│   │   ├── task-form.tsx            # Create/edit form
│   │   ├── task-subtasks.tsx        # Subtask list
│   │   ├── task-assignee.tsx        # Assignee selector
│   │   └── task-priority.tsx        # Priority badge
│   │
│   ├── board/
│   │   ├── board-view.tsx           # Full board
│   │   ├── board-column.tsx         # Single column
│   │   ├── board-card.tsx           # Card in column
│   │   ├── board-header.tsx         # Column header + count
│   │   └── board-add-card.tsx       # Add card button/form
│   │
│   ├── list/
│   │   ├── list-view.tsx            # Full list view
│   │   ├── list-header.tsx          # Column headers
│   │   ├── list-row.tsx             # Single row
│   │   └── list-group.tsx           # Grouped rows
│   │
│   ├── sidebar/
│   │   ├── sidebar.tsx              # Main sidebar
│   │   ├── sidebar-nav.tsx          # Navigation links
│   │   ├── space-tree.tsx           # Space/folder tree
│   │   ├── starred-lists.tsx        # Starred items
│   │   └── sidebar-collapse.tsx     # Collapse toggle
│   │
│   ├── editor/
│   │   ├── editor-wrapper.tsx       # TipTap + Yjs setup
│   │   ├── editor-toolbar.tsx       # Formatting toolbar
│   │   ├── editor-block-menu.tsx    # Slash command menu
│   │   └── editor-extensions/       # Custom TipTap extensions
│   │
│   ├── ai/
│   │   ├── ai-panel.tsx             # AI sidebar
│   │   ├── ai-chat.tsx              # Chat interface
│   │   ├── ai-message.tsx           # Single message
│   │   ├── ai-input.tsx             # Chat input
│   │   └── ai-suggestion.tsx        # Inline suggestion
│   │
│   ├── command-palette/
│   │   ├── command-palette.tsx       # Main palette
│   │   ├── command-group.tsx         # Grouped commands
│   │   └── command-item.tsx          # Single command
│   │
│   └── shared/
│       ├── filter-bar.tsx            # Reusable filter controls
│       ├── sort-menu.tsx             # Sort dropdown
│       ├── empty-state.tsx           # Empty state illustrations
│       ├── loading-skeleton.tsx      # Loading placeholders
│       ├── confirm-dialog.tsx        # Confirmation modal
│       ├── user-avatar.tsx           # User avatar + name
│       └── relative-time.tsx         # "2 hours ago" display
│
└── layout/                          # Shell layout components
    ├── app-shell.tsx
    ├── header.tsx
    ├── sidebar.tsx
    └── main-content.tsx
```

### 7.3 Composition Pattern

```tsx
// Domain components compose UI primitives + hooks
// Example: TaskCard used in Board View

// src/components/sprintio/board/board-card.tsx
export function BoardCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <TaskPriorityBadge priority={task.priority} />
          <TaskIdBadge id={task.identifier} />
        </div>

        <h4 className="mt-2 text-sm font-medium line-clamp-2">{task.title}</h4>

        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {stripHtml(task.description)}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {task.labels.slice(0, 3).map((label) => (
              <Badge key={label.id} variant="outline" className="text-[10px]">
                {label.name}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {task.assignees.slice(0, 3).map((user) => (
              <UserAvatar key={user.id} user={user} size="xs" />
            ))}
            {task.subtasks && (
              <span className="text-[10px] text-muted-foreground">
                {task.subtasks.completed}/{task.subtasks.total}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 7.4 Component Naming Conventions

| Pattern           | Convention                        | Example                                  |
| ----------------- | --------------------------------- | ---------------------------------------- |
| UI primitives     | `noun` (lowercase)                | `button.tsx`, `dialog.tsx`, `input.tsx`  |
| Domain components | `noun` or `noun-noun` (lowercase) | `task-card.tsx`, `board-column.tsx`      |
| Layout components | `noun` (lowercase)                | `sidebar.tsx`, `header.tsx`              |
| Hook files        | `use-noun.ts`                     | `use-sortable.ts`, `use-realtime.ts`     |
| Provider files    | `noun-provider.tsx`               | `yjs-provider.tsx`, `theme-provider.tsx` |
| Type files        | `noun.types.ts`                   | `task.types.ts`, `board.types.ts`        |

---

## 8. Rich Text Editor

Sprintio uses **TipTap** (built on ProseMirror) with **Yjs** for real-time collaborative editing. The editor powers task descriptions, document editing, and inline comments.

### 8.1 Editor Setup

```typescript
// src/components/sprintio/editor/editor-wrapper.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

interface EditorWrapperProps {
  docId: string;
  content?: JSONContent;
  editable?: boolean;
  placeholder?: string;
}

export function EditorWrapper({
  docId,
  content,
  editable = true,
  placeholder = 'Start writing...',
}: EditorWrapperProps) {
  const { doc, provider, awareness } = useYjs();
  const lowlight = createLowlight(common);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable built-in history — Yjs handles undo/redo
        history: false,
        codeBlock: false,           // Use lowlight version
      }),

      // Real-time collaboration via Yjs
      Collaboration.configure({
        document: doc,
      }),

      // Live cursors for other users
      CollaborationCursor.configure({
        provider,
        user: {
          name: currentUser.name,
          color: generateCursorColor(currentUser.id),
        },
      }),

      // Task lists (checkboxes)
      TaskList,
      TaskItem.configure({
        nested: true,
      }),

      // Slash commands / mentions
      Mention.configure({
        suggestion: mentionSuggestion,
      }),

      // Placeholder text
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),

      // Syntax-highlighted code blocks
      CodeBlockLowlight.configure({
        lowlight,
      }),

      // Custom extensions
      SprintioEmbed,               // Embed tasks/docs inline
      SprintioDate,                // Inline date chips
      SprintioStatus,              // Inline status badges
    ],

    editable,
    content,                       // Initial content (for non-collab mode)

    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="editor-wrapper">
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
      <EditorStatusBar editor={editor} />
    </div>
  );
}
```

### 8.2 Custom TipTap Extensions

```typescript
// src/components/sprintio/editor/editor-extensions/sprintio-embed.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SprintioEmbedComponent } from './sprintio-embed-component';

// Embed tasks and docs inline within a document
export const SprintioEmbed = Node.create({
  name: 'sprintioEmbed',
  group: 'block',
  atom: true, // Cannot be edited inline

  addAttributes() {
    return {
      type: { default: 'task' }, // 'task' | 'doc'
      id: { default: null },
      title: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-sprintio-embed]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-sprintio-embed': '',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SprintioEmbedComponent);
  },
});
```

### 8.3 Editor Toolbar

```tsx
// src/components/sprintio/editor/editor-toolbar.tsx
export function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-1 border-b px-3 py-1.5">
      {/* Text formatting */}
      <ToolbarButton
        icon={<Bold />}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        shortcut="⌘B"
      />
      <ToolbarButton
        icon={<Italic />}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        shortcut="⌘I"
      />
      <ToolbarButton
        icon={<Strikethrough />}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Block formatting */}
      <ToolbarButton
        icon={<Heading1 />}
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        icon={<List />}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={<ListOrdered />}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={<CheckSquare />}
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Code */}
      <ToolbarButton
        icon={<Code />}
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <ToolbarButton
        icon={<CodeSquare />}
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Link */}
      <ToolbarButton
        icon={<Link />}
        active={editor.isActive('link')}
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Undo/Redo — handled by Yjs */}
      <ToolbarButton
        icon={<Undo />}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        icon={<Redo />}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />
    </div>
  );
}
```

---

## 9. Drag & Drop

Sprintio uses **@dnd-kit** for all drag-and-drop interactions: board cards between columns, list row reordering, and sidebar item reordering.

### 9.1 @dnd-kit Architecture

```typescript
// src/components/sprintio/board/board-view.tsx
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function BoardView({ list }: { list: ListWithTasks }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask();

  // Sensors — pointer for mouse, keyboard for accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },   // 5px before drag starts
    }),
    useSensor(KeyboardSensor)
  );

  // Column IDs for the sortable context
  const columnIds = list.statuses.map((s) => s.id);

  function handleDragStart(event: DragStartEvent) {
    const task = findTaskById(event.active.id as string);
    setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Moving between columns
    const activeColumn = findColumnByTaskId(activeId);
    const overColumn = findColumnByTaskId(overId) ?? findColumnById(overId);

    if (activeColumn !== overColumn) {
      // Optimistic: move task to new column in local state
      moveTaskBetweenColumns(activeId, activeColumn, overColumn);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const newStatusId = findColumnByTaskId(overId) ?? overId;

    // Update task status on server
    try {
      await moveTask.mutateAsync({
        taskId,
        newStatusId,
        position: calculateNewPosition(overId),
      });
    } catch {
      // Revert optimistic update on failure
      queryClient.invalidateQueries({ queryKey: listKeys.tasks(list.id) });
      toast.error('Failed to move task. Reverted.');
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4">
        {list.statuses.map((status) => (
          <BoardColumn
            key={status.id}
            status={status}
            tasks={tasksByStatus[status.id] ?? []}
          />
        ))}
      </div>

      {/* Overlay shown while dragging */}
      <DragOverlay>
        {activeTask ? <BoardCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// src/components/sprintio/board/board-column.tsx
export function BoardColumn({ status, tasks }: BoardColumnProps) {
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50">
      <BoardHeader status={status} count={tasks.length} />

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      <BoardAddCard statusId={status.id} listId={status.listId} />
    </div>
  );
}

// src/components/sprintio/board/board-card.tsx (sortable wrapper)
export function BoardCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg'
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3">
        <TaskCardContent task={task} />
      </CardContent>
    </Card>
  );
}
```

### 9.2 Drag & Drop Patterns

| Interaction                 | Library           | Strategy                                                   | Accessible            |
| --------------------------- | ----------------- | ---------------------------------------------------------- | --------------------- |
| Board cards between columns | @dnd-kit          | `closestCorners` collision + `verticalListSortingStrategy` | Yes — keyboard sensor |
| List row reorder            | @dnd-kit          | `verticalListSortingStrategy`                              | Yes — keyboard sensor |
| Sidebar item reorder        | @dnd-kit          | `verticalListSortingStrategy`                              | Yes                   |
| Calendar date drag          | Phase 2           | Custom or @dnd-kit                                         | TBD                   |
| File upload drag            | Native HTML5 drag | `onDragOver` / `onDrop`                                    | N/A                   |

---

## 10. Performance Strategy

Performance is Sprintio's primary brand differentiator. The frontend must meet strict targets defined in [NFRs §2](../NON_FUNCTIONAL_REQUIREMENTS.md#2-performance).

### 10.1 Performance Targets

| Metric                       | Target          | Strategy                                        |
| ---------------------------- | --------------- | ----------------------------------------------- |
| Cold load (NFR-PERF-01)      | < 2s (p95)      | Code splitting, tree shaking, critical CSS      |
| Warm load (NFR-PERF-02)      | < 500ms (p95)   | Service worker, query cache persistence         |
| TTI (NFR-PERF-03)            | < 1.5s (p95)    | Streaming SSR (if applicable), deferred scripts |
| Bundle size (NFR-PERF-13)    | < 300KB gzipped | Route-level code splitting, dynamic imports     |
| API latency (NFR-PERF-04)    | < 200ms (p95)   | Prefetching, optimistic updates                 |
| Real-time sync (NFR-PERF-06) | < 100ms (p95)   | Yjs CRDT, WebSocket batching                    |
| First AI token (NFR-PERF-08) | < 500ms         | Streaming SSE                                   |

### 10.2 Code Splitting Strategy

```typescript
// Route-level splitting — TanStack Router lazy loading
import { lazy } from 'react';

const BoardView = lazy(() => import('@/routes/s.$spaceId.list_.$listId.board'));
const ListView = lazy(() => import('@/routes/s.$spaceId.list_.$listId.list'));
const DocumentEditor = lazy(() => import('@/routes/ws.$workspaceId.doc_.$docId'));
const Settings = lazy(() => import('@/routes/ws.$workspaceId.settings'));
const CommandPalette = lazy(() => import('@/components/sprintio/command-palette'));

// Heavy component splitting — load on demand
const AiPanel = lazy(() => import('@/components/sprintio/ai/ai-panel'));
const CalendarView = lazy(() => import('@/components/sprintio/calendar'));
const TimelineView = lazy(() => import('@/components/sprintio/timeline'));

// Editor extensions — load only when needed
const SprintioEmbed = lazy(
  () => import('@/components/sprintio/editor/editor-extensions/sprintio-embed'),
);
```

### 10.3 Virtual Scrolling

```typescript
// For lists with 1000+ tasks
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualTaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,        // Estimated row height in px
    overscan: 10,                  // Render 10 extra rows above/below
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TaskRow task={tasks[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 10.4 Memo Strategy

| Component       | Memo Strategy                             | Rationale                                |
| --------------- | ----------------------------------------- | ---------------------------------------- |
| `BoardCard`     | `React.memo` + stable props               | Re-renders only when task data changes   |
| `BoardColumn`   | `React.memo`                              | Re-renders only when column tasks change |
| `TaskRow`       | `React.memo` + `useCallback` for handlers | High-frequency re-render target          |
| `EditorWrapper` | No memo (TipTap manages own updates)      | TipTap handles its own DOM updates       |
| `Sidebar`       | No memo (rarely re-renders)               | Only updates on workspace change         |
| `Header`        | No memo (static)                          | Almost never re-renders                  |

```typescript
// Stable selectors to prevent unnecessary re-renders
const taskSelector = (state: QueryState<Task>) => state.data;

function BoardCard({ taskId }: { taskId: string }) {
  const task = useQuery({
    ...taskDetailQueryOptions(taskId),
    select: (data) => ({
      id: data.id,
      title: data.title,
      priority: data.priority,
      assignees: data.assignees,
      labels: data.labels,
    }),
  });

  return <CardContent task={task.data} />;
}
```

### 10.5 Image & Asset Optimization

```typescript
// Lazy load images with intersection observer
<img
  src={task.attachment.thumbnail}
  loading="lazy"
  decoding="async"
  alt={task.attachment.name}
/>

// Cloudflare R2 + CDN — serve optimized variants
// Original: https://cdn.sprintio.app/files/abc123
// Thumbnail: https://cdn.sprintio.app/files/abc123?w=200&h=200&fit=cover
// WebP: https://cdn.sprintio.app/files/abc123?format=webp
```

---

## 11. Error Handling

### 11.1 Error Boundary Strategy

```
┌──────────────────────────────────────────────────────┐
│  Global Error Boundary (App level)                    │
│  Catches: unhandled errors, rendering crashes         │
│  Fallback: Full-page error with reload button         │
├──────────────────────────────────────────────────────┤
│  Route Error Boundary (Per-route)                     │
│  Catches: route-level rendering errors                │
│  Fallback: Route-specific error page                  │
├──────────────────────────────────────────────────────┤
│  Component Error Boundary (Feature level)             │
│  Catches: feature-specific errors                     │
│  Fallback: Inline fallback, rest of page works        │
└──────────────────────────────────────────────────────┘
```

### 11.2 Error Boundary Implementation

```tsx
// src/components/error-boundary.tsx
import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service (Sentry)
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack, name: this.props.name },
    });

    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h3 className="text-lg font-semibold">Something went wrong</h3>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage in route layouts
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      name="route"
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold">Page Error</h2>
            <p className="mt-2 text-muted-foreground">This page encountered an error.</p>
            <Button asChild className="mt-4">
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

### 11.3 API Error Handling

```typescript
// src/lib/api-errors.ts

// Structured API error class
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Global error handler for TanStack Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry 4xx errors (client errors)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry up to 2 times for 5xx / network errors
        return failureCount < 2;
      },
    },
  },
});

// Global error callback
queryClient.getQueryCache().config.onError = (error) => {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      // Session expired — redirect to login
      window.location.href = '/auth/login';
    } else if (error.status === 403) {
      toast.error("You don't have permission for this action.");
    } else if (error.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
  } else {
    toast.error('Network error. Check your connection.');
  }
};
```

### 11.4 Retry Logic

| Error Type           | Retry Count | Backoff                     | User Feedback                      |
| -------------------- | ----------- | --------------------------- | ---------------------------------- |
| Network timeout      | 2           | Exponential (1s, 2s)        | Toast: "Retrying..."               |
| 5xx Server Error     | 2           | Exponential (1s, 2s)        | Toast: "Server error, retrying..." |
| 4xx Client Error     | 0           | None                        | Toast with specific message        |
| 401 Unauthorized     | 0           | None                        | Redirect to login                  |
| 403 Forbidden        | 0           | None                        | Toast: "Insufficient permissions"  |
| 429 Rate Limited     | 1           | Wait for Retry-After header | Toast: "Rate limited, please wait" |
| WebSocket disconnect | 10          | Exponential (1s → 30s max)  | Status bar: "Reconnecting..."      |

---

## 12. Keyboard Shortcuts

### 12.1 Shortcut Registry

```typescript
// src/lib/keyboard-shortcuts.ts
import { useHotkeys } from 'react-hotkeys-hook';

interface ShortcutDefinition {
  keys: string;
  description: string;
  category: 'Global' | 'Navigation' | 'Task' | 'Editor' | 'Board';
  handler: () => void;
}

// Shortcut definitions organized by category
export const shortcuts: ShortcutDefinition[] = [
  // Global
  {
    keys: 'mod+k',
    description: 'Open command palette',
    category: 'Global',
    handler: openCmdPalette,
  },
  {
    keys: 'mod+shift+p',
    description: 'Toggle AI panel',
    category: 'Global',
    handler: toggleAiPanel,
  },
  { keys: 'mod+/', description: 'Toggle sidebar', category: 'Global', handler: toggleSidebar },
  {
    keys: 'Escape',
    description: 'Close modal/panel',
    category: 'Global',
    handler: closeCurrentModal,
  },

  // Navigation
  { keys: 'g', description: 'Go to (opens submenu)', category: 'Navigation', handler: openGoMenu },
  { keys: 'mod+1', description: 'Go to My Work', category: 'Navigation', handler: goToMyWork },
  { keys: 'mod+2', description: 'Go to Inbox', category: 'Navigation', handler: goToInbox },
  { keys: '[', description: 'Previous list', category: 'Navigation', handler: goToPrevList },
  { keys: ']', description: 'Next list', category: 'Navigation', handler: goToNextList },

  // Task
  { keys: 'c', description: 'Create new task', category: 'Task', handler: openCreateTask },
  { keys: 'e', description: 'Edit selected task', category: 'Task', handler: editSelectedTask },
  {
    keys: 'mod+backspace',
    description: 'Delete task',
    category: 'Task',
    handler: deleteSelectedTask,
  },
  { keys: 'j', description: 'Select next task', category: 'Board', handler: selectNextTask },
  { keys: 'k', description: 'Select previous task', category: 'Board', handler: selectPrevTask },
  {
    keys: 'Enter',
    description: 'Open selected task',
    category: 'Board',
    handler: openSelectedTask,
  },

  // Editor
  { keys: 'mod+b', description: 'Bold', category: 'Editor', handler: toggleBold },
  { keys: 'mod+i', description: 'Italic', category: 'Editor', handler: toggleItalic },
  { keys: 'mod+shift+x', description: 'Strikethrough', category: 'Editor', handler: toggleStrike },
  { keys: 'mod+e', description: 'Inline code', category: 'Editor', handler: toggleCode },
  { keys: 'mod+shift+c', description: 'Code block', category: 'Editor', handler: toggleCodeBlock },
];

// Hook for registering shortcuts in components
export function useSprintioShortcuts(category?: string) {
  const filtered = category ? shortcuts.filter((s) => s.category === category) : shortcuts;

  filtered.forEach((shortcut) => {
    useHotkeys(shortcut.keys, shortcut.handler, {
      enableOnFormTags: ['INPUT', 'TEXTAREA'].includes(shortcut.category),
      enableOnContentEditable: shortcut.category === 'Editor',
    });
  });
}
```

### 12.2 Command Palette Integration

```tsx
// The command palette is the discoverable shortcut surface
// Users who don't know shortcuts can search for actions

const commandGroups = [
  {
    label: 'Navigation',
    commands: [
      { id: 'nav:home', label: 'Go to Home', shortcut: 'mod+1', icon: <Home /> },
      { id: 'nav:inbox', label: 'Go to Inbox', shortcut: 'mod+2', icon: <Inbox /> },
      { id: 'nav:my-work', label: 'Go to My Work', shortcut: 'mod+3', icon: <User /> },
    ],
  },
  {
    label: 'Actions',
    commands: [
      { id: 'action:create-task', label: 'Create Task', shortcut: 'c', icon: <Plus /> },
      {
        id: 'action:ai-panel',
        label: 'Toggle AI Panel',
        shortcut: 'mod+shift+p',
        icon: <Sparkles />,
      },
      { id: 'action:sidebar', label: 'Toggle Sidebar', shortcut: 'mod+/', icon: <PanelLeft /> },
    ],
  },
];
```

---

## 13. Internationalization

### 13.1 Strategy

Sprintio supports **English (en)** at MVP launch. Internationalization infrastructure is built in from day one to avoid costly refactors later. Additional languages are added post-MVP.

| Phase         | Languages                           | Approach                                               |
| ------------- | ----------------------------------- | ------------------------------------------------------ |
| MVP (Phase 1) | English only                        | i18n infrastructure in place, all strings externalized |
| Phase 2       | + Spanish, French, German, Japanese | Community + professional translation                   |
| Phase 3       | + Portuguese, Chinese, Korean       | Professional translation + AI-assisted                 |

### 13.2 Setup

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',                     // Default language
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  nsSeparator: false,            // Allow 'namespace:key' format
});

export default i18n;

// Usage in components
import { useTranslation } from 'react-i18next';

function TaskCard({ task }: { task: Task }) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <h4>{task.title}</h4>
        <span>{t('tasks.subtaskCount', { count: task.subtasks.length })}</span>
      </CardContent>
    </Card>
  );
}
```

### 13.3 String Externalization Rules

| Category       | Location                                       | Example Key             |
| -------------- | ---------------------------------------------- | ----------------------- |
| UI labels      | `en.json` → `ui.*`                             | `ui.sidebar.workspaces` |
| Action labels  | `en.json` → `actions.*`                        | `actions.createTask`    |
| Error messages | `en.json` → `errors.*`                         | `errors.networkError`   |
| Validation     | `en.json` → `validation.*`                     | `validation.required`   |
| Time relative  | `en.json` → `time.*`                           | `time.hoursAgo`         |
| AI responses   | Not translated (AI generates in user language) | N/A                     |

---

## 14. File Structure

```
src/
├── app/
│   ├── Root.tsx                    # App shell (providers, global UI)
│   ├── routes.tsx                  # Route tree definition
│   └── routeTree.gen.ts           # Auto-generated by TanStack Router
│
├── routes/                         # TanStack Router file-based routes
│   ├── __root.tsx                  # Root layout
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot-password.tsx
│   ├── onboarding.tsx
│   ├── ws.$workspaceId/
│   │   ├── __layout.tsx            # Workspace layout (sidebar + header)
│   │   ├── index.tsx               # Workspace home
│   │   ├── settings/
│   │   │   ├── index.tsx
│   │   │   ├── general.tsx
│   │   │   ├── members.tsx
│   │   │   └── billing.tsx
│   │   ├── notifications.tsx
│   │   └── s.$spaceId/
│   │       ├── index.tsx           # Space home
│   │       ├── list_.$listId/
│   │       │   ├── index.tsx       # Default view (redirects)
│   │       │   ├── board.tsx       # Board view
│   │       │   └── list.tsx        # List view
│   │       ├── task_.$taskId.tsx   # Task detail (slide-over)
│   │       └── doc_.$docId.tsx     # Document editor
│   └── search.tsx
│
├── components/
│   ├── ui/                         # 21st.dev / shadcn/ui primitives
│   ├── sprintio/                   # Domain components
│   └── layout/                     # Shell layout
│
├── hooks/                          # Shared hooks
│   ├── use-current-workspace.ts
│   ├── use-current-user.ts
│   ├── use-realtime.ts
│   ├── use-keyboard-shortcuts.ts
│   ├── use-debounce.ts
│   ├── use-local-storage.ts
│   └── use-media-query.ts
│
├── stores/                         # Redux Toolkit slices
│   ├── sidebar.store.ts
│   ├── ai-panel.store.ts
│   ├── command-palette.store.ts
│   ├── view-filters.store.ts
│   └── theme.store.ts
│
├── lib/                            # Utilities and API
│   ├── api-client.ts               # TanStack Query + fetch wrapper
│   ├── api/                        # Domain-specific API functions
│   │   ├── tasks.ts
│   │   ├── lists.ts
│   │   ├── workspaces.ts
│   │   ├── documents.ts
│   │   └── auth.ts
│   ├── query-options.ts            # Query option factories
│   ├── query-keys.ts               # Query key factories
│   ├── yjs/                        # Yjs/CRDT utilities
│   │   ├── websocket-provider.ts
│   │   ├── presence.ts
│   │   └── sync.ts
│   ├── realtime/                   # Non-CRDT real-time events
│   │   ├── events.ts
│   │   └── websocket.ts
│   ├── keyboard-shortcuts.ts
│   ├── constants.ts
│   └── utils.ts
│
├── providers/                      # React context providers
│   ├── auth-provider.tsx
│   ├── theme-provider.tsx
│   ├── yjs-provider.tsx
│   └── ws-provider.tsx
│
├── types/                          # Shared TypeScript types
│   ├── task.types.ts
│   ├── list.types.ts
│   ├── workspace.types.ts
│   ├── user.types.ts
│   ├── document.types.ts
│   └── api.types.ts
│
├── i18n/                           # Internationalization
│   ├── index.ts
│   └── locales/
│       └── en.json
│
└── styles/
    ├── globals.css                 # Tailwind + design tokens
    └── editor.css                  # TipTap editor styles
```

---

## 15. Quick Reference Cheat Sheet

### State Decision Flowchart

```
Is the data from the API?
  YES → TanStack Query (useQuery / useMutation)
  NO  ↓

Is it ephemeral UI state (open/close, hover)?
  YES → Redux Toolkit (no persist)
  NO  ↓

Does it persist across sessions (theme, preferences)?
  YES → Redux Toolkit (with redux-persist)
  NO  ↓

Is it form data not yet submitted?
  YES → React Hook Form / local useState
  NO  ↓

Is it real-time collaborative state (cursors, presence)?
  YES → Yjs awareness
  NO  ↓

Is it auth/session data?
  YES → React Context + HTTP-only cookie
```

### Component Layer Quick Reference

| Layer                  | Location                   | Use For                        | Example                                   |
| ---------------------- | -------------------------- | ------------------------------ | ----------------------------------------- |
| **UI Primitives**      | `src/components/ui/`       | Base building blocks           | `Button`, `Input`, `Dialog`, `Card`       |
| **Domain Components**  | `src/components/sprintio/` | Sprintio-specific compositions | `TaskCard`, `BoardColumn`, `AiPanel`      |
| **Route Compositions** | `src/routes/`              | Page-level layouts             | `BoardView`, `ListView`, `DocumentEditor` |

### Route Quick Reference

| Pattern    | Example            | Purpose                       |
| ---------- | ------------------ | ----------------------------- |
| `$param`   | `/ws/$workspaceId` | Dynamic segment               |
| `__layout` | `__root.tsx`       | Layout route (wraps children) |
| `index`    | `index.tsx`        | Default child route           |
| `_group`   | `auth/_layout.tsx` | Pathless layout group         |
| `search`   | `?view=board`      | URL search params (validated) |

### Query Key Quick Reference

| Operation         | Key Pattern                                                | Example                                       |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------- |
| List              | `['domain', 'list', filters]`                              | `['tasks', 'list', { status: 'todo' }]`       |
| Detail            | `['domain', 'detail', id]`                                 | `['tasks', 'detail', 'task_123']`             |
| Sub-resource      | `['domain', 'detail', id, 'sub']`                          | `['tasks', 'detail', 'task_123', 'comments']` |
| Invalidate list   | `invalidateQueries({ queryKey: ['tasks', 'list'] })`       | Refreshes all task lists                      |
| Invalidate detail | `invalidateQueries({ queryKey: ['tasks', 'detail', id] })` | Refreshes one task                            |

### Performance Checklist

- [ ] All routes use `React.lazy()` code splitting
- [ ] Board/list views use virtual scrolling for 100+ items
- [ ] Images use `loading="lazy"` and Cloudflare R2 optimization
- [ ] Bundle size < 300KB gzipped (check in CI)
- [ ] Lighthouse CI runs on every PR
- [ ] `React.memo` on high-frequency re-render components (`BoardCard`, `TaskRow`)
- [ ] Query cache persistence for warm load performance
- [ ] Service worker for offline support (PWA)
- [ ] Font loading with `font-display: swap`
- [ ] No layout shifts (CLS < 0.1)

### Error Handling Quick Reference

| Scenario             | Handler                      | Fallback                           |
| -------------------- | ---------------------------- | ---------------------------------- |
| Route crash          | `ErrorBoundary` per route    | Route-specific error page          |
| Component crash      | `ErrorBoundary` per feature  | Inline fallback, rest works        |
| API 4xx              | Query `retry: false`         | Toast with specific message        |
| API 5xx              | Query `retry: 2`             | Toast + retry                      |
| 401 Unauthorized     | Global handler               | Redirect to `/auth/login`          |
| WebSocket disconnect | Auto-reconnect (y-websocket) | Status bar indicator               |
| Offline              | CRDT queues changes          | Work continues, syncs on reconnect |

### Tech Stack Quick Reference

| Concern        | Library                         | Import                             |
| -------------- | ------------------------------- | ---------------------------------- |
| Routing        | TanStack Router                 | `@tanstack/react-router`           |
| Data fetching  | TanStack Query                  | `@tanstack/react-query`            |
| Client state   | Redux Toolkit                   | `@reduxjs/toolkit` + `react-redux` |
| Styling        | Tailwind CSS                    | `tailwindcss`                      |
| UI primitives  | 21st.dev (shadcn/ui-compatible) | `21st.dev`                         |
| Rich text      | TipTap                          | `@tiptap/react`                    |
| Real-time      | Yjs                             | `yjs`, `y-websocket`               |
| Drag & drop    | @dnd-kit                        | `@dnd-kit/core`                    |
| Forms          | React Hook Form + Zod           | `react-hook-form`, `zod`           |
| Toasts         | Sonner                          | `sonner`                           |
| Keyboard       | react-hotkeys-hook              | `react-hotkeys-hook`               |
| i18n           | react-i18next                   | `react-i18next`                    |
| Virtual scroll | @tanstack/react-virtual         | `@tanstack/react-virtual`          |
| Icons          | Lucide React                    | `lucide-react`                     |

---

_This document is the single source of truth for Sprintio's frontend architecture. All frontend code should conform to the patterns, conventions, and decisions defined here. For component-level design tokens and styling rules, see [Design System](../Design-System/DESIGN-SYSTEM-CONSOLIDATED.md). For performance targets and constraints, see [NFRs](../NON_FUNCTIONAL_REQUIREMENTS.md)._
