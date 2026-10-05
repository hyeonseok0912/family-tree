const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const swc=require('next/dist/build/swc');
require('@next/env').loadEnvConfig(path.join(__dirname,'..'));
const {Pool,types}=require('pg');types.setTypeParser(1082,value=>value);const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
const root=path.join(__dirname,'..'),codeCache=new Map(),moduleCache=new Map();
async function prepare(file){
 if(codeCache.has(file))return;
 const source=fs.readFileSync(file,'utf8');
 const compiled=await swc.transform(source,{filename:file,jsc:{parser:{syntax:'ecmascript'},target:'es2020'},module:{type:'commonjs'}});
 codeCache.set(file,compiled.code);
 for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)){
  const name=match[1];if(name.startsWith('.')&&name!=='./db_pg'&&!name.endsWith('.cjs')){
   let resolved=path.resolve(path.dirname(file),name);if(!path.extname(resolved))resolved+='.js';await prepare(resolved);
  }
 }
}
function load(file,db){
 if(moduleCache.has(file))return moduleCache.get(file).exports;
 const module={exports:{}};moduleCache.set(file,module);
 vm.runInNewContext(codeCache.get(file),{module,exports:module.exports,Buffer,Date,console,process,
  require(name){
   if(name.endsWith('/db_pg')||name==='./db_pg')return {default:db,__esModule:true};
   if(name.startsWith('.')){let resolved=path.resolve(path.dirname(file),name);if(!path.extname(resolved))resolved+='.js';return resolved.endsWith('.cjs')?require(resolved):load(resolved,db);}
   return require(name);
  }},{filename:file});return module.exports;
}
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};}
(async()=>{
 const client=await pool.connect();const schema='family_integration_'+Date.now();
 try{
  await client.query('BEGIN');await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET LOCAL search_path TO ${schema},public`);
  await client.query(`CREATE TABLE family_members(id serial PRIMARY KEY,name varchar(20),hanja varchar(20),gender char(1),birth_date date,death_date date,generation integer,parent_id integer REFERENCES family_members(id),mother_nm varchar(80),notes text,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
   CREATE TABLE spouse(id serial PRIMARY KEY,husband_id integer REFERENCES family_members(id),spouse_nm varchar(80),order_no integer,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
   CREATE TABLE admin_memo(id integer PRIMARY KEY,content text);`);
  for(const file of ['000-core-schema.sql','001-admin-system.sql','002-member-safety.sql','003-admin-lifecycle.sql'])await client.query(fs.readFileSync(path.join(root,'migrations',file),'utf8'));
  const db={query:async(sql,values)=>{
   if(sql==='BEGIN')return client.query('SAVEPOINT api_call');
   if(sql==='COMMIT')return client.query('RELEASE SAVEPOINT api_call');
   if(sql==='ROLLBACK')return client.query('ROLLBACK TO SAVEPOINT api_call');
   return client.query(sql,values);
  },connect:async()=>({...db,release(){}})};
  const servicePath=path.join(root,'server/memberService.js'),authPath=path.join(root,'pages/api/auth/[action].js'),actionsPath=path.join(root,'pages/api/member-actions.js');
  await prepare(servicePath);await prepare(authPath);await prepare(actionsPath);
  const {saveMember,memberSnapshot}=load(servicePath,db),auth=load(authPath,db).default,actions=load(actionsPath,db).default;
  const {hashPassword}=require('../server/security.cjs');
  const password='integration-only-long-password';
  const hash=await hashPassword(password);
  const admin=(await client.query("INSERT INTO admin_users(username,password_hash,display_name,role,status) VALUES('super',$1,'super','SUPER_ADMIN','ACTIVE') RETURNING *",[hash])).rows[0];
  const editor=(await client.query("INSERT INTO admin_users(username,password_hash,display_name,role,status) VALUES('editor',$1,'editor','EDITOR','ACTIVE') RETURNING *",[hash])).rows[0];
  let res=response();await auth({method:'POST',query:{action:'login'},headers:{'content-type':'application/json',host:'localhost:3000'},socket:{remoteAddress:'test'},body:{username:'super',password,remember:true}},res);
  assert.equal(res.statusCode,200);assert.ok(res.headers['Set-Cookie'].includes('HttpOnly'));assert.ok(res.headers['Set-Cookie'].includes('SameSite=Strict'));
  const token=res.headers['Set-Cookie'].split(';')[0].split('=')[1];
  const req=(body)=>({method:'POST',headers:{'content-type':'application/json',host:'localhost:3000'},cookies:{family_session:token},socket:{remoteAddress:'test'},body});
  res=response();await auth({...req({}),query:{action:'session'},method:'GET'},res);assert.equal(res.body.user.id,admin.id);assert.ok(!res.body.user.password_hash);
  res=response();await auth({...req({username:'super',password:'bad'}),query:{action:'login'}},res);assert.equal(res.statusCode,401);
  console.log('PASS: actual login/session routes, cookie flags, bad credentials and public user shape');
  res=response();await auth({...req({id:editor.id,role:'EDITOR',status:'ACTIVE',permissions:{create:true,update:true,delete:true}}),query:{action:'admin-update'}},res);assert.equal(res.statusCode,200,'authenticated super can manage accounts without another password check');
  res=response();await auth({...req({id:editor.id,role:'EDITOR',status:'ACTIVE',permissions:{create:true,update:true,delete:true}}),cookies:{},query:{action:'admin-update'}},res);assert.equal(res.statusCode,401,'anonymous account management remains blocked');

  for(let index=0;index<12;index++){res=response();await auth({...req({password}),query:{action:'verify'}},res);assert.equal(res.statusCode,200,'successful checks must never accumulate a lock');}
  for(let index=0;index<3;index++){res=response();await auth({...req({password:'wrong-test-password'}),query:{action:'verify'}},res);assert.equal(res.statusCode,401);}
  res=response();await auth({...req({password}),query:{action:'verify'}},res);assert.equal(res.statusCode,200);
  const attemptKey=require('../server/security.cjs').tokenHash('test:super');
  assert.equal((await client.query('SELECT attempts FROM auth_attempts WHERE key=$1',[attemptKey])).rowCount,0,'successful verification clears prior failures');
  for(let index=0;index<10;index++){res=response();await auth({...req({password:'wrong-test-password'}),query:{action:'verify'}},res);assert.equal(res.statusCode,401);}
  res=response();await auth({...req({password}),query:{action:'verify'}},res);assert.equal(res.statusCode,429,'repeated failures still block correct guesses during the lock');
  res=response();await auth({...req({username:'super',password}),query:{action:'login'}},res);assert.equal(res.statusCode,429,'login shares the credential lock');
  await client.query("UPDATE auth_attempts SET started_at=now()-interval '16 minutes' WHERE key=$1",[attemptKey]);
  res=response();await auth({...req({password}),query:{action:'verify'}},res);assert.equal(res.statusCode,200,'expired lock allows successful retry');
  console.log('PASS: repeated valid password checks never lock; only failures accumulate, success resets and 15-minute lock remains enforced');

  res=response();await auth({...req({password}),query:{action:'verify'}},res);assert.equal(res.statusCode,200);
  res=response();await auth({...req({username:'created_editor',display_name:'created editor'}),query:{action:'admin-create'}},res);assert.equal(res.statusCode,201);assert.ok(res.body.temporary_password);
  const created=(await client.query("SELECT * FROM admin_users WHERE username='created_editor'")).rows[0];assert.equal(created.must_change_password,true);
  res=response();await auth({...req({id:admin.id}),query:{action:'admin-delete'}},res);assert.equal(res.statusCode,400);
  res=response();await auth({...req({id:created.id}),query:{action:'admin-delete'}},res);assert.equal(res.statusCode,200);
  res=response();await auth({...req({}),query:{action:'admins'}},res);assert.ok(!res.body.some(u=>u.id===created.id));assert.ok(res.body.every(u=>!u.password_hash));
  res=response();await actions({...req({action:'duplicates',name:'test'}),headers:{...req({}).headers,origin:'https://different.invalid'}},res);assert.equal(res.statusCode,403);
  console.log('PASS: administrator creation and soft deletion, forced password change, last-super protection and cross-origin rejection');

  const base={name:'root',gender:'M',generation:1,parent_id:null,spouseList:[],birth_date:'1932',birth_date_precision:'YEAR',death_date:'0'};
  const parent=await saveMember(db,base,admin);
  const child=await saveMember(db,{...base,name:'child',parent_id:parent.id,generation:999,spouseList:[{spouse_nm:'wife'}]},editor);
  const grandchild=await saveMember(db,{...base,name:'grandchild',parent_id:child.id},editor);
  assert.equal(child.generation,2);assert.equal(child.birth_date_precision,'YEAR');assert.equal(grandchild.generation,3);
  await assert.rejects(()=>saveMember(db,{...base,name:'other'},editor,parent.id),/권한/);
  await assert.rejects(()=>saveMember(db,{...base,parent_id:grandchild.id},admin,parent.id),/후손/);
  await assert.rejects(()=>saveMember(db,{...base,birth_date:'2023-02-29'},admin),/날짜/);
  console.log('PASS: server owns generation calculation, ownership guard, descendant-cycle and invalid-date rejection');
  const changed=await saveMember(db,{...parent,generation:5,spouseList:[]},admin,parent.id);
  assert.equal(changed.generation,5);assert.equal((await memberSnapshot(db,grandchild.id)).generation,7);
  const wife=(await memberSnapshot(db,child.id)).spouseList[0];
  const withMother=await saveMember(db,{...(await memberSnapshot(db,grandchild.id)),mother_spouse_id:wife.id,spouseList:[]},editor,grandchild.id);
  assert.equal(withMother.mother_nm,'wife');
  await saveMember(db,{...(await memberSnapshot(db,child.id)),spouseList:[{...wife,spouse_nm:'renamed wife'}]},admin,child.id);
  assert.equal((await memberSnapshot(db,grandchild.id)).mother_nm,'renamed wife');
  console.log('PASS: descendant generation recalculation; spouse IDs survive renaming and linked mother names update');
  res=response();await actions(req({action:'delete',id:child.id,reason:'test'}),res);assert.equal(res.statusCode,409);
  const duplicate=await saveMember(db,{...base,name:'duplicate'},admin);
  res=response();await actions(req({action:'delete',id:duplicate.id,reason:'test'}),res);assert.equal(res.statusCode,200);assert.ok((await memberSnapshot(db,duplicate.id)).deleted_at);
  res=response();await actions(req({action:'restore',id:duplicate.id}),res);assert.equal(res.statusCode,200);assert.equal((await memberSnapshot(db,duplicate.id)).deleted_at,null);
  console.log('PASS: related member deletion blocked; soft delete and restore preserve data');
  await saveMember(db,{...(await memberSnapshot(db,parent.id)),spouseList:[{spouse_nm:'shared'}]},admin,parent.id);
  const sourceWithSpouses=await saveMember(db,{...duplicate,spouseList:[{spouse_nm:'shared'},{spouse_nm:'unique'}]},admin,duplicate.id);
  const branch=await saveMember(db,{...base,name:'transfer',parent_id:duplicate.id,mother_spouse_id:sourceWithSpouses.spouseList[1].id},editor);
  const branchChild=await saveMember(db,{...base,name:'transfer child',parent_id:branch.id},editor);
  res=response();await actions(req({action:'merge-preview',id:parent.id,source_id:duplicate.id}),res);assert.equal(res.statusCode,200);const preview=res.body;
  res=response();await actions(req({action:'merge',id:parent.id,source_id:duplicate.id,preview_hash:'outdated',reason:'test'}),res);assert.equal(res.statusCode,409);
  res=response();await actions(req({action:'merge',id:parent.id,source_id:duplicate.id,preview_hash:preview.preview_hash,choices:{},reason:'same person'}),res);assert.equal(res.statusCode,200);assert.equal((await memberSnapshot(db,duplicate.id)).merged_into,parent.id);
  const transferred=await memberSnapshot(db,branch.id);assert.equal(transferred.parent_id,parent.id);assert.equal(transferred.generation,6);assert.equal((await memberSnapshot(db,branchChild.id)).generation,7);
  assert.equal((await client.query('SELECT husband_id FROM spouse WHERE id=$1',[transferred.mother_spouse_id])).rows[0].husband_id,parent.id);
  assert.equal((await memberSnapshot(db,parent.id)).spouseList.length,2);
  console.log('PASS: merge transfers spouses and children, deduplicates matching spouses, preserves mother IDs and recalculates entire transferred branch');
  const logs=await client.query("SELECT action FROM audit_log WHERE entity_type='family_members'");assert.ok(logs.rows.some(row=>row.action==='MERGE'));assert.ok(logs.rows.some(row=>row.action==='RESTORE'));
  console.log('PASS: merge preview concurrency check, actual merge, and create/update/delete/restore/merge audit records');
 }finally{await client.query('ROLLBACK');client.release();}
 assert.equal((await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rowCount,0);
 console.log('PASS: all integration data/schema rolled back; no production members modified');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>pool.end());
