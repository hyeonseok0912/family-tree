import presentation from "../utils/recordPresentation.cjs";
import { useState } from "react";
import TableList from "@/components/Members/TableList";
import ModalNew from "@/components/Modal/ModalNew";
import Search from "@/components/Search/Search";
import TreeView from "@/components/Tree/TreeView";
import AdminLoginModal from "@/components/Modal/AdminLoginModal";
import AdminMemoTab from "@/components/Admin/AdminMemoTab";
import styles from "./TabView.module.css";
import Head from "next/head";
import InstallApp from "@/components/UI/InstallApp";
import useAuth from '@/components/hooks/useAuth';
import AdminAccounts from '@/components/Admin/AdminAccounts';
import DeletedMembers from '@/components/Admin/DeletedMembers';
import MergeMembers from '@/components/Admin/MergeMembers';

export default function Home() {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [focusId, setFocusId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const { user, logout, error: authError } = useAuth();
  const isAdmin = presentation.hasManagementAccess(user);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignup,setShowSignup]=useState(false);
  const [newlyCreated, setNewlyCreated] = useState(null);
  const [refreshList, setRefreshList] = useState(false);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };
  const showMemberInTree = (id) => {
    setHighlightedId(null);setFocusId(id);setActiveTab('tree');
  };
  const refreshMembers = () => setRefreshList(previous=>!previous);

  const handleLogin = () => {
    setShowLoginModal(false);
  };

  const handleLogout = async () => {
    try { await logout(); } catch { alert('로그아웃에 실패했습니다. 다시 시도해주세요.'); return; }
    setShowSignup(false);
    setShowLoginModal(true);
    setActiveTab("table"); // 관리자 탭 강제 퇴출
  };

  return (
    <main>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
        <meta name="theme-color" content="#183b56"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <link rel="manifest" href="/manifest.webmanifest"/>
        <link rel="apple-touch-icon" href="/icons/icon-192.png"/>
        <title>밀성 손씨 세보</title>
        <meta
          name="description"
          content="밀성 손씨 가계도 및 족보를 정리한 웹사이트입니다."
        />
        <meta
          name="keywords"
          content="밀성손씨, 밀양손씨, 족보, 가계도, 족보사이트"
        />
        <meta name="author" content="밀성 손씨" />
        <meta property="og:title" content="밀성 손씨 족보" />
        <meta
          property="og:description"
          content="우리 가문의 족보를 확인해보세요."
        />
        <meta property="og:type" content="website" />
      </Head>
      <header className={styles.header}>
        <div className={styles.centerWrapper}>
          <div className={styles.titleBox}>
            <span className={styles.chinese}>密城孫氏 校洞派 世譜</span>
            <span className={styles.lineBreak} />
            <br className={styles.lineBreak} />
            <span className={styles.korean}>(밀성손씨 교동파 세보)</span>
          </div>
        </div>
        <div className={styles.loginBox}>
          {user ? (
            <>
              <span>{user.display_name}님 ({user.role === 'SUPER_ADMIN' ? '상위 관리자' : isAdmin ? '하위 관리자' : '조회 전용'})</span>
              <button onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <span>열람자 모드</span>
              <button onClick={() => {setShowSignup(false);setShowLoginModal(true);}}>관리자 로그인 · 회원가입</button>
            </>
          )}
        </div>
      </header>

      <InstallApp/>
      <Search onSearch={handleSearch} />
      {authError && <p role="alert">{authError}</p>}
      {user?.must_change_password && <p role="alert">초기 비밀번호를 변경해야 저장할 수 있습니다. 관리자 계정 탭에서 변경해주세요.</p>}

      <div className={styles.tabWrapper}>
        <button
          className={activeTab === "table" ? styles.active : ""}
          onClick={() => setActiveTab("table")}
        >
          📋 리스트 보기
        </button>
        <button
          className={activeTab === "tree" ? styles.active : ""}
          onClick={() => {
            setHighlightedId(null);
            setActiveTab("tree");
          }}
        >
          🗂️ 가계도 보기
        </button>

        {user?.role === 'SUPER_ADMIN' && (
          <button
            className={activeTab === "adminMemo" ? styles.active : ""}
            onClick={() => setActiveTab("adminMemo")}
          >
            🛠 관리자 메모
          </button>
        )}
        {user && <button className={activeTab==='accounts'?styles.active:''} onClick={() => setActiveTab('accounts')}>{isAdmin?'관리자 계정 · 작업 이력':'내 계정'}</button>}
        {isAdmin && <button className={activeTab==='deleted'?styles.active:''} onClick={()=>setActiveTab('deleted')}>삭제 목록 · 복원</button>}
        {user?.role==='SUPER_ADMIN'&&<button className={activeTab==='merge'?styles.active:''} onClick={()=>setActiveTab('merge')}>동일인 병합</button>}
      </div>

      <div className={styles.contentBox}>
        {activeTab === "table" && (
          <>
            <button className={styles.signupButton} onClick={()=>{setShowSignup(true);setShowLoginModal(true);}}>관리자 회원가입 신청</button>
            <TableList
              searchQuery={searchQuery}
              setActiveTab={setActiveTab}
              setFocusId={setFocusId}
              refreshList={refreshList}
              newlyCreated={newlyCreated}
              members={members}
              setMembers={setMembers}
              isAdmin={isAdmin}
              onShowInTree={showMemberInTree}
            />

            {isAdmin && !user.must_change_password && (user.role==='SUPER_ADMIN'||user.permissions?.create) && (
              <button
                onClick={() => setShowNewModal(true)}
                className={styles.createButton}
              >
                + 구성원 추가
              </button>
            )}
          </>
        )}

        {activeTab === "tree" && (
          <TreeView
            searchQuery={searchQuery}
            focusId={focusId}
            clearFocusId={() => setFocusId(null)}
            highlightedId={highlightedId}
            setHighlightedId={setHighlightedId}
            isAdmin={isAdmin}
            onShowInTree={showMemberInTree}
          />
        )}

        {activeTab === "adminMemo" && user?.role === 'SUPER_ADMIN' && <AdminMemoTab />}
        {activeTab === 'accounts' && user && <AdminAccounts />}
        {activeTab==='deleted'&&isAdmin&&<DeletedMembers onChanged={refreshMembers}/>}
        {activeTab==='merge'&&user?.role==='SUPER_ADMIN'&&<MergeMembers onChanged={refreshMembers}/>}
      </div>

      {showNewModal && (
        <ModalNew
          onClose={() => setShowNewModal(false)}
          onCreated={(created) => {
            setRefreshList((previous) => !previous);
            setMembers((prev) =>
              [...prev, created].sort((a, b) => b.id - a.id)
            );
            setShowNewModal(false);
          }}
        />
      )}

      {showLoginModal && (
        <AdminLoginModal
          initialRegister={showSignup}
          onLogin={handleLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      <footer className={styles.footer}>
        시스템 문제 발생 및 건의시 <br className={styles.lineBreak} />
        010 - 3531 - 2948로 연락주세요.
      </footer>
    </main>
  );
}
