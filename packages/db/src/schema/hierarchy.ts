/**
 * Sprintio Hierarchy Schema — Authoritative Reference
 * ====================================================
 *
 * Hierarchy: Organization → Workspace → Project → Task
 *
 * This file documents:
 *  1. The complete entity graph and FK relationships
 *  2. Cascade rules for every FK in the system
 *  3. Index strategy for performance
 *  4. Constraint definitions
 *
 * The actual schema lives in:
 *  - organizations.ts       (table definition)
 *  - workspaces.ts          (table definition)
 *  - projects.ts            (table definition)
 *  - tasks.ts               (table definition)
 *  - relations.ts           (Drizzle relational queries)
 *  - boards.ts, columns.ts, sprints.ts, documents.ts, etc.
 *
 * Migration SQL lives in:
 *  - migrations/0001_organizations.sql
 *  - migrations/0002_add_org_member_role_check.sql
 *  - migrations/0003_add_workspace_archived_at.sql
 *  - migrations/0004_create_workspace_invitations.sql
 *  - migrations/0005_create_rbac_tables.sql
 *  - migrations/0006_hierarchy_enforce_not_null_and_indexes.sql
 */

// ============================================================================
// 1. HIERARCHY FK CHAIN
// ============================================================================
//
// organizations.id  ←── workspaces.organization_id       (NOT NULL, CASCADE)
// workspaces.id     ←── projects.workspace_id             (NOT NULL, CASCADE)
// projects.id       ←── tasks.project_id                  (NOT NULL, CASCADE)
//
// This is the core ownership chain. Deleting any parent cascades through
// the entire subtree below it.

