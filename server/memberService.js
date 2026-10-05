import { HttpError, assertCanManage, audit } from './auth';
import dates from '../utils/dates.cjs';
const nullable=(value)=>typeof value==='string'?value.trim()||null:value??null;
const positive=(value,label)=>{const number=Number(value);if(!Number.isInteger(number)||number<1||number>2147483647)throw new HttpError(400,`${label} 값이 올바르지 않습니다.`);return number;};
export async function lockFamily(client){await client.query('LOCK TABLE family_members IN SHARE ROW EXCLUSIVE MODE');}
export async function descendants(client,id){return (await client.query(`WITH RECURSIVE tree(id) AS (
 SELECT id FROM family_members WHERE parent_id=$1 AND deleted_at IS NULL UNION
 SELECT f.id FROM family_members f JOIN tree t ON f.parent_id=t.id WHERE f.deleted_at IS NULL)
 SELECT f.* FROM family_members f JOIN tree t ON f.id=t.id`,[id])).rows;}
export async function memberSnapshot(client,id){
 id=positive(id,'구성원');
 const member=(await client.query('SELECT * FROM family_members WHERE id=$1',[id])).rows[0];
 if(!member)throw new HttpError(404,'구성원을 찾을 수 없습니다.');
 return {...member,spouseList:(await client.query('SELECT * FROM spouse WHERE husband_id=$1 ORDER BY order_no,id',[id])).rows};
}
export async function validateMember(client,body,user,previous){
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>20)throw new HttpError(400,'이름을 1~20자로 입력해주세요.');
 if(body.hanja&& (typeof body.hanja!=='string'||body.hanja.length>20))throw new HttpError(400,'한자는 20자 이하로 입력해주세요.');
 if(body.gender&&!['M','F'].includes(body.gender))throw new HttpError(400,'성별 값이 올바르지 않습니다.');
 if(body.notes&& (typeof body.notes!=='string'||body.notes.length>10000))throw new HttpError(400,'비고는 10000자 이하로 입력해주세요.');
 let birth,death;try{birth=dates.parseDateInput(body.birth_date,body.birth_date_precision);death=dates.parseDateInput(body.death_date,body.death_date_precision);}catch(error){throw new HttpError(400,error.message);}
 if(!dates.datesInOrder(birth,death))throw new HttpError(400,'사망일은 출생일보다 빠를 수 없습니다.');
 const parentId=body.parent_id?positive(body.parent_id,'부모'):null;
 const children=previous?await descendants(client,previous.id):[];
 if(previous&&parentId&&(parentId===previous.id||children.some(m=>m.id===parentId)))throw new HttpError(400,'본인이나 후손을 부모로 지정할 수 없습니다.');
 let generation;
 if(parentId){const parent=(await client.query('SELECT * FROM family_members WHERE id=$1 AND deleted_at IS NULL',[parentId])).rows[0];if(!parent)throw new HttpError(400,'부모가 존재하지 않거나 삭제되었습니다.');generation=positive(positive(parent.generation,'부모 세대')+1,'세대');}
 else generation=positive(body.generation||previous?.generation||1,'세대');
 if(previous&&(parentId!==previous.parent_id||generation!==previous.generation)&&user.role!=='SUPER_ADMIN'&&children.some(m=>!assertManageable(user,m)))throw new HttpError(403,'타인이 등록한 후손에 영향을 주는 부모·세대 변경은 상위 관리자만 가능합니다.');
 if(!Array.isArray(body.spouseList))throw new HttpError(400,'배우자 목록이 올바르지 않습니다.');
 const spouses=body.spouseList.map((s,index)=>{if(typeof s.spouse_nm!=='string'||!s.spouse_nm.trim()||s.spouse_nm.length>80)throw new HttpError(400,'배우자 이름은 1~80자로 입력해주세요.');return {id:s.id||null,spouse_nm:s.spouse_nm.trim(),order_no:index+1};});
 if(new Set(spouses.map(s=>s.spouse_nm)).size!==spouses.length)throw new HttpError(400,'동일 배우자 이름이 중복되었습니다.');
 let motherId=body.mother_spouse_id?positive(body.mother_spouse_id,'어머니'):null;
 let motherName=nullable(body.mother_nm);
 if(motherId){const mother=(await client.query('SELECT * FROM spouse WHERE id=$1 AND husband_id=$2',[motherId,parentId])).rows[0];if(!mother)throw new HttpError(400,'선택한 어머니가 부모의 배우자가 아닙니다.');motherName=mother.spouse_nm;}
 else if(motherName&&parentId){const matches=(await client.query('SELECT * FROM spouse WHERE husband_id=$1 AND spouse_nm=$2',[parentId,motherName])).rows;if(matches.length===1)motherId=matches[0].id;}
 return {name:body.name.trim(),hanja:nullable(body.hanja),gender:nullable(body.gender),birth_date:birth.date,birth_date_precision:birth.precision,death_date:death.date,death_date_precision:death.precision,generation,parent_id:parentId,mother_nm:motherName,mother_spouse_id:motherId,notes:nullable(body.notes),spouses,children};
}
function assertManageable(user,member){try{assertCanManage(user,member,'update');return true;}catch{return false;}}
export async function saveSpouses(client,id,spouses,user){
 const existing=(await client.query('SELECT * FROM spouse WHERE husband_id=$1',[id])).rows;
 const retained=new Set();
 for(const spouse of spouses){
  let current=spouse.id?existing.find(s=>String(s.id)===String(spouse.id)):existing.find(s=>s.spouse_nm===spouse.spouse_nm&&!retained.has(s.id));
  if(spouse.id&&!current)throw new HttpError(400,'다른 구성원의 배우자를 수정할 수 없습니다.');
  if(current){if(retained.has(current.id))throw new HttpError(400,'동일 배우자가 중복되었습니다.');retained.add(current.id);
   const linked=current.spouse_nm!==spouse.spouse_nm ? (await client.query('SELECT * FROM family_members WHERE mother_spouse_id=$1',[current.id])).rows : [];
   for(const child of linked)assertCanManage(user,child,'update');
   await client.query('UPDATE spouse SET spouse_nm=$1,order_no=$2,updated_at=now() WHERE id=$3',[spouse.spouse_nm,spouse.order_no,current.id]);
   if(linked.length){const updates=await client.query('UPDATE family_members SET mother_nm=$1,updated_by=$3,updated_at=now() WHERE mother_spouse_id=$2 RETURNING *',[spouse.spouse_nm,current.id,user.id]);
    for(const child of updates.rows)await audit(client,user.id,'UPDATE_MOTHER_NAME','family_members',child.id,linked.find(m=>m.id===child.id),child);
   }
  }else{const inserted=await client.query('INSERT INTO spouse(husband_id,spouse_nm,order_no) VALUES($1,$2,$3) RETURNING id',[id,spouse.spouse_nm,spouse.order_no]);retained.add(inserted.rows[0].id);}
 }
 for(const spouse of existing.filter(s=>!retained.has(s.id))){
  const linked=await client.query('SELECT 1 FROM family_members WHERE mother_spouse_id=$1 LIMIT 1',[spouse.id]);
  if(linked.rowCount)throw new HttpError(409,'자녀의 어머니로 연결된 배우자는 삭제할 수 없습니다. 먼저 자녀의 어머니를 변경해주세요.');
  await client.query('DELETE FROM spouse WHERE id=$1',[spouse.id]);
 }
}
export async function saveMember(client,body,user,id=null){
 await lockFamily(client);
 const previous=id?await memberSnapshot(client,id):null;
 if(previous?.deleted_at)throw new HttpError(409,'삭제된 구성원은 복원 후 수정해주세요.');
 assertCanManage(user,previous,id?'update':'create');
 const data=await validateMember(client,body,user,previous);
 const keys=['name','hanja','gender','birth_date','death_date','generation','parent_id','mother_nm','notes','mother_spouse_id','birth_date_precision','death_date_precision'];
 const values=keys.map(key=>data[key]);
 if(id)await client.query(`UPDATE family_members SET ${keys.map((key,i)=>`${key}=$${i+1}`).join(',')},updated_by=$13,updated_at=now() WHERE id=$14`,[...values,user.id,id]);
 else{id=(await client.query(`INSERT INTO family_members(${keys.join(',')},created_by,updated_by) VALUES(${keys.map((_,i)=>`$${i+1}`).join(',')},$13,$13) RETURNING id`,[...values,user.id])).rows[0].id;}
 await saveSpouses(client,id,data.spouses,user);
 if(previous&&previous.generation!==data.generation){
  // Ancestor rows are cycle-checked; calculate depth from the new parent rather than trusting client generations.
  const changed=await client.query(`WITH RECURSIVE tree(id,generation) AS (
   SELECT id,$2::integer+1 FROM family_members WHERE parent_id=$1 AND deleted_at IS NULL UNION ALL
   SELECT f.id,t.generation+1 FROM family_members f JOIN tree t ON f.parent_id=t.id WHERE f.deleted_at IS NULL)
   UPDATE family_members f SET generation=t.generation,updated_by=$3,updated_at=now() FROM tree t WHERE f.id=t.id RETURNING f.*`,[id,data.generation,user.id]);
  for(const descendant of changed.rows)await audit(client,user.id,'RECALCULATE_GENERATION','family_members',descendant.id,data.children.find(m=>m.id===descendant.id),descendant);
 }
 const saved=await memberSnapshot(client,id);
 await audit(client,user.id,previous?'UPDATE':'CREATE','family_members',id,previous,saved);
 return saved;
}
