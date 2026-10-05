import CreateAdminAccount from './CreateAdminAccount';
import {useState, useEffect, useCallback, useRef} from 'react';
import useAuth, {authRequest} from '../hooks/useAuth';
import presentation from '../../utils/recordPresentation.cjs';
import styles from './AdminLayout.module.css';
const statuses={PENDING:'승인 대기',ACTIVE:'승인',SUSPENDED:'정지',REJECTED:'거절'};
const actions={CREATE:'등록',UPDATE:'수정',DELETE:'삭제',RESTORE:'복원',MERGE:'병합',REGISTER:'가입 신청',APPROVE:'가입 승인',ADMIN_CREATE:'계정 등록',ADMIN_UPDATE:'계정 수정',ADMIN_DELETE:'계정 삭제',PASSWORD_RESET:'비밀번호 초기화',PASSWORD_CHANGE:'비밀번호 변경',RESET_PASSWORD:'비밀번호 초기화',ASSIGN_OWNER:'등록자 지정'};
const entities={member:'구성원',family_member:'구성원',admin:'계정',admin_user:'계정',admin_users:'계정',family_members:'구성원',admin_memo:'관리자 메모'};
const fields={name:'이름',hanja:'한자',gender:'성별',birth_date:'출생일',death_date:'사망일',generation:'세대',parent_id:'부모 ID',mother_nm:'어머니',notes:'비고',display_name:'계정 이름',username:'아이디',role:'역할',status:'상태',permissions:'권한',created_by:'등록자 ID',updated_by:'수정자 ID'};
function valueText(value){if(value==null)return '-';if(typeof value==='object')return JSON.stringify(value);return String(value);}
function Changes({log}){
 const before=log.before_data||{},after=log.after_data||{};
 const keys=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));
 return <div className={styles.logBody}>{log.reason&&<p>사유: {log.reason}</p>}{keys.length>0?<div className={styles.tableWrap}><table><thead><tr><th>변경 항목</th><th>변경 전</th><th>변경 후</th></tr></thead><tbody>{keys.map(key=><tr key={key}><th>{fields[key]||key}</th><td>{key.endsWith('_at')?presentation.formatRecordDate(before[key]):valueText(before[key])}</td><td>{key.endsWith('_at')?presentation.formatRecordDate(after[key]):valueText(after[key])}</td></tr>)}</tbody></table></div>:<p className={styles.hint}>기록된 변경 값이 없습니다.</p>}</div>;
}
export default function AdminAccounts(){
 const {user,refresh}=useAuth();
 const management=presentation.hasManagementAccess(user),superAdmin=user.role==='SUPER_ADMIN'&&!user.must_change_password;
 const editRef=useRef(null);
 const [tab,setTab]=useState(user.must_change_password||!management?'password':user.role==='SUPER_ADMIN'?'accounts':'history');
 const [accounts,setAccounts]=useState([]),[logs,setLogs]=useState([]),[selected,setSelected]=useState(null);
 const selectedId=selected?.id;
 useEffect(()=>{if(selectedId)editRef.current?.scrollIntoView({behavior:'smooth',block:'start'});},[selectedId]);
 const [password,setPassword]=useState(''),[current,setCurrent]=useState(''),[newPassword,setNewPassword]=useState('');
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[temporary,setTemporary]=useState(''),[loading,setLoading]=useState(true),[filter,setFilter]=useState('');
 const load=useCallback(async()=>{setLoading(true);try{if(management)setLogs(await authRequest('audit',{}));if(superAdmin)setAccounts(await authRequest('admins',{}));return true;}catch(error){setStatus(error.message);return false;}finally{setLoading(false);}},[management,superAdmin]);
 useEffect(()=>{load();},[load]);
 const run=async(task)=>{setBusy(true);setStatus('');try{await task();if(await load())setStatus('처리 완료');}catch(error){setStatus(error.message);}finally{setBusy(false);}};
 const verify=async()=>{await authRequest('verify',{password});setPassword('');};
 const openAccount=account=>{setStatus('');setTemporary('');setSelected({...account,permissions:{...account.permissions}});};
 const filteredLogs=logs.filter(log=>[log.actor_name,actions[log.action]||log.action,entities[log.entity_type]||log.entity_type,log.entity_id,JSON.stringify(log.after_data),JSON.stringify(log.before_data)].join(' ').toLowerCase().includes(filter.toLowerCase()));
 const tabs=[...(superAdmin?[['accounts','관리자 계정']]:[]),...(management?[['history','작업 이력']]:[]),['password','내 비밀번호']];
 const actualTab=tabs.some(([key])=>key===tab)?tab:'password';
 return <section className={styles.panel}>
  <h2>{management?'관리자 설정':'내 계정'}</h2><p className={styles.hint}>계정과 작업 기록을 각각의 탭에서 확인하세요.</p>
  <nav className={styles.tabs} aria-label="계정 설정 메뉴">{tabs.map(([key,label])=><button key={key} aria-pressed={actualTab===key} onClick={()=>{setTab(key);setStatus('');}}>{label}</button>)}</nav>
  {status&&<p className={styles.status} role="status">{status}</p>}
  {actualTab==='password'&&<form className={styles.card} onSubmit={e=>{e.preventDefault();run(async()=>{await authRequest('password',{current_password:current,password:newPassword});setCurrent('');setNewPassword('');await refresh();});}}>
   <h3>내 비밀번호 변경</h3><div className={styles.fields}><label>현재 비밀번호<input type="password" value={current} onChange={e=>setCurrent(e.target.value)} autoComplete="current-password" required/></label><label>새 비밀번호 (12자 이상)<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" minLength={12} required/></label></div><button className={styles.primary} disabled={busy}>비밀번호 변경</button>
  </form>}
  {actualTab==='accounts'&&superAdmin&&<>
   {temporary&&<p className={styles.secret}>이번에만 표시되는 임시 비밀번호: <code>{temporary}</code></p>}
   <div className={styles.card}><h3>관리자 목록 ({accounts.length}명)</h3><p className={styles.hint}>계정을 더블클릭하거나 관리 버튼을 누르면 설정이 열립니다.</p>{loading&&<p role="status">계정을 불러오는 중입니다.</p>}
    <div className={styles.accountGrid}>{accounts.map(account=><article className={styles.account} key={account.id} onDoubleClick={()=>!busy&&openAccount(account)}><strong>{account.display_name}</strong><span className={styles.hint}>아이디: {account.username}</span><span>{account.role==='SUPER_ADMIN'?'상위 관리자':'하위 관리자'}</span><span className={styles.badge}>{statuses[account.status]||account.status}</span><button disabled={busy} onClick={()=>openAccount(account)} aria-label={`${account.display_name} 계정 관리`}>관리</button></article>)}</div>
   </div>
   {selected&&<form ref={editRef} className={styles.card} onSubmit={e=>{e.preventDefault();run(async()=>{await authRequest('admin-update',selected);setSelected(null);await refresh();});}}>
    <h3>{selected.display_name} 권한 설정</h3><div className={styles.fields}><label>역할<select value={selected.role} onChange={e=>setSelected({...selected,role:e.target.value})}><option value="SUPER_ADMIN">상위 관리자</option><option value="EDITOR">하위 관리자</option></select></label><label>계정 상태<select value={selected.status} onChange={e=>setSelected({...selected,status:e.target.value})}>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
    <div className={styles.permissions}>{['create','update','delete'].map(key=><label key={key}><input type="checkbox" checked={selected.permissions?.[key]===true} onChange={e=>setSelected({...selected,permissions:{...selected.permissions,[key]:e.target.checked}})}/>{({create:'등록',update:'수정',delete:'삭제'})[key]}</label>)}</div>
    <p className={styles.hint}>하위 관리자는 본인이 등록한 구성원에만 수정·삭제 권한이 적용됩니다. 모든 권한을 끄면 조회만 가능합니다.</p>
    <div className={styles.actions}><button className={styles.primary} disabled={busy}>권한·승인 상태 저장</button><button type="button" disabled={busy} onClick={()=>run(async()=>{setTemporary('');const result=await authRequest('reset-password',{id:selected.id});setTemporary(result.temporary_password);})}>비밀번호 초기화</button><button className={styles.danger} type="button" disabled={busy} onClick={()=>{if(confirm('계정을 삭제하면 로그인이 차단됩니다. 기존 족보와 작업 기록은 보존됩니다.'))run(async()=>{await authRequest('admin-delete',{id:selected.id});setSelected(null);await refresh();});}}>계정 삭제</button><button type="button" disabled={busy} onClick={()=>{setSelected(null);setTemporary('');}}>닫기</button></div>
   </form>}
   <CreateAdminAccount onCreated={load} disabled={busy}/>
   <form className={styles.card} onSubmit={e=>{e.preventDefault();const values=new FormData(e.currentTarget);run(async()=>{await verify();await authRequest('assign-owner',{member_id:values.get('member_id'),owner_id:values.get('owner_id')});});}}><h3>기존 구성원 등록자 지정</h3><label>상위 관리자 본인 비밀번호<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><div className={styles.fields}><label>구성원 ID<input name="member_id" type="number" min="1" required/></label><label>등록자<select name="owner_id" required>{accounts.filter(account=>account.status==='ACTIVE').map(account=><option key={account.id} value={account.id}>{account.display_name} ({account.username})</option>)}</select></label></div><button disabled={busy}>등록자 지정</button></form>
  </>}
  {actualTab==='history'&&management&&<><h3>최근 작업 이력 (최대 200건)</h3><label>이름·작업·대상 검색<input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="예: 손덕증, 수정, 구성원"/></label>{loading&&<p role="status">작업 이력을 불러오는 중입니다.</p>}{!loading&&filteredLogs.length===0&&<p>{filter?'검색 조건에 맞는 작업 이력이 없습니다.':'작업 이력이 없습니다.'}</p>}{filteredLogs.map(log=><details className={styles.log} key={log.id}><summary><time>{presentation.formatRecordDate(log.created_at)}</time><strong>{actions[log.action]||log.action}</strong><span>{log.actor_name||'가입 신청'}</span><span className={styles.badge}>{entities[log.entity_type]||log.entity_type} #{log.entity_id}</span></summary><Changes log={log}/></details>)}</>}
 </section>;
}
