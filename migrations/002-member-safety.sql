ALTER TABLE family_members ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS deleted_by integer REFERENCES admin_users(id);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS deletion_reason text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS merged_into integer REFERENCES family_members(id);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS mother_spouse_id integer REFERENCES spouse(id);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS birth_date_precision text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS death_date_precision text;
UPDATE family_members SET birth_date_precision=CASE WHEN birth_date IS NULL THEN 'UNKNOWN' WHEN to_char(birth_date,'MM-DD')='01-01' THEN 'LEGACY' ELSE 'DAY' END WHERE birth_date_precision IS NULL;
UPDATE family_members SET death_date_precision=CASE WHEN death_date IS NULL THEN 'UNKNOWN' WHEN to_char(death_date,'MM-DD')='01-01' THEN 'LEGACY' ELSE 'DAY' END WHERE death_date_precision IS NULL;
ALTER TABLE family_members ALTER COLUMN birth_date_precision SET DEFAULT 'UNKNOWN';
ALTER TABLE family_members ALTER COLUMN death_date_precision SET DEFAULT 'UNKNOWN';
CREATE INDEX IF NOT EXISTS family_members_parent ON family_members(parent_id);
CREATE INDEX IF NOT EXISTS family_members_created_by ON family_members(created_by);
UPDATE family_members f SET mother_spouse_id=s.id FROM spouse s
WHERE f.mother_spouse_id IS NULL AND f.parent_id=s.husband_id AND f.mother_nm=s.spouse_nm
 AND (SELECT count(*) FROM spouse other WHERE other.husband_id=f.parent_id AND other.spouse_nm=f.mother_nm)=1;
INSERT INTO schema_migrations(version) VALUES ('002-member-safety') ON CONFLICT DO NOTHING;
