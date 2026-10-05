import styles from './AdminLayout.module.css';
import presentation from '../../utils/recordPresentation.cjs';
import {useState,useEffect} from 'react';
export async function memberAction(data){
 const response=await fetch('/api/member-actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result=await response.json();if(!response.ok)throw Error(result.message||'작업 실패');return result;
}
export default function DeletedMembers({onChanged}){
 const [members,setMembers]=useState([]),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 const load=async()=>{setLoading(true);setFailed(false);try{setMembers(await memberAction({action:'deleted'}));}catch(error){setFailed(true);setStatus(error.message);}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 const restore=async(member)=>{if(!confirm(`${member.name}을 복원할까요?`))return;setBusy(true);try{await memberAction({action:'restore',id:member.id});setStatus('복원 완료');await load();onChanged();}catch(error){setStatus(error.message);}finally{setBusy(false);}};
 return <section className={styles.panel}><h2>삭제된 구성원 · 복원</h2><p className={styles.hint}>삭제 사유와 작업자를 확인한 뒤 복원하세요. 병합된 구성원은 일반 복원이 지원되지 않습니다.</p>
  {status&&<p className={styles.status} role="status">{status}</p>}{failed&&<button disabled={busy||loading} onClick={load}>다시 불러오기</button>}
  {loading&&<p role="status">삭제 목록을 불러오는 중입니다.</p>}
  {!loading&&!failed&&members.length===0&&<p>삭제된 구성원이 없습니다.</p>}
  {members.map(member=><article className={styles.card} key={member.id}><h3>{member.name} <span className={styles.hint}>#{member.id}</span></h3><p>삭제 사유: {member.deletion_reason||'-'}</p><p className={styles.hint}>삭제자: {member.deleted_by_name||'-'} · 삭제일: {presentation.formatRecordDate(member.deleted_at)}</p>
   {member.merged_into?<span className={styles.badge}>#{member.merged_into}에 병합됨</span>:<button disabled={busy} onClick={()=>restore(member)}>구성원 복원</button>}</article>)}
 </section>;
}
