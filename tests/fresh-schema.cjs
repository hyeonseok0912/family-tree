const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('@next/env').loadEnvConfig(path.join(__dirname,'..'));
const {Pool}=require('pg'),pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
(async()=>{const client=await pool.connect(),schema='fresh_schema_'+Date.now();try{
 await client.query('BEGIN');await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET LOCAL search_path TO ${schema}`);
 const files=fs.readdirSync(path.join(__dirname,'../migrations')).filter(file=>file.endsWith('.sql')).sort();
 for(let round=0;round<2;round++)for(const file of files)await client.query(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));
 assert.equal((await client.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n,files.length);
 const root=(await client.query("INSERT INTO family_members(name,generation) VALUES('새 DB 테스트',1) RETURNING id,birth_date_precision")).rows[0];
 assert.equal(root.birth_date_precision,'UNKNOWN');
 await client.query("INSERT INTO spouse(husband_id,spouse_nm,order_no) VALUES($1,'배우자',1)",[root.id]);
 assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid='family_members'::regclass AND contype='f'")).rows[0].n,6);
 console.log('PASS: empty database schema installs all migrations twice, preserves migration versions and creates expected date defaults and foreign keys');
}finally{await client.query('ROLLBACK');client.release();}})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>pool.end());
