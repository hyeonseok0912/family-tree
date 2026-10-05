const quote=value=>'"'+value.replaceAll('"','""')+'"';
async function restoreData(client,data){
 if(!data?.tables||typeof data.tables!=='object')throw Error('Invalid data snapshot');
 const names=Object.keys(data.tables);
 const actual=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname=current_schema() ORDER BY tablename")).rows.map(row=>row.tablename);
 if(!names.length||names.sort().join('|')!==actual.sort().join('|'))throw Error('Snapshot and destination must contain exactly the same tables. Restore a matching schema first.');
 const foreignKeys=(await client.query("SELECT t.relname AS table_name,c.conname,c.condeferrable,c.condeferred FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE c.contype='f' AND c.connamespace=current_schema()::regnamespace")).rows;
 for(const key of foreignKeys)await client.query(`ALTER TABLE ${quote(key.table_name)} ALTER CONSTRAINT ${quote(key.conname)} DEFERRABLE INITIALLY DEFERRED`);
 await client.query('SET CONSTRAINTS ALL DEFERRED');
 await client.query(`TRUNCATE ${names.map(quote).join(',')} RESTART IDENTITY`);
 for(const name of names){
  const rows=data.tables[name];
  if(!Array.isArray(rows))throw Error('Invalid table rows');
  if(!rows.length)continue;
  const columns=(await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND is_generated=\'NEVER\' ORDER BY ordinal_position',[name])).rows.map(row=>row.column_name);
  if(rows.some(row=>columns.some(key=>!(key in row))))throw Error('Schema columns differ from snapshot: '+name);
  for(let offset=0;offset<rows.length;offset+=100){
   const batch=rows.slice(offset,offset+100),values=[];
   const placeholders=batch.map(row=>'('+columns.map(key=>{const value=row[key];values.push(value!=null&&typeof value==='object'?JSON.stringify(value):value);return '$'+values.length;}).join(',')+')').join(',');
   await client.query(`INSERT INTO ${quote(name)} (${columns.map(quote).join(',')}) OVERRIDING SYSTEM VALUE VALUES ${placeholders}`,values);
  }
 }
 await client.query('SET CONSTRAINTS ALL IMMEDIATE');
 for(const key of foreignKeys)await client.query(`ALTER TABLE ${quote(key.table_name)} ALTER CONSTRAINT ${quote(key.conname)} ${key.condeferrable?'DEFERRABLE INITIALLY '+(key.condeferred?'DEFERRED':'IMMEDIATE'):'NOT DEFERRABLE'}`);
 // A recovery ends all old authenticated sessions.
 if(names.includes('admin_sessions'))await client.query('DELETE FROM admin_sessions');
 const sequences=(await client.query("SELECT table_name,column_name,pg_get_serial_sequence(format('%I.%I',table_schema,table_name),column_name) AS sequence FROM information_schema.columns WHERE table_schema=current_schema()")).rows.filter(row=>row.sequence);
 for(const item of sequences)await client.query(`SELECT setval($1,COALESCE((SELECT max(${quote(item.column_name)}) FROM ${quote(item.table_name)}),1),(SELECT count(*)>0 FROM ${quote(item.table_name)}))`,[item.sequence]);
}
module.exports={restoreData};
