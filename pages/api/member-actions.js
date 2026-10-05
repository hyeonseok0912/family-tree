import presentation from "../../utils/recordPresentation.cjs";
import pool from '../../server/db_pg';
import { assertMutation,requireUser,assertCanManage,assertSuper,sendError,HttpError,audit,tokenHash } from '../../server/auth';
import { lockFamily,memberSnapshot,descendants,saveMember,validateMember } from '../../server/memberService';
const fingerprint=(...values)=>tokenHash(JSON.stringify(values));
const fields=['name','hanja','gender','birth_date','birth_date_precision','death_date','death_date_precision','parent_id','mother_nm','mother_spouse_id','generation','notes'];

export default async function handler(req,res){
 let client,transaction=false;
 try{
  assertMutation(req);const user=await requireUser(req);const body=req.body||{};const action=body.action;
  client=await pool.connect();
  if(action==='deleted'){
   if(!presentation.hasManagementAccess(user))throw new HttpError(403,'삭제 목록 조회 권한이 없습니다.');
   const result=await client.query(`SELECT f.*,u.display_name AS deleted_by_name FROM family_members f LEFT JOIN admin_users u ON f.deleted_by=u.id WHERE f.deleted_at IS NOT NULL ${user.role==='SUPER_ADMIN'?'':'AND f.created_by=$1'} ORDER BY f.deleted_at DESC`,user.role==='SUPER_ADMIN'?[]:[user.id]);
   return res.json(result.rows);
  }
  if(action==='duplicates'){
   if(typeof body.name!=='string'||!body.name.trim())return res.json([]);
   const result=await client.query('SELECT f.id,f.name,f.hanja,f.parent_id,f.generation,f.birth_date,f.birth_date_precision,p.name AS parent_name FROM family_members f LEFT JOIN family_members p ON f.parent_id=p.id WHERE f.deleted_at IS NULL AND f.name=$1 ORDER BY f.id',[body.name.trim()]);
   return res.json(result.rows);
  }
  await client.query('BEGIN');transaction=true;await lockFamily(client);
  const member=await memberSnapshot(client,body.id);
  if(action==='preview-parent'){
   const children=await descendants(client,member.id);
   assertCanManage(user,member,'update');
   await client.query('COMMIT');transaction=false;
   return res.json({count:children.length,children:children.map(m=>({id:m.id,name:m.name,generation:m.generation}))});
  }
  if(action==='delete'){
   assertCanManage(user,member,'delete');
   if(member.deleted_at)throw new HttpError(409,'이미 삭제된 구성원입니다.');
   const children=await descendants(client,member.id);
   const allChildren=await client.query('SELECT 1 FROM family_members WHERE parent_id=$1 LIMIT 1',[member.id]);
   if(allChildren.rowCount||member.spouseList.length)throw new HttpError(409,`연결된 자녀 또는 배우자가 있습니다. 일반 삭제 대신 병합이나 관계 정리를 사용해주세요. (활성 후손 ${children.length}명, 배우자 ${member.spouseList.length}명)`);
   if(typeof body.reason!=='string'||(!body.reason.trim()||body.reason.length>1000))throw new HttpError(400,'삭제 사유를 입력해주세요.');
   const updated=await client.query('UPDATE family_members SET deleted_at=now(),deleted_by=$1,deletion_reason=$2,updated_by=$1,updated_at=now() WHERE id=$3 RETURNING *',[user.id,body.reason.trim(),member.id]);
   await audit(client,user.id,'DELETE','family_members',member.id,member,updated.rows[0],body.reason.trim());
  }else if(action==='restore'){
   assertCanManage(user,member,'delete');
   if(!member.deleted_at)throw new HttpError(409,'삭제된 구성원이 아닙니다.');
   if(member.merged_into)throw new HttpError(409,'병합된 구성원은 일반 복원할 수 없습니다. 작업 이력과 백업으로 관계를 확인해주세요.');
   if(member.parent_id){const parent=await client.query('SELECT id FROM family_members WHERE id=$1 AND deleted_at IS NULL',[member.parent_id]);if(!parent.rowCount)throw new HttpError(409,'부모가 삭제되어 먼저 부모를 복원해야 합니다.');}
   const valid=await validateMember(client,member,user,member);
   const updated=await client.query('UPDATE family_members SET deleted_at=NULL,deleted_by=NULL,deletion_reason=NULL,updated_by=$1,updated_at=now(),generation=$3,mother_nm=$4,mother_spouse_id=$5 WHERE id=$2 RETURNING *',[user.id,member.id,valid.generation,valid.mother_nm,valid.mother_spouse_id]);
   await audit(client,user.id,'RESTORE','family_members',member.id,member,updated.rows[0]);
  }else if(action==='merge-preview'||action==='merge'){
   assertSuper(user);assertCanManage(user,member,'update');
   const source=await memberSnapshot(client,body.source_id);
   if(source.id===member.id||source.deleted_at||member.deleted_at)throw new HttpError(400,'서로 다른 활성 구성원 두 명을 선택해주세요.');
   const targetChildren=await descendants(client,member.id),sourceChildren=await descendants(client,source.id);
   if(targetChildren.some(m=>m.id===source.id)||sourceChildren.some(m=>m.id===member.id))throw new HttpError(400,'조상과 후손은 서로 병합할 수 없습니다.');
   const relatedBefore=(await client.query('SELECT * FROM family_members WHERE parent_id=$1 OR mother_spouse_id=ANY($2::int[])',[source.id,source.spouseList.map(spouse=>spouse.id)])).rows;
   const relationMap=new Map([...targetChildren,...sourceChildren,...relatedBefore].map(row=>[row.id,row]));
   const hash=fingerprint(member,source,targetChildren,sourceChildren,relatedBefore);
   if(action==='merge-preview'){
    await client.query('COMMIT');transaction=false;
    return res.json({target:member,source,children:sourceChildren,spouses:source.spouseList,preview_hash:hash,fields});
   }
   if(body.preview_hash!==hash)throw new HttpError(409,'미리보기 이후 데이터가 변경됐습니다. 미리보기를 다시 확인해주세요.');
   if(typeof body.reason!=='string'||(!body.reason.trim()||body.reason.length>1000))throw new HttpError(400,'병합 사유를 입력해주세요.');
   const merged={...member};for(const field of fields){if(body.choices?.[field]==='source')merged[field]=source[field];}
   const targetSpouses=[...member.spouseList];
   for(const spouse of source.spouseList){
    const existing=targetSpouses.find(s=>s.spouse_nm===spouse.spouse_nm);
    if(existing){
     await client.query('UPDATE family_members SET mother_spouse_id=$1,mother_nm=$2,updated_by=$4,updated_at=now() WHERE mother_spouse_id=$3',[existing.id,existing.spouse_nm,spouse.id,user.id]);
     await client.query('DELETE FROM spouse WHERE id=$1',[spouse.id]);
    }else{await client.query('UPDATE spouse SET husband_id=$1 WHERE id=$2',[member.id,spouse.id]);targetSpouses.push(spouse);}
   }
   await client.query('UPDATE family_members SET parent_id=$1,updated_by=$3,updated_at=now() WHERE parent_id=$2',[member.id,source.id,user.id]);
   merged.spouseList=targetSpouses;
   const saved=await saveMember(client,merged,user,member.id);
   // Recalculate transferred branches even when the retained person's own generation did not change.
   const changed=await client.query(`WITH RECURSIVE tree(id,generation) AS (
    SELECT id,$2::int+1 FROM family_members WHERE parent_id=$1 AND deleted_at IS NULL UNION ALL
    SELECT f.id,t.generation+1 FROM family_members f JOIN tree t ON f.parent_id=t.id WHERE f.deleted_at IS NULL)
    UPDATE family_members f SET generation=t.generation,updated_by=$3,updated_at=now() FROM tree t WHERE f.id=t.id RETURNING f.*`,[member.id,saved.generation,user.id]);
   for(const child of changed.rows)await audit(client,user.id,'MERGE_RELATION','family_members',child.id,relationMap.get(child.id),child,body.reason);
   for(const before of relatedBefore.filter(row=>!changed.rows.some(child=>child.id===row.id))){
    const after=(await client.query('SELECT * FROM family_members WHERE id=$1',[before.id])).rows[0];
    await audit(client,user.id,'MERGE_RELATION','family_members',before.id,before,after,body.reason);
   }
   await client.query('UPDATE family_members SET deleted_at=now(),deleted_by=$1,merged_into=$2,deletion_reason=$3,updated_by=$1,updated_at=now() WHERE id=$4',[user.id,member.id,body.reason,source.id]);
   await audit(client,user.id,'MERGE','family_members',source.id,{target:member,source},{target:await memberSnapshot(client,member.id),source:await memberSnapshot(client,source.id)},body.reason);
  }else throw new HttpError(400,'알 수 없는 작업입니다.');
  await client.query('COMMIT');transaction=false;return res.json({success:true});
 }catch(error){if(transaction&&client)await client.query('ROLLBACK').catch(()=>{});return sendError(res,error);}
 finally{client?.release();}
}