// ============================================================================
// 2. COMPLETE CASCADE RULES
// ============================================================================
//
// | #  | Parent Table        | Child Table          | FK Column           | On Delete   | On Update | Rationale                                                |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// |----|                     |                      |                     |             |           |                                                          |
// |    | *** CORE HIERARCHY ***                                                                                              |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// |  1 | organizations       | workspaces           | organization_id     | CASCADE     | RESTRICT  | Deleting an org removes all its workspaces.              |
// |  2 | workspaces          | projects             | workspace_id        | CASCADE     | RESTRICT  | Deleting a workspace removes all its projects.           |
// |  3 | projects            | tasks                | project_id          | CASCADE     | RESTRICT  | Deleting a project removes all its tasks.                |
// |----|                     |                      |                     |             |           |                                                          |
// |    | *** MEMBERSHIP ***                                                                                                  |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// |  4 | organizations       | organization_members | organization_id     | CASCADE     | RESTRICT  | Deleting an org removes its membership records.          |
// |  5 | users               | organization_members | user_id             | CASCADE     | RESTRICT  | Deleting a user removes their org memberships.           |
// |  6 | workspaces          | workspace_members    | workspace_id        | CASCADE     | RESTRICT  | Deleting a workspace removes its membership records.     |
// |  7 | users               | workspace_members    | user_id             | CASCADE     | RESTRICT  | Deleting a user removes their workspace memberships.     |
// |  8 | workspaces          | workspace_invitations| workspace_id        | CASCADE     | RESTRICT  | Deleting a workspace removes its pending invitations.    |
// |  9 | users               | workspace_invitations| invited_by_id       | CASCADE     | RESTRICT  | Deleting the inviter removes their invitations.          |
// |----|                     |                      |                     |             |           |                                                          |
// |    | *** KANBAN / BOARD ***                                                                                              |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// | 10 | workspaces          | boards               | workspace_id        | CASCADE     | RESTRICT  | Deleting a workspace removes its boards.                 |
// | 11 | projects            | boards               | project_id          | SET NULL    | RESTRICT  | Board outlives project; scope becomes workspace-wide.    |
// | 12 | boards              | board_columns        | board_id            | CASCADE     | RESTRICT  | Deleting a board removes its columns.                    |
// | 13 | boards              | tasks                | board_id            | SET NULL    | RESTRICT  | Task survives board deletion; task still in project.     |
// | 14 | board_columns       | tasks                | column_id           | SET NULL    | RESTRICT  | Task survives column deletion; reassignable.             |
// |----|                     |                      |                     |             |           |                                                          |
// |    | *** SPRINT ***                                                                                                      |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// | 15 | projects            | sprints              | project_id          | CASCADE     | RESTRICT  | Deleting a project removes its sprints.                  |
// | 16 | sprints             | tasks                | sprint_id           | SET NULL    | RESTRICT  | Task survives sprint deletion; sprint is a timebox.      |
// |----|                     |                      |                     |             |           |                                                          |
// |    | *** USER ASSOCIATIONS ***                                                                                           |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// | 17 | users               | tasks                | assignee_id         | SET NULL    | RESTRICT  | Task survives user deletion; assignment cleared.         |
// | 18 | users               | documents            | author_id           | CASCADE     | RESTRICT  | Deleting a user removes their authored documents.        |
// | 19 | users               | attachments          | uploader_id         | CASCADE     | RESTRICT  | Deleting a user removes their uploads.                   |
// | 20 | users               | notifications        | user_id             | CASCADE     | RESTRICT  | Deleting a user removes their notifications.             |
// |----|                     |                      |                     |             |           |                                                          |
// |    | *** DOCUMENTS ***                                                                                                   |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// | 21 | workspaces          | documents            | workspace_id        | CASCADE     | RESTRICT  | Deleting a workspace removes its documents.              |
// | 22 | projects            | documents            | project_id          | SET NULL    | RESTRICT  | Document outlives project; scope becomes workspace-wide. |
// | 23 | tasks               | attachments          | task_id             | SET NULL    | RESTRICT  | Attachment survives task deletion; keeps the file.       |
// | 24 | documents           | attachments          | document_id         | SET NULL    | RESTRICT  | Attachment survives document deletion; keeps the file.   |
// |----|                     |                      |                     |             |           |                                                          |
// |    | *** RBAC ***                                                                                                        |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// | 25 | roles               | role_permissions     | role_id             | CASCADE     | RESTRICT  | Deleting a role removes its permission mappings.         |
// | 26 | permissions         | role_permissions     | permission_id       | CASCADE     | RESTRICT  | Deleting a permission removes its role mappings.         |
// | 27 | users               | user_roles           | user_id             | CASCADE     | RESTRICT  | Deleting a user removes their role assignments.          |
// | 28 | roles               | user_roles           | role_id             | CASCADE     | RESTRICT  | Deleting a role removes all user assignments of it.      |
// |----|                     |                      |                     |             |           |                                                          |
// |    | *** AUTH ***                                                                                                        |
// |----|---------------------|----------------------|---------------------|-------------|-----------|----------------------------------------------------------|
// | 29 | users               | sessions             | user_id             | CASCADE     | RESTRICT  | Deleting a user removes their sessions.                  |
// | 30 | sessions            | refresh_tokens       | session_id          | CASCADE     | RESTRICT  | Deleting a session removes its refresh tokens.           |
// | 31 | users               | refresh_tokens       | user_id             | CASCADE     | RESTRICT  | Deleting a user removes their refresh tokens.            |
// | 32 | users               | email_verification_tokens | user_id          | CASCADE     | RESTRICT  | Deleting a user removes their verification tokens.       |
// | 33 | users               | password_reset_tokens| user_id             | CASCADE     | RESTRICT  | Deleting a user removes their reset tokens.              |
// | 34 | users               | oauth_accounts       | user_id             | CASCADE     | RESTRICT  | Deleting a user removes their OAuth accounts.            |

