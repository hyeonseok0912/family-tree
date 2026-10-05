const assert=require('node:assert/strict');
const {Pool}=require('pg');
require('@next/env').loadEnvConfig(process.cwd());
const {restoreData}=require('../scripts/restore-data.cjs');
const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
(async()=>{const client=await pool.connect();const schema='restore_test_'+Date.now();try{
 await client.query('BEGIN');await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET LOCAL search_path TO ${schema}`);
 await client.query('CREATE TABLE people(id serial PRIMARY KEY,parent_id integer REFERENCES people(id),label text,metadata jsonb); CREATE TABLE partner(id serial PRIMARY KEY,person_id integer REFERENCES people(id)); ALTER TABLE people ADD COLUMN partner_id integer REFERENCES partner(id)');
 const snapshot={tables:{people:[{id:10,parent_id:20,label:'child',metadata:{value:'안전'},partner_id:3},{id:20,parent_id:null,label:'root',metadata:null,partner_id:null}],partner:[{id:3,person_id:10}]}};
 await restoreData(client,snapshot);
 assert.equal((await client.query('SELECT count(*)::int AS n FROM people')).rows[0].n,2);
 assert.equal((await client.query("INSERT INTO people(label) VALUES('next') RETURNING id")).rows[0].id,21);
 assert.deepEqual((await client.query('SELECT metadata FROM people WHERE id=10')).rows[0].metadata,{value:'안전'});
 assert.equal((await client.query("SELECT condeferrable FROM pg_constraint WHERE conname='people_parent_id_fkey' AND connamespace=current_schema()::regnamespace")).rows[0].condeferrable,false);
 console.log('PASS: isolated snapshot recovery restores cyclic foreign keys, Unicode JSON, sequence values and original constraint settings');
}finally{await client.query('ROLLBACK');client.release();}})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>pool.end());
