const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const {Pool}=require('pg');
require('@next/env').loadEnvConfig(path.join(__dirname,'..'));
const {hashPassword}=require('../server/security.cjs');
const root=path.join(__dirname,'..'),pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
(async()=>{
 const schema='http_smoke_'+Date.now(),client=await pool.connect();let child;
 const port=3101,base=`http://127.0.0.1:${port}`;
 try{
  await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET search_path TO ${schema}`);
  await client.query('CREATE TABLE family_members(id serial PRIMARY KEY,name varchar(20),hanja varchar(20),gender char(1),birth_date date,death_date date,generation integer,parent_id integer REFERENCES family_members(id),mother_nm varchar(80),notes text,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now()); CREATE TABLE spouse(id serial PRIMARY KEY,husband_id integer REFERENCES family_members(id),spouse_nm varchar(80),order_no integer,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now()); CREATE TABLE admin_memo(id integer PRIMARY KEY,content text)');
  for(const file of fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort())await client.query(fs.readFileSync(path.join(root,'migrations',file),'utf8'));
  const password='isolated-http-test-password';
  await client.query("INSERT INTO admin_users(username,password_hash,display_name,role,status) VALUES('smoke_super',$1,'검증 관리자','SUPER_ADMIN','ACTIVE')",[await hashPassword(password)]);
  const url=new URL(process.env.DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema}`);
  const build=fs.readFileSync(path.join(root,'.verification/latest-build.txt'),'utf8');
  let serverOutput='';
  child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p',String(port),'-H','127.0.0.1'],{cwd:build,env:{...process.env,DATABASE_URL:url.toString(),NODE_ENV:'production'},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',chunk=>serverOutput+=chunk);child.stderr.on('data',chunk=>serverOutput+=chunk);
  let ready=false;
  for(let attempt=0;attempt<100;attempt++){
   if(child.exitCode!==null)throw Error('Verification server exited: '+serverOutput);
   try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert.ok(ready,'Verification server did not start');
  async function post(endpoint,data,cookie=''){
   const response=await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:base},body:JSON.stringify(data)});
   return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  assert.equal((await fetch(base+'/manifest.webmanifest')).status,200);
  assert.equal((await fetch(base+'/icons/icon-192.png')).status,200);
  assert.equal((await fetch(base+'/offline.html')).status,200);
  assert.equal((await post('/api/createmember',{})).status,401);
  const login=await post('/api/auth/login',{username:'smoke_super',password,remember:true});assert.equal(login.status,200);
  const cookie=login.cookie;assert.ok(cookie);
  const session=await fetch(base+'/api/auth/session',{headers:{Cookie:cookie}});assert.equal((await session.json()).user.username,'smoke_super');
  const parent=await post('/api/createmember',{name:'HTTP 시작',gender:'M',generation:1,spouseList:[],birth_date:'1932',birth_date_precision:'YEAR'},cookie);assert.equal(parent.status,201);assert.ok(parent.body.id);
  const childMember=await post('/api/createmember',{name:'HTTP 자녀',gender:'F',parent_id:parent.body.id,generation:999,spouseList:[],birth_date:'0'},cookie);assert.equal(childMember.status,201);assert.equal(childMember.body.generation,2);
  const detail=await post('/api/member',{id:childMember.body.id});assert.equal(detail.status,200);assert.equal(detail.body.birth_date,null);
  for(const key of ['created_at','updated_at','created_by','updated_by','created_by_name','updated_by_name'])assert.equal(Object.hasOwn(detail.body,key),false);
  const adminDetail=await post('/api/member',{id:childMember.body.id},cookie);assert.ok(adminDetail.body.created_at);assert.equal(adminDetail.body.created_by_name,'검증 관리자');
  await client.query("INSERT INTO admin_users(username,password_hash,display_name,role,status,permissions) VALUES('smoke_viewer',$1,'조회 전용','EDITOR','ACTIVE',$2)",[await hashPassword(password),JSON.stringify({create:false,update:false,delete:false})]);
  const viewerLogin=await post('/api/auth/login',{username:'smoke_viewer',password});assert.equal(viewerLogin.status,200);
  const viewerDetail=await post('/api/member',{id:childMember.body.id},viewerLogin.cookie);assert.equal(viewerDetail.status,200);assert.equal(Object.hasOwn(viewerDetail.body,'created_at'),false);assert.equal(Object.hasOwn(viewerDetail.body,'created_by_name'),false);
  assert.equal((await post('/api/auth/audit',{},viewerLogin.cookie)).status,403);
  assert.equal((await post('/api/member-actions',{action:'deleted'},viewerLogin.cookie)).status,403);
  const publicRelatives=await post('/api/relatives',{memberId:parent.body.id,parentId:null});assert.equal(publicRelatives.status,200);assert.equal(publicRelatives.body.children.length,1);assert.equal(Object.hasOwn(publicRelatives.body.children[0],'created_at'),false);
  const adminRelatives=await post('/api/relatives',{memberId:parent.body.id,parentId:null},cookie);assert.ok(adminRelatives.body.children[0].created_at);

  assert.equal((await post('/api/auth/audit',{},cookie)).status,200);
  const listed=await post('/api/tablelist',{name:'HTTP'});assert.equal(listed.status,200);assert.equal(listed.body.length,2);
  assert.equal((await post('/api/tablelist',{startYear:'bad'})).status,400);
  const update=await post('/api/updatemember',{...detail.body,name:'HTTP 수정',spouseList:[]},cookie);assert.equal(update.status,200);
  assert.equal((await post('/api/member-actions',{action:'delete',id:parent.body.id,reason:'검증'},cookie)).status,409);
  assert.equal((await post('/api/member-actions',{action:'delete',id:childMember.body.id,reason:'검증'},cookie)).status,200);
  assert.equal((await post('/api/member-actions',{action:'restore',id:childMember.body.id},cookie)).status,200);
  assert.equal((await post('/api/adminmemo',{action:'save',content:'검증 메모'},cookie)).status,200);
  assert.equal((await post('/api/adminmemo',{action:'get'},cookie)).body.content,'검증 메모');
  assert.equal((await post('/api/auth/verify',{password},cookie)).status,200);
  assert.equal((await post('/api/auth/admin-create',{username:'smoke_editor',display_name:'HTTP 하위 관리자'},cookie)).status,201);
  assert.equal((await post('/api/auth/logout',{},cookie)).status,200);
  assert.equal((await post('/api/updatemember',detail.body,cookie)).status,401);
  console.log('PASS: production HTTP server renders pages/PWA assets and handles login, session, actual create/update/delete/restore, validation, memo, administrator creation and logout');
 }finally{
  if(child&&child.exitCode===null){child.kill();await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,3000);});}
  await client.query('RESET search_path');await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);client.release();
 }
 assert.equal((await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rowCount,0);
 console.log('PASS: HTTP verification database removed; no production genealogy records modified');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>pool.end());
