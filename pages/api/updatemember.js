import pool from '../../server/db_pg';
import { assertMutation, requireUser, sendError, HttpError } from '../../server/auth';
import { saveMember } from '../../server/memberService';
export default async function handler(req,res){
 let client;
 try {
  assertMutation(req); const user=await requireUser(req);
  const id=Number(req.body?.id);if(!Number.isInteger(id)||id<1)throw new HttpError(400,'구성원 ID가 필요합니다.');
  client=await pool.connect();await client.query('BEGIN');
  const saved=await saveMember(client,req.body,user,id);
  await client.query('COMMIT');res.json({success:true,member:saved});
 }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});sendError(res,error);}
 finally{client?.release();}
}
