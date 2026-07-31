-- Migration: 0002_add_org_member_role_check
-- Description: Add CHECK constraint on organization_members.role to restrict valid values

-- Guard: only add if the constraint does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_members_role_check'
      AND conrelid = 'organization_members'::regclass
  ) THEN
    ALTER TABLE "organization_members"
      ADD CONSTRAINT "organization_members_role_check"
      CHECK ("role" IN ('owner', 'admin', 'member', 'guest'));
  END IF;
END $$;
