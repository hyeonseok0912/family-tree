import { useState } from "react";
import TableList from "@/components/Members/TableList";
import ModalNew from "@/components/Modal/ModalNew";
import Search from "@/components/Search/Search";
import TreeView from "@/components/Tree/TreeView";
import AdminLoginModal from "@/components/Modal/AdminLoginModal";
import AdminMemoTab from "@/components/Admin/AdminMemoTab";
import styles from "./TabView.module.css";
import Head from "next/head";

export default function Home() {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [focusId, setFocusId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [newlyCreated, setNewlyCreated] = useState(null);
  const [refreshList, setRefreshList] = useState(false);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleLogin = () => {
    setIsAdmin(true);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setShowLoginModal(true);
    setActiveTab("table"); // 관리자 탭 강제 퇴출
  };

  return (
    <main>
      <Head>
        <title>밀성 손씨 족보</title>
        <meta name="description" content="밀성 손씨 가계도 및 족보를 정리한 웹사이트입니다." />
        <meta name="keywords" content="밀성손씨, 밀양손씨, 족보, 가계도, 족보사이트" />
        <meta name="author" content="밀성 손씨" />
        <meta property="og:title" content="밀성 손씨 족보" />
        <meta property="og:description" content="우리 가문의 족보를 확인해보세요." />
        <meta property="og:type" content="website" />
      </Head>
      <header className={styles.header}>
        <h1>밀성 손씨 족보</h1>
        <div className={styles.loginBox}>
          {isAdmin ? (
            <>
              <span>관리자님 안녕하세요</span>
              <button onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <span>열람자 모드</span>
              <button onClick={() => setShowLoginModal(true)}>Login</button>
            </>
          )}
        </div>
      </header>

      <Search onSearch={handleSearch} />

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

        {isAdmin && (
          <button
            className={activeTab === "adminMemo" ? styles.active : ""}
            onClick={() => setActiveTab("adminMemo")}
          >
            🛠 관리자 메모
          </button>
        )}
      </div>

      <div className={styles.contentBox}>
        {activeTab === "table" && (
          <>
            <TableList
              searchQuery={searchQuery}
              setActiveTab={setActiveTab}
              setFocusId={setFocusId}
              refreshList={refreshList}
              newlyCreated={newlyCreated}
              members={members}
              setMembers={setMembers}
              isAdmin={isAdmin}
            />

            {isAdmin && (
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
          />
        )}

        {activeTab === "adminMemo" && isAdmin && <AdminMemoTab />}
      </div>

      {showNewModal && (
        <ModalNew
          onClose={() => setShowNewModal(false)}
          onCreated={(created) => {
            setMembers((prev) =>
              [...prev, created].sort((a, b) => b.id - a.id)
            );
            setShowNewModal(false);
          }}
        />
      )}

      {showLoginModal && (
        <AdminLoginModal
          onLogin={handleLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      <footer className={styles.footer}>
        시스템 문제 발생 및 건의시{" "}
        <br className={styles.lineBreak} />
        010 - 3531 - 2948로 연락주세요.
      </footer>
    </main>
  );
}
