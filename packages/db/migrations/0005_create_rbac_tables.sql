-- ============================================================
-- RBAC Tables Migration
-- ============================================================

-- 1. Roles table
CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(50) NOT NULL,
  "description" text,
  "scope" varchar(20) NOT NULL,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "roles_name_scope_idx" ON "roles" ("name", "scope");
CREATE INDEX "roles_scope_idx" ON "roles" ("scope");

-- 2. Permissions table
CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL UNIQUE,
  "resource" varchar(50) NOT NULL,
  "action" varchar(50) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "permissions_resource_idx" ON "permissions" ("resource");
CREATE UNIQUE INDEX "permissions_resource_action_idx" ON "permissions" ("resource", "action");

-- 3. Role-Permissions junction table
CREATE TABLE "role_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_idx" ON "role_permissions" ("role_id", "permission_id");
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" ("role_id");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" ("permission_id");

-- 4. User-Roles table
CREATE TABLE "user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "scope" varchar(20) NOT NULL,
  "scope_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "user_roles_user_scope_scope_id_role_id_idx" ON "user_roles" ("user_id", "scope", "scope_id", "role_id");
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" ("user_id");
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" ("role_id");
CREATE INDEX "user_roles_scope_idx" ON "user_roles" ("scope", "scope_id");

-- ============================================================
-- Seed: System Permissions
-- ============================================================

INSERT INTO "permissions" ("name", "resource", "action", "description") VALUES
  -- Organization
  ('organization:create',           'organization', 'create',           'Create organizations'),
  ('organization:update',           'organization', 'update',           'Update organization settings'),
  ('organization:delete',           'organization', 'delete',           'Delete organizations'),
  ('organization:manage_members',   'organization', 'manage_members',   'Add/remove organization members'),
  ('organization:manage_billing',   'organization', 'manage_billing',   'Manage organization billing'),
  ('organization:settings',         'organization', 'settings',         'Access organization settings'),
  -- Workspace
  ('workspace:create',              'workspace',    'create',           'Create workspaces'),
  ('workspace:update',              'workspace',    'update',           'Update workspace settings'),
  ('workspace:delete',              'workspace',    'delete',           'Delete workspaces'),
  ('workspace:manage_members',      'workspace',    'manage_members',   'Add/remove workspace members'),
  ('workspace:manage_billing',      'workspace',    'manage_billing',   'Manage workspace billing'),
  -- Board
  ('board:create',                  'board',        'create',           'Create boards'),
  ('board:update',                  'board',        'update',           'Update boards'),
  ('board:delete',                  'board',        'delete',           'Delete boards'),
  -- Task
  ('task:create',                   'task',         'create',           'Create tasks'),
  ('task:update',                   'task',         'update',           'Update tasks'),
  ('task:delete',                   'task',         'delete',           'Delete tasks'),
  ('task:assign',                   'task',         'assign',           'Assign tasks to members'),
  -- Document
  ('document:create',               'document',     'create',           'Create documents'),
  ('document:update',               'document',     'update',           'Update documents'),
  ('document:delete',               'document',     'delete',           'Delete documents')
ON CONFLICT ("name") DO NOTHING;

-- ============================================================
-- Seed: System Roles (organization scope)
-- ============================================================

INSERT INTO "roles" ("name", "description", "scope", "is_system") VALUES
  ('owner',  'Full control over the organization',          'organization', true),
  ('admin',  'Can manage members and settings',             'organization', true),
  ('member', 'Can access resources and create content',     'organization', true),
  ('guest',  'Read-only access with limited creation',      'organization', true)
ON CONFLICT ("name", "scope") DO NOTHING;

-- ============================================================
-- Seed: System Roles (workspace scope)
-- ============================================================

INSERT INTO "roles" ("name", "description", "scope", "is_system") VALUES
  ('owner',  'Full control over the workspace',             'workspace', true),
  ('admin',  'Can manage members and workspace settings',   'workspace', true),
  ('member', 'Can access resources and create content',     'workspace', true),
  ('guest',  'Read-only access with limited creation',      'workspace', true)
ON CONFLICT ("name", "scope") DO NOTHING;

-- ============================================================
-- Seed: Role-Permission mappings (organization scope)
-- ============================================================

-- Organization Owner → all permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'owner' AND r.scope = 'organization'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Organization Admin
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'admin' AND r.scope = 'organization'
  AND p.name IN (
    'organization:update', 'organization:manage_members', 'organization:settings',
    'workspace:update', 'workspace:manage_members',
    'board:create', 'board:update', 'board:delete',
    'task:create', 'task:update', 'task:delete', 'task:assign',
    'document:create', 'document:update', 'document:delete'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Organization Member
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'member' AND r.scope = 'organization'
  AND p.name IN (
    'board:create', 'board:update', 'board:delete',
    'task:create', 'task:update', 'task:delete', 'task:assign',
    'document:create', 'document:update', 'document:delete'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Organization Guest
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'guest' AND r.scope = 'organization'
  AND p.name IN ('board:create', 'task:create', 'document:create')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- ============================================================
-- Seed: Role-Permission mappings (workspace scope)
-- ============================================================

-- Workspace Owner → all permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'owner' AND r.scope = 'workspace'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Workspace Admin
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'admin' AND r.scope = 'workspace'
  AND p.name IN (
    'workspace:update', 'workspace:manage_members',
    'board:create', 'board:update', 'board:delete',
    'task:create', 'task:update', 'task:delete', 'task:assign',
    'document:create', 'document:update', 'document:delete'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Workspace Member
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'member' AND r.scope = 'workspace'
  AND p.name IN (
    'board:create', 'board:update', 'board:delete',
    'task:create', 'task:update', 'task:delete', 'task:assign',
    'document:create', 'document:update', 'document:delete'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Workspace Guest
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'guest' AND r.scope = 'workspace'
  AND p.name IN ('board:create', 'task:create', 'document:create')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
