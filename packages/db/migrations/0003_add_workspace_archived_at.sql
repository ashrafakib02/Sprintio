-- Add archived_at column to workspaces for soft-delete lifecycle (archive → restore → delete)
ALTER TABLE workspaces ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
