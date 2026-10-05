import { createContext, useContext, useEffect, useState, useCallback } from 'react';
const AuthContext = createContext(null);
export async function authRequest(action, data) {
  const res = await fetch(`/api/auth/${action}`, data === undefined ? {} : {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || '요청 처리에 실패했습니다.');
  return result;
}
export function AuthProvider({children}) {
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try { const result=await authRequest('session');setUser(result.user);setError(''); }
    catch { setUser(null);setError('로그인 상태를 확인하지 못했습니다.'); }
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{refresh();},[refresh]);
  const login=async(data)=>{const result=await authRequest('login',data);setUser(result.user);return result.user;};
  const logout=async()=>{await authRequest('logout',{});setUser(null);};
  return <AuthContext.Provider value={{user,loading,error,refresh,login,logout}}>{children}</AuthContext.Provider>;
}
export default function useAuth(){return useContext(AuthContext);}
