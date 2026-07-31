CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  token VARCHAR(64) NOT NULL UNIQUE,
  invited_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX workspace_invitations_workspace_id_email_idx ON workspace_invitations (workspace_id, email);
CREATE UNIQUE INDEX workspace_invitations_token_idx ON workspace_invitations (token);
CREATE INDEX workspace_invitations_workspace_id_idx ON workspace_invitations (workspace_id);
CREATE INDEX workspace_invitations_email_idx ON workspace_invitations (email);
