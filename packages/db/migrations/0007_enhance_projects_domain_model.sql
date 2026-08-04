-- ============================================================
-- Enhance Projects Domain Model Migration
-- ============================================================

-- 1. Create enum types
CREATE TYPE "project_status" AS ENUM ('active', 'on_hold', 'completed', 'archived');
CREATE TYPE "project_priority" AS ENUM ('none', 'low', 'medium', 'high', 'urgent');
CREATE TYPE "project_visibility" AS ENUM ('workspace', 'public');

-- 2. Add slug column (not null, unique per workspace)
ALTER TABLE "projects" ADD COLUMN "slug" varchar(100);
UPDATE "projects" SET "slug" = LOWER(REPLACE("name", ' ', '-'));
ALTER TABLE "projects" ALTER COLUMN "slug" SET NOT NULL;

-- 3. Add priority column
ALTER TABLE "projects" ADD COLUMN "priority" varchar(20) NOT NULL DEFAULT 'none';

-- 4. Add visibility column
ALTER TABLE "projects" ADD COLUMN "visibility" varchar(20) NOT NULL DEFAULT 'workspace';

-- 5. Add deleted_at column for soft delete
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp with time zone;

-- 6. Migrate status column to use enum type
ALTER TABLE "projects" ALTER COLUMN "status" TYPE varchar(20);
UPDATE "projects" SET "status" = 'active' WHERE "status" IS NULL;

-- 7. Create unique composite index: one slug per workspace
CREATE UNIQUE INDEX "projects_workspace_id_slug_idx" ON "projects" ("workspace_id", "slug");

-- 8. Create composite index for workspace + status queries
CREATE INDEX "projects_workspace_id_status_idx" ON "projects" ("workspace_id", "status");

-- 9. Add CHECK constraints for enum validation
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_check"
  CHECK ("status" IN ('active', 'on_hold', 'completed', 'archived'));

ALTER TABLE "projects" ADD CONSTRAINT "projects_priority_check"
  CHECK ("priority" IN ('none', 'low', 'medium', 'high', 'urgent'));

ALTER TABLE "projects" ADD CONSTRAINT "projects_visibility_check"
  CHECK ("visibility" IN ('workspace', 'public'));
