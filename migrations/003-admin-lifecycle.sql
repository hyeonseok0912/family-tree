ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
INSERT INTO schema_migrations(version) VALUES ('003-admin-lifecycle') ON CONFLICT DO NOTHING;
