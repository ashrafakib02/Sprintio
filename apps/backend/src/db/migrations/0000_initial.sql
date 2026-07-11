-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "email_verified" boolean DEFAULT FALSE,
  "created_at" timestamp with time zone DEFAULT NOW(),
  "updated_at" timestamp with time zone DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_agent" text,
  "ip_address" varchar(45),
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT NOW()
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token_hash" varchar(255) NOT NULL UNIQUE,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_session_id" ON "refresh_tokens" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at");
