const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { Pool, types } = require('pg');
const { hashPassword } = require('../server/security.cjs');
const args=process.argv.slice(2);
const fileIndex=args.indexOf('--url-file');
let connectionString;
let explicitTarget=false;
try {
  if(fileIndex>=0){
    if(!args[fileIndex+1])throw new Error('Specify a private connection file after --url-file.');
    connectionString=fs.readFileSync(path.resolve(args[fileIndex+1]),'utf8').trim();
    args.splice(fileIndex,2);explicitTarget=true;
  }else{
    require('@next/env').loadEnvConfig(path.join(__dirname,'..'));
    connectionString=process.env.DATABASE_URL;
  }
  const target=new URL(connectionString);
  if(!['postgres:','postgresql:'].includes(target.protocol))throw new Error('Invalid protocol');
}catch{
  console.error('No valid PostgreSQL connection configured. Use DATABASE_URL or --url-file with a private file containing the connection URL.');
  process.exit(1);
}
const targetUrl=new URL(connectionString);
types.setTypeParser(1082,(value)=>value);
const pool = new Pool({connectionString,connectionTimeoutMillis:10000});
async function snapshot(client) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const tables=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    const data={created_at:new Date().toISOString(),tables:{},columns:(await client.query("SELECT * FROM information_schema.columns WHERE table_schema='public'")).rows,
      constraints:(await client.query("SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace")).rows};
    for(const row of tables.rows) data.tables[row.tablename]=(await client.query(`SELECT * FROM public."${row.tablename.replaceAll('"','""')}"`)).rows;
    fs.mkdirSync(path.join(__dirname,'../backups'),{recursive:true});
    const file=path.join(__dirname,'../backups',`snapshot-${Date.now()}.json`);
    fs.writeFileSync(file,JSON.stringify(data,null,2));
    await client.query('COMMIT');
    console.log('Data snapshot saved: '+file);
    return file;
  } catch(error) {await client.query('ROLLBACK');throw error;}
}
(async()=>{
  const client=await pool.connect();
  try {
    const mode=args[0]||'backup';
    console.log('Target database host: '+targetUrl.hostname+' | database: '+decodeURIComponent(targetUrl.pathname.slice(1)));
    if(mode==='inspect'){
      await client.query('BEGIN READ ONLY');
      try{
        const exists=await client.query("SELECT to_regclass('public.family_members') AS members,to_regclass('public.admin_users') AS admins,to_regclass('public.schema_migrations') AS migrations");
        if(exists.rows[0].members)console.log('Family members: '+(await client.query('SELECT count(*) AS total FROM public.family_members')).rows[0].total);
        else console.log('Family member table not found. Confirm this is the intended database before migrating.');
        if(exists.rows[0].admins)console.log('Administrator accounts: '+(await client.query('SELECT count(*) AS total FROM public.admin_users')).rows[0].total);
        else console.log('Administrator tables not installed yet.');
        console.log('Applied migrations: '+(exists.rows[0].migrations?(await client.query('SELECT version FROM public.schema_migrations ORDER BY version')).rows.map(row=>row.version).join(', '):'none'));
      }finally{await client.query('ROLLBACK');}
      return;
    }
    if(mode==='backup') return await snapshot(client);
    if(mode==='migrate') {
      await snapshot(client);
      await client.query('BEGIN');
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('family-tree-migrations'))");
        for(const file of fs.readdirSync(path.join(__dirname,'../migrations')).filter(f=>f.endsWith('.sql')).sort())
          await client.query(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));
        await client.query('COMMIT');
        console.log('Migrations completed.');
      }catch(error){await client.query('ROLLBACK');throw error;}
      return;
    }
    if(mode==='restore') {
      if(args[2]!=='--confirm-replace-all-data')throw new Error('Restore requires snapshot path and --confirm-replace-all-data. Stop website writes before recovery.');
      const source=path.resolve(args[1]||'');
      const data=JSON.parse(fs.readFileSync(source,'utf8'));
      await snapshot(client);
      await client.query('BEGIN');
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('family-tree-migrations'))");
        await require('./restore-data.cjs').restoreData(client,data);
        await client.query('COMMIT');console.log('Data restored; existing sessions revoked.');
      }catch(error){await client.query('ROLLBACK');throw error;}
      return;
    }
    if(mode==='bootstrap') {
      await client.query('BEGIN');
      try {
        await client.query('LOCK TABLE admin_users IN SHARE ROW EXCLUSIVE MODE');
        const result=await client.query('SELECT count(*)::int AS count FROM admin_users');
        if(result.rows[0].count) throw new Error('Bootstrap only works before the first account exists.');
        const password=randomBytes(18).toString('base64url');
        await client.query("INSERT INTO admin_users(username,password_hash,display_name,role,status,must_change_password) VALUES('admin',$1,'상위 관리자','SUPER_ADMIN','ACTIVE',true)",[await hashPassword(password)]);
        fs.mkdirSync(path.join(__dirname,'../.private'),{recursive:true});
        const credentialsFile=explicitTarget?'production-initial-admin.txt':'initial-admin.txt';
        fs.writeFileSync(path.join(__dirname,'../.private',credentialsFile),`아이디: admin\n임시 비밀번호: ${password}\n로그인 후 비밀번호를 변경해주세요.\n`);
        await client.query('COMMIT');
        console.log('Initial credentials saved in .private/'+credentialsFile+' (excluded from Git).');
      }catch(error){await client.query('ROLLBACK');throw error;}
      return;
    }
    throw new Error('Usage: node scripts/database.cjs inspect|backup|migrate|bootstrap|restore SNAPSHOT --confirm-replace-all-data [--url-file PRIVATE_FILE]');
  }finally{client.release();}
})().catch(error=>{console.error('Database operation failed: '+error.message);process.exitCode=1;}).finally(()=>pool.end());
