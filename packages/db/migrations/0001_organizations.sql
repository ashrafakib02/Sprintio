-- Migration: 0001_organizations
-- Description: Create organizations and organization_members tables, add organization_id to workspaces

-- ============================================================
-- 1. Create organizations table
-- ============================================================
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) NOT NULL UNIQUE,
  "description" text,
  "logo" text,
  "website" varchar(500),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "archived_at" timestamp with time zone
);

-- ============================================================
-- 2. Create organization_members table
-- ============================================================
CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "role" varchar(20) NOT NULL DEFAULT 'member',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint: one membership per user per organization
CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_organization_id_user_id_idx"
  ON "organization_members" ("organization_id", "user_id");

-- Index for lookups by user
CREATE INDEX IF NOT EXISTS "organization_members_user_id_idx"
  ON "organization_members" ("user_id");

-- ============================================================
-- 3. Add organization_id column to workspaces
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE "workspaces"
      ADD COLUMN "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
  END IF;
END $$;

-- Index for workspace lookups by organization
CREATE INDEX IF NOT EXISTS "workspaces_organization_id_idx"
  ON "workspaces" ("organization_id");
