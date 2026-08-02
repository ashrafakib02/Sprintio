-- ============================================================
-- Migration 0006: Hierarchy Enforcement & Performance Indexes
-- ============================================================
-- Description:
--   1. Enforce NOT NULL on workspaces.organization_id
--   2. Add composite indexes for common hierarchy query patterns
--   3. Add organization_id index on workspaces (Drizzle-level)
--
-- Prerequisites:
--   - All existing workspaces MUST have a valid organization_id.
--     Run the back-fill step below BEFORE enforcing NOT NULL.
-- ============================================================

-- ============================================================
-- STEP 0: Back-fill orphan workspaces (if any exist)
-- ============================================================
-- Option A: Delete orphan workspaces (recommended if orphans are test data)
-- DELETE FROM workspaces WHERE organization_id IS NULL;

-- Option B: Assign to a default organization (uncomment and set UUID)
-- INSERT INTO organizations (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000000', 'Default', 'default')
--   ON CONFLICT (slug) DO NOTHING;
-- UPDATE workspaces SET organization_id = '00000000-0000-0000-0000-000000000000' WHERE organization_id IS NULL;

-- ============================================================
-- STEP 1: Enforce NOT NULL on workspaces.organization_id
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces'
      AND column_name = 'organization_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "workspaces"
      ALTER COLUMN "organization_id" SET NOT NULL;
  END IF;
END $$;

-- ============================================================
-- STEP 2: Add composite indexes for task query patterns
-- ============================================================

-- Tasks by project + status (e.g., "show all in-progress tasks in project X")
CREATE INDEX IF NOT EXISTS "tasks_project_id_status_idx"
  ON "tasks" ("project_id", "status");

-- Tasks by project + assignee (e.g., "show all tasks assigned to user Y in project X")
CREATE INDEX IF NOT EXISTS "tasks_project_id_assignee_id_idx"
  ON "tasks" ("project_id", "assignee_id");

-- Tasks by board + column + position (e.g., Kanban board rendering)
CREATE INDEX IF NOT EXISTS "tasks_board_id_column_id_position_idx"
  ON "tasks" ("board_id", "column_id", "position");

-- ============================================================
-- STEP 3: Ensure workspaces.organization_id index exists
-- ============================================================
-- (Already created by migration 0001, but IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS "workspaces_organization_id_idx"
  ON "workspaces" ("organization_id");
