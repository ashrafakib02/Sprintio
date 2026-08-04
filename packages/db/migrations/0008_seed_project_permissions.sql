-- ============================================================
-- Seed Project Permissions and Roles
-- ============================================================

-- 1. Project permissions
INSERT INTO "permissions" ("name", "resource", "action", "description") VALUES
  ('project:create',         'project', 'create',         'Create projects in a workspace'),
  ('project:read',           'project', 'read',           'View project details and contents'),
  ('project:update',         'project', 'update',         'Update project settings and metadata'),
  ('project:delete',         'project', 'delete',         'Delete projects'),
  ('project:manage_members', 'project', 'manage_members', 'Add/remove project members and assign roles')
ON CONFLICT ("name") DO NOTHING;

-- 2. Project-scoped roles
INSERT INTO "roles" ("name", "description", "scope", "is_system") VALUES
  ('admin',  'Full control over the project',          'project', true),
  ('member', 'Can create and manage content',           'project', true),
  ('viewer', 'Read-only access to project contents',    'project', true)
ON CONFLICT ("name", "scope") DO NOTHING;

-- 3. Project Admin → all project permissions + child resources
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'admin' AND r.scope = 'project'
  AND p.name IN (
    'project:read', 'project:update', 'project:delete', 'project:manage_members',
    'board:create', 'board:update', 'board:delete',
    'task:create', 'task:update', 'task:delete', 'task:assign',
    'document:create', 'document:update', 'document:delete'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- 4. Project Member → read + content management (no project:delete or manage_members)
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'member' AND r.scope = 'project'
  AND p.name IN (
    'project:read',
    'board:create', 'board:update',
    'task:create', 'task:update', 'task:delete', 'task:assign',
    'document:create', 'document:update'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- 5. Project Viewer → read-only
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'viewer' AND r.scope = 'project'
  AND p.name IN ('project:read')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
