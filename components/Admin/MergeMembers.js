import styles from './AdminLayout.module.css';
import {useState} from 'react';
import {memberAction} from './DeletedMembers';
const labels={name:'이름',hanja:'한자',gender:'성별',birth_date:'출생일',birth_date_precision:'출생일 정확도',death_date:'사망일',death_date_precision:'사망일 정확도',parent_id:'부모 ID',mother_nm:'어머니 이름',mother_spouse_id:'어머니 관계 ID',generation:'세대',notes:'비고'};
export default function MergeMembers({onChanged}){
 const [target,setTarget]=useState(''),[source,setSource]=useState(''),[preview,setPreview]=useState(null),[choices,setChoices]=useState({}),[reason,setReason]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const inspect=async()=>{setBusy(true);setPreview(null);try{setPreview(await memberAction({action:'merge-preview',id:target,source_id:source}));setChoices({});setStatus('');}catch(error){setStatus(error.message);}finally{setBusy(false);}};
 const merge=async()=>{if(!confirm(`남길 사람 #${target}, 병합할 사람 #${source}이 동일인임을 확인했습니까?`))return;setBusy(true);try{await memberAction({action:'merge',id:target,source_id:source,preview_hash:preview.preview_hash,choices,reason});setPreview(null);setStatus('병합 완료');onChanged();}catch(error){setStatus(error.message);}finally{setBusy(false);}};
 return <section className={styles.panel}><h2>동일인 중복 병합 (상위 관리자)</h2><p>남길 사람의 ID와 중복 등록된 사람의 ID를 입력한 뒤 관계와 값을 확인하세요. 병합 이력은 기록되며 일반 복원은 지원하지 않습니다.</p>
  <label>남길 사람 ID <input type="number" min="1" value={target} onChange={e=>{setTarget(e.target.value);setPreview(null);}}/></label>
  <label>병합할 사람 ID <input type="number" min="1" value={source} onChange={e=>{setSource(e.target.value);setPreview(null);}}/></label>
  <button disabled={busy||!target||!source} onClick={inspect}>변경 미리보기</button><p role="status">{status}</p>
  {preview&&<><p>날짜를 선택하면 정확도도 함께 선택합니다. 부모를 선택하면 어머니 관계도 함께 바뀌므로 확인해주세요.</p><p>{preview.source.name}의 후손 {preview.children.length}명 · 배우자 {preview.spouses.length}명 이전</p>
   <div className={styles.tableWrap}><table><thead><tr><th>항목</th><th>남길 사람</th><th>병합할 사람</th><th>사용할 값</th></tr></thead><tbody>{preview.fields.map(field=><tr key={field}><td>{labels[field]||field}</td><td>{String(preview.target[field]??'-')}</td><td>{String(preview.source[field]??'-')}</td><td><select aria-label={`${field} 병합 값`} value={choices[field]||'target'} onChange={e=>{const value=e.target.value;setChoices(previous=>({...previous,[field]:value,...(['birth_date','death_date'].includes(field)?{[field+'_precision']:value}:{}),...(field==='parent_id'?{mother_spouse_id:value,mother_nm:value}:{}),...(field==='mother_spouse_id'?{mother_nm:value}:{})}));}}><option value="target">남길 사람</option><option value="source">병합할 사람</option></select></td></tr>)}</tbody></table></div>
   <label>병합 사유 <input maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><button disabled={busy||!reason.trim()} onClick={merge}>확인한 값으로 병합</button>
  </>}
 </section>;
}
