import {useEffect,useState} from 'react';
export default function InstallApp(){
  const [prompt,setPrompt]=useState(null),[offline,setOffline]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{
    const install=event=>{event.preventDefault();setPrompt(event);};
    const connected=()=>setOffline(!navigator.onLine);
    const installed=()=>setPrompt(null);
    connected();
    window.addEventListener('beforeinstallprompt',install);
    window.addEventListener('appinstalled',installed);
    window.addEventListener('online',connected);window.addEventListener('offline',connected);
    if('serviceWorker' in navigator && process.env.NODE_ENV==='production')navigator.serviceWorker.register('/sw.js').catch(()=>setMessage('앱 설치 기능을 준비하지 못했습니다. 새로고침 후 다시 시도해주세요.'));
    return()=>{window.removeEventListener('beforeinstallprompt',install);window.removeEventListener('appinstalled',installed);window.removeEventListener('online',connected);window.removeEventListener('offline',connected);};
  },[]);
  return <aside aria-label="앱 설치 안내" className="install-app">
    {offline&&<p role="alert">인터넷 연결이 끊겼습니다. 연결 후 족보를 다시 조회하거나 저장해주세요.</p>}
    {prompt?<button onClick={async()=>{await prompt.prompt();await prompt.userChoice;setPrompt(null);}}>홈 화면에 족보 앱 설치</button>:<details><summary>휴대폰 홈 화면에 추가하기</summary><p>아이폰: Safari 공유 버튼 → 홈 화면에 추가. 안드로이드: 브라우저 메뉴 → 앱 설치 또는 홈 화면에 추가. 데이터 조회와 저장에는 인터넷 연결이 필요합니다.</p></details>}
    {message&&<p role="status">{message}</p>}
  </aside>;
}