// ============================================================================
// 3. INDEX STRATEGY
// ============================================================================
//
// Every FK column has an index for JOIN performance. Composite indexes cover
// the most common query patterns.
//
// | Table          | Index Name                              | Columns                              | Purpose                                |
// |----------------|-----------------------------------------|--------------------------------------|----------------------------------------|
// | workspaces     | workspaces_organization_id_idx          | organization_id                      | List workspaces for an org             |
// | workspaces     | workspaces_slug_key (UNIQUE)            | slug                                 | Lookup by slug                         |
// | projects       | projects_workspace_id_idx               | workspace_id                         | List projects in a workspace           |
// | tasks          | tasks_project_id_idx                    | project_id                           | List tasks in a project                |
// | tasks          | tasks_project_id_status_idx             | project_id, status                   | Filter tasks by status in project      |
// | tasks          | tasks_project_id_assignee_id_idx        | project_id, assignee_id              | Filter tasks by assignee in project    |
// | tasks          | tasks_board_id_idx                      | board_id                             | List tasks on a board                  |
// | tasks          | tasks_column_id_idx                     | column_id                            | List tasks in a column                 |
// | tasks          | tasks_board_id_column_id_position_idx   | board_id, column_id, position        | Kanban board rendering                 |
// | tasks          | tasks_sprint_id_idx                     | sprint_id                            | List tasks in a sprint                 |
// | tasks          | tasks_assignee_id_idx                   | assignee_id                          | Tasks assigned to a user               |
// | boards         | boards_workspace_id_idx                 | workspace_id                         | List boards in a workspace             |
// | boards         | boards_project_id_idx                   | project_id                           | List boards for a project              |
// | board_columns  | board_columns_board_id_idx              | board_id                             | List columns in a board                |
// | sprints        | sprints_project_id_idx                  | project_id                           | List sprints in a project              |
// | documents      | documents_workspace_id_idx              | workspace_id                         | List documents in a workspace          |
// | documents      | documents_project_id_idx                | project_id                           | List documents for a project           |
// | documents      | documents_author_id_idx                 | author_id                            | Documents by author                    |
// | attachments    | attachments_uploader_id_idx             | uploader_id                          | Attachments by uploader                |
// | org_members    | org_members_organization_id_user_id_idx | organization_id, user_id (UNIQUE)    | One membership per user per org        |
// | org_members    | org_members_user_id_idx                 | user_id                              | Org memberships for a user             |
// | ws_members     | ws_members_workspace_id_user_id_idx     | workspace_id, user_id (UNIQUE)       | One membership per user per workspace  |
// | ws_members     | ws_members_user_id_idx                  | user_id                              | Workspace memberships for a user       |
// | notifications  | notifications_user_id_idx               | user_id                              | Notifications for a user               |
// | notifications  | notifications_user_id_read_idx          | user_id, read                        | Unread notification count              |

// ============================================================================
// 4. CONSTRAINT DEFINITIONS
// ============================================================================
//
// | Table              | Constraint Name                       | Type    | Definition                                        |
// |--------------------|---------------------------------------|---------|---------------------------------------------------|
// | organizations      | organizations_slug_key                | UNIQUE  | slug                                              |
// | workspaces         | workspaces_slug_key                   | UNIQUE  | slug                                              |
// | organization_members | org_members_org_user_unique          | UNIQUE  | (organization_id, user_id)                        |
// | organization_members | org_members_role_check               | CHECK   | role IN ('owner','admin','member','guest')        |
// | workspace_members  | ws_members_ws_user_unique             | UNIQUE  | (workspace_id, user_id)                           |
// | workspace_invitations | ws_invitations_ws_email_unique      | UNIQUE  | (workspace_id, email)                             |
// | workspace_invitations | ws_invitations_token_unique          | UNIQUE  | token                                             |
// | roles              | roles_name_scope_idx                  | UNIQUE  | (name, scope)                                     |
// | permissions        | permissions_name_key                  | UNIQUE  | name                                              |
// | permissions        | permissions_resource_action_idx       | UNIQUE  | (resource, action)                                |
// | role_permissions   | role_permissions_role_perm_unique     | UNIQUE  | (role_id, permission_id)                          |
// | user_roles         | user_roles_user_scope_role_unique     | UNIQUE  | (user_id, scope, scope_id, role_id)              |
// | users              | users_email_key                       | UNIQUE  | email                                             |
// | users              | users_google_id_key                   | UNIQUE  | google_id                                         |
// | sessions           | (none beyond PK)                      |         |                                                   |
// | refresh_tokens     | refresh_tokens_token_hash_key         | UNIQUE  | token_hash                                        |
// | email_verification | email_verification_token_hash_key     | UNIQUE  | token_hash                                        |
// | password_reset     | password_reset_token_hash_key         | UNIQUE  | token_hash                                        |
// | oauth_accounts     | provider_provider_account_id_idx      | UNIQUE  | (provider, provider_account_id)                   |
// | tasks              | (all FK columns are NOT NULL)         | NOT NULL | project_id, title, status, priority              |
// | projects           | (all FK columns are NOT NULL)         | NOT NULL | workspace_id, name, status                       |
// | workspaces         | (all FK columns are NOT NULL)         | NOT NULL | organization_id, name, plan                      |

// ============================================================================
// 5. DRIZZLE RELATIONAL QUERY PATTERNS
// ============================================================================
//
// Full relation definitions live in relations.ts. Key traversal patterns:
//
//   db.query.organizations.findMany({
//     with: { workspaces: { with: { projects: { with: { tasks: true } } } } }
//   })
//
//   db.query.tasks.findFirst({
//     where: eq(tasks.id, taskId),
//     with: { project: { with: { workspace: { with: { organization: true } } } } }
//   })
//
//   db.query.projects.findMany({
//     where: eq(projects.workspaceId, workspaceId),
//     with: { tasks: true, sprints: true, boards: true }
//   })
