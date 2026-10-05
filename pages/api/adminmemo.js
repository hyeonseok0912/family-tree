import pool from '@/server/db_pg';
import { assertMutation,requireUser,assertSuper,audit,sendError,HttpError } from '../../server/auth';
export default async function handler(req,res){
 let client;
 try{
  assertMutation(req);const user=await requireUser(req);assertSuper(user);
  const {action,content}=req.body||{};
  if(action==='get'){const result=await pool.query('SELECT content FROM admin_memo WHERE id=1');return res.json({content:result.rows[0]?.content||''});}
  if(action!=='save')throw new HttpError(400,'알 수 없는 작업입니다.');
  if(user.must_change_password)throw new HttpError(403,'초기 비밀번호를 변경해주세요.');
  if(typeof content!=='string'||content.length>100000)throw new HttpError(400,'메모는 100000자 이하의 문자열이어야 합니다.');
  client=await pool.connect();await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('family-admin-memo'))");
  const before=(await client.query('SELECT content FROM admin_memo WHERE id=1')).rows[0]||{content:''};
  await client.query('INSERT INTO admin_memo(id,content) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET content=excluded.content',[content]);
  await audit(client,user.id,'UPDATE','admin_memo',1,before,{content});
  await client.query('COMMIT');res.json({success:true});
 }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});sendError(res,error);}
 finally{client?.release();}
}
