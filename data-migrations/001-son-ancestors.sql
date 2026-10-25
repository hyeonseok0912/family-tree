DO $$
DECLARE
  root family_members%ROWTYPE;
  ancestor_id integer;
  previous_id integer := NULL;
  n integer;
  before_row jsonb;
  changed record;
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version='data-001-son-ancestors') THEN
    RETURN;
  END IF;
  LOCK TABLE family_members IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO root FROM family_members WHERE id=1 FOR UPDATE;
  IF NOT FOUND OR root.name <> '손영제' OR root.generation <> 1 OR root.parent_id IS NOT NULL OR root.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Expected active 손영제 (#1), generation 1, without a parent';
  END IF;
  FOR n IN 1..6 LOOP
    INSERT INTO family_members(name,gender,generation,parent_id,birth_date_precision,death_date_precision,created_by,updated_by)
    VALUES ('손'||n, 'M', n, previous_id, 'UNKNOWN', 'UNKNOWN', root.created_by, root.created_by)
    RETURNING id INTO ancestor_id;
    INSERT INTO audit_log(action,entity_type,entity_id,after_data,reason)
    SELECT 'CREATE','family_members',id::text,to_jsonb(f),'손영제 상위 6세대 추가' FROM family_members f WHERE id=ancestor_id;
    previous_id := ancestor_id;
  END LOOP;
  FOR changed IN
    WITH RECURSIVE branch AS (
      SELECT id FROM family_members WHERE id=1
      UNION
      SELECT f.id FROM family_members f JOIN branch b ON f.parent_id=b.id
    ) SELECT f.* FROM family_members f JOIN branch b ON f.id=b.id
  LOOP
    before_row := to_jsonb(changed);
    UPDATE family_members SET generation=generation+6,
      parent_id=CASE WHEN id=1 THEN previous_id ELSE parent_id END,updated_at=now()
    WHERE id=changed.id;
    INSERT INTO audit_log(action,entity_type,entity_id,before_data,after_data,reason)
    SELECT 'RECALCULATE_GENERATION','family_members',id::text,before_row,to_jsonb(f),'손영제 상위 6세대 추가' FROM family_members f WHERE id=changed.id;
  END LOOP;
  INSERT INTO schema_migrations(version) VALUES ('data-001-son-ancestors');
END $$;
