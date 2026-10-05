import pool from '../../server/db_pg';
import { assertMutation, requireUser, sendError } from '../../server/auth';
import { saveMember } from '../../server/memberService';
export default async function handler(req,res){
 let client;
 try {
  assertMutation(req); const user=await requireUser(req);
  client=await pool.connect();await client.query('BEGIN');
  const saved=await saveMember(client,req.body||{},user);
  await client.query('COMMIT');res.status(201).json(saved);
 }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});sendError(res,error);}
 finally{client?.release();}
}
