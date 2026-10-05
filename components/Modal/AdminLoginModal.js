import { useState, useEffect } from "react";
import styles from "./AdminLoginModal.module.css";
import useDialogFocus from "../hooks/useDialogFocus";
import useAuth, { authRequest } from '../hooks/useAuth';

export default function AdminLoginModal({ onLogin, onClose, initialRegister=false }) {
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [error, setError] = useState("");
  const [remember,setRemember]=useState(true);
  const [register,setRegister]=useState(initialRegister);
  const [displayName,setDisplayName]=useState('');
  const [busy,setBusy]=useState(false);
  const {login}=useAuth();
  const dialogRef=useDialogFocus(()=>{if(!busy)onClose();});
  useEffect(()=>{if(initialRegister)return;try{setAdminId(localStorage.getItem('family.lastUsername')||'');}catch{}},[initialRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);setError('');
    try {
      if(register){const result=await authRequest('register',{username:adminId,password:adminPw,display_name:displayName});setError(result.message);setRegister(false);setAdminPw('');}
      else {await login({username:adminId,password:adminPw,remember});try{localStorage.setItem('family.lastUsername',adminId);}catch{}onLogin();}
    }catch(err){setError(err.message);}finally{setBusy(false);}
  };

  return (
    <div className={styles.backdrop}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="관리자 로그인 및 가입" className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{register ? '관리자 가입 신청' : '관리자 로그인'}</h2>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <input
            type="text"
            placeholder="ID"
            aria-label="아이디" autoComplete="username" required
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
          />
          <input
            data-initial-focus
            type="password"
            placeholder="Password"
            aria-label="비밀번호" autoComplete={register ? 'new-password' : 'current-password'} required
            value={adminPw}
            onChange={(e) => setAdminPw(e.target.value)}
          />
          {register && <input placeholder="표시 이름" aria-label="표시 이름" value={displayName} onChange={e=>setDisplayName(e.target.value)} required maxLength={80}/>}
          {!register && <label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> 로그인 유지 (30일)</label>}
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.btnGroup}>
            <button type="submit" disabled={busy}>{busy ? '처리 중...' : register ? '가입 신청' : '로그인'}</button>
            <button type="button" disabled={busy} onClick={()=>{setRegister(!register);setError('');}}>{register ? '로그인으로' : '회원가입'}</button>
            <button type="button" disabled={busy} onClick={onClose}>
              관리자 아님
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
