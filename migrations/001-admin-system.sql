CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS admin_users (
 id serial PRIMARY KEY, username varchar(80) UNIQUE NOT NULL,
 password_hash text NOT NULL, display_name varchar(80) NOT NULL,
 role text NOT NULL DEFAULT 'EDITOR' CHECK (role IN ('SUPER_ADMIN','EDITOR')),
 status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REJECTED')),
 permissions jsonb NOT NULL DEFAULT '{"create":true,"update":true,"delete":true}',
 must_change_password boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), created_by integer REFERENCES admin_users(id), last_login_at timestamptz
);
CREATE TABLE IF NOT EXISTS admin_sessions (
 token_hash text PRIMARY KEY, user_id integer NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_attempts (
 key text PRIMARY KEY, attempts integer NOT NULL, started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_log (
 id bigserial PRIMARY KEY, actor_id integer REFERENCES admin_users(id), action text NOT NULL,
 entity_type text NOT NULL, entity_id text, before_data jsonb, after_data jsonb,
 reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_entity ON audit_log(entity_type,entity_id,created_at DESC);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS created_by integer REFERENCES admin_users(id);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS updated_by integer REFERENCES admin_users(id);
INSERT INTO schema_migrations(version) VALUES ('001-admin-system') ON CONFLICT DO NOTHING;
