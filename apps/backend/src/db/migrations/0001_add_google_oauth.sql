-- Migration: Add Google OAuth support
-- 1. Make password_hash nullable (OAuth users don't have passwords)
-- 2. Add google_id and avatar_url columns to users
-- 3. Create oauth_accounts table

-- Make password_hash nullable for OAuth-only users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add Google-specific columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id varchar(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url varchar(500);

-- Create oauth_accounts table for generic OAuth provider linking
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL,
  provider_account_id varchar(255) NOT NULL,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  scope text,
  token_type varchar(50),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);

-- Index for fast lookups by provider + account ID
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider_account
  ON oauth_accounts(provider, provider_account_id);

-- Index for fast lookups by user ID
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id
  ON oauth_accounts(user_id);
