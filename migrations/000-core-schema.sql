-- For an empty database. Existing tables and rows are left intact.
CREATE TABLE IF NOT EXISTS family_members (
 id serial PRIMARY KEY,name varchar(100) NOT NULL,hanja varchar(100),gender char(1),
 birth_date date,death_date date,generation integer NOT NULL,parent_id integer REFERENCES family_members(id),
 mother_nm varchar(100),notes text,created_at timestamp DEFAULT CURRENT_TIMESTAMP,updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS spouse (
 id serial PRIMARY KEY,husband_id integer NOT NULL REFERENCES family_members(id),spouse_nm varchar(100) NOT NULL,order_no integer NOT NULL,
 created_at timestamp DEFAULT CURRENT_TIMESTAMP,updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_memo(id integer PRIMARY KEY DEFAULT 1,content text NOT NULL);
CREATE TABLE IF NOT EXISTS ping_log(id serial PRIMARY KEY,status varchar(10) NOT NULL,attempts integer NOT NULL,message text,created_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_migrations(version) VALUES ('000-core-schema') ON CONFLICT DO NOTHING;
