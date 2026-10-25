const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('@next/env').loadEnvConfig(path.join(__dirname,'..'));
const {Client}=require('pg');
(async()=>{
 const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
 try {
  await client.query('BEGIN');
  await client.query('CREATE SCHEMA ancestor_test');
  await client.query('SET LOCAL search_path TO ancestor_test');
  for(const file of fs.readdirSync(path.join(__dirname,'../migrations')).filter(f=>f.endsWith('.sql')).sort())await client.query(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));
  await client.query("INSERT INTO family_members(name,generation,parent_id) VALUES ('손영제',1,NULL),('자녀',2,1),('다른 계통',1,NULL),('삭제 후손',3,2)");
  await client.query('UPDATE family_members SET deleted_at=now() WHERE id=4');
  const sql=fs.readFileSync(path.join(__dirname,'../data-migrations/001-son-ancestors.sql'),'utf8');
  await client.query(sql);await client.query(sql);
  const rows=(await client.query('SELECT id,name,generation,parent_id FROM family_members ORDER BY id')).rows;
  assert.equal(rows.length,10);assert.equal(rows[0].generation,7);assert.equal(rows[1].generation,8);assert.equal(rows[2].generation,1);assert.equal(rows[3].generation,9);
  assert.equal(rows[0].parent_id,rows[9].id);
  for(let i=4;i<10;i++){assert.equal(rows[i].name,'손'+(i-3));assert.equal(rows[i].generation,i-3);assert.equal(rows[i].parent_id,i===4?null:rows[i-1].id);}
  assert.equal((await client.query('SELECT count(*)::int AS count FROM audit_log')).rows[0].count,9);
  console.log('PASS: ancestor chain, descendant generations, unrelated roots, deleted descendants, audit and repeat application');
 }finally{await client.query('ROLLBACK');await client.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
