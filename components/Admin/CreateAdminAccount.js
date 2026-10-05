import {useState} from 'react';
import {authRequest} from '../hooks/useAuth';
import styles from './AdminLayout.module.css';

export default function CreateAdminAccount({onCreated,disabled=false}) {
 const [username,setUsername]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[created,setCreated]=useState(null),[busy,setBusy]=useState(false);
 const submit=async event=>{
  event.preventDefault();
  if(busy||disabled)return;
  setError('');setCreated(null);
  const id=username.trim(),displayName=name.trim();
  if(!/^[A-Za-z0-9_.-]{3,80}$/.test(id)){setError('아이디는 영문·숫자·밑줄(_), 마침표(.), 하이픈(-)으로 3~80자 입력해주세요.');return;}
  if(!displayName||displayName.length>80){setError('이름을 1~80자로 입력해주세요.');return;}
  if(!password){setError('아래에 현재 로그인한 상위 관리자 본인의 비밀번호를 입력해주세요.');return;}
  setBusy(true);
  try {
   await authRequest('verify',{password});
   const result=await authRequest('admin-create',{username:id,display_name:displayName});
   setCreated({username:id,name:displayName,password:result.temporary_password});
   setUsername('');setName('');setPassword('');
   try {if(await onCreated()===false)setError('계정은 등록되었습니다. 관리자 목록을 새로 불러오지 못했으니 목록을 확인해주세요.');}
   catch {setError('계정은 등록되었습니다. 관리자 목록을 새로 불러오지 못했으니 목록을 확인해주세요.');}
  } catch(err){setError(err.message||'계정 등록에 실패했습니다. 다시 시도해주세요.');}
  finally{setBusy(false);}
 };
 return <form className={styles.card} onSubmit={submit} noValidate aria-label="하위 관리자 직접 등록" aria-busy={busy}>
  <h3>하위 관리자 직접 등록</h3>
  <p className={styles.hint}>새 계정의 아이디·이름과 현재 로그인한 상위 관리자 본인의 비밀번호를 입력하세요. 새 계정의 임시 비밀번호는 등록 후 자동으로 발급됩니다.</p>
  <div className={styles.fields}>
   <label>새 계정 아이디<input name="username" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="off" maxLength={80} disabled={busy||disabled} required placeholder="예: son_admin"/><small className={styles.hint}>영문·숫자·_.- 사용, 3~80자</small></label>
   <label>새 계정 이름<input name="display_name" value={name} onChange={e=>setName(e.target.value)} maxLength={80} disabled={busy||disabled} required placeholder="예: 손영원"/></label>
  </div>
  <label>상위 관리자 본인 비밀번호<input type="password" name="admin_password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} maxLength={256} disabled={busy||disabled} required/></label>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  {created&&<div className={styles.secret} role="status"><strong>{created.name} ({created.username}) 계정 등록 완료</strong><p>임시 비밀번호: <code>{created.password}</code></p><p>이 비밀번호는 이번에만 표시됩니다. 새 계정으로 로그인한 뒤 ‘내 비밀번호’에서 변경해야 구성원을 등록·수정할 수 있습니다.</p></div>}
  <div className={styles.actions}><button className={styles.primary} type="submit" disabled={busy||disabled}>{busy?'계정 등록 중…':'계정 등록'}</button></div>
 </form>;
}
