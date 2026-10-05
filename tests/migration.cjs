const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('@next/env').loadEnvConfig(path.join(__dirname,'..'));
const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
(async()=>{
 const client=await pool.connect();const schema='family_test_'+Date.now();
 try {
  await client.query('BEGIN');
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET LOCAL search_path TO ${schema},public`);
  await client.query('CREATE TABLE family_members (LIKE public.family_members INCLUDING DEFAULTS)');
  const sql=fs.readFileSync(path.join(__dirname,'../migrations/001-admin-system.sql'),'utf8');
  await client.query(sql);await client.query(sql);
  const account=await client.query("INSERT INTO admin_users(username,password_hash,display_name,role,status) VALUES('test','hash','test','EDITOR','ACTIVE') RETURNING id");
  const id=account.rows[0].id;
  await client.query("INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES('test-token',$1,now()+interval '1 hour')",[id]);
  assert.equal((await client.query("SELECT u.id FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash='test-token' AND s.expires_at>now() AND u.status='ACTIVE'")).rowCount,1);
  await client.query("UPDATE admin_users SET status='SUSPENDED' WHERE id=$1",[id]);
  assert.equal((await client.query("SELECT u.id FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash='test-token' AND s.expires_at>now() AND u.status='ACTIVE'")).rowCount,0);
  console.log('PASS: migration runs twice; session lookup rejects suspended accounts');
 }finally{await client.query('ROLLBACK');client.release();}
 assert.equal((await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rowCount,0);
 console.log('PASS: isolated database test schema rolled back; no production rows changed');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
