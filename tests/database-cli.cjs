const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
require('@next/env').loadEnvConfig(path.join(__dirname,'..'));
const root=path.join(__dirname,'..'),privateDirectory=path.join(root,'.private');
fs.mkdirSync(privateDirectory,{recursive:true});
const file=path.join(privateDirectory,'cli-test-url-'+Date.now()+'.txt');
try {
 const placeholder=spawnSync(process.execPath,['scripts/database.cjs','inspect','--url-file','.private/production-database-url.txt'],{cwd:root,encoding:'utf8'});
 // Only test the prepared placeholder while it has not been filled by the user.
 if(fs.readFileSync(path.join(privateDirectory,'production-database-url.txt'),'utf8').trim()==='PASTE_NEW_PRODUCTION_DATABASE_URL_HERE'){
  assert.equal(placeholder.status,1);assert.ok(placeholder.stderr.includes('No valid PostgreSQL connection'));assert.ok(!placeholder.stdout.includes('localhost'));
 }
 fs.writeFileSync(file,process.env.DATABASE_URL,'utf8');
 const explicit=spawnSync(process.execPath,['scripts/database.cjs','inspect','--url-file',file],{cwd:root,env:{...process.env,DATABASE_URL:'postgresql://invalid:invalid@127.0.0.1:1/wrong_database'},encoding:'utf8'});
 assert.equal(explicit.status,0,'explicit private file must override the default database');
 assert.ok(explicit.stdout.includes('Family members:'));assert.ok(explicit.stdout.includes('Applied migrations:'));
 const target=new URL(process.env.DATABASE_URL);if(target.password)assert.ok(!explicit.stdout.includes(target.password),'inspection must not print credentials');
 console.log('PASS: explicit private connection file overrides defaults, missing connection stops safely, inspection works without exposing passwords');
}finally{fs.unlinkSync(file);}
