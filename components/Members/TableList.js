import { useEffect, useState } from "react";
import styles from "../Members/TableList.module.css";
import Pagination from "../UI/Pagination";
import ModalDetail from "../Modal/ModalDetail";
import { fetchAllMembers } from "../../utils/api";
import { formatGender } from "../../utils/helpers";
import LoadingOverlay from "../Tree/LoadingOverlay";
import { formatDate } from "../../utils/helpers";

export default function TableList({
  searchQuery,
  setActiveTab,
  setFocusId,
  refreshList,
  members,
  setMembers,
  isAdmin,
  showLoginModal,
  onShowInTree,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [isMobile,setIsMobile]=useState(false);
  useEffect(()=>{const resize=()=>setIsMobile(window.innerWidth<=600);resize();window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize);},[]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth <= 600 ? 5 : 10;
    }
    return 10; // SSR 대응
  });

  useEffect(() => {
    if (showLoginModal) return;

    let active = true;
    const fetchMembers = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (searchQuery?.name) params.append("name", searchQuery.name);
        if (searchQuery?.startYear)
          params.append("startYear", searchQuery.startYear);
        if (searchQuery?.endYear) params.append("endYear", searchQuery.endYear);

        params.append("sort", "table");

        const data = await fetchAllMembers("table", searchQuery || {});
        if (active) setMembers(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMembers();
    return () => { active = false; };
  }, [searchQuery, showLoginModal, refreshList, retry, setMembers]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentMembers = members.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(members.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), Math.max(totalPages, 1)));
  }, [totalPages]);

  const handleMemberUpdate = (updated) => {
    setRetry(value=>value+1);
    setSelectedMember(updated);
  };



  return (
    <>
      {loading ? (
        <LoadingOverlay />
      ) : error ? <p role="alert">{error} <button onClick={()=>setRetry(value=>value+1)}>다시 불러오기</button></p> : (
        <>
          <div className={styles.tableWrapper}>
            <h2>📜 손씨 가계도 구성원 목록</h2>
            <br />

            {/* 데스크톱 테이블 */}
            {!isMobile && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>성별</th>
                    <th>출생</th>
                    <th>세대</th>
                    <th>족보 보기</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        조건에 맞는 구성원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    currentMembers.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <button
                            onClick={() => setSelectedMember(m)}
                            className={styles.nameBtn}
                          >
                            {m.name}
                          </button>
                        </td>
                        <td>{formatGender(m.gender)}</td>
                        <td>{formatDate(m.birth_date,m.birth_date_precision)}</td>
                        <td>{m.generation}</td>
                        <td>
                          <button
                            onClick={() => {
                              setFocusId(m.id);
                              setActiveTab("tree");
                            }}
                            className={styles.nameBtn}
                          >
                            족보 이동
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 모바일 카드뷰 */}
            {isMobile && (
              <div className={styles.cardView}>
                {currentMembers.length === 0 ? (
                  <div className={styles.loading}>
                    조건에 맞는 구성원이 없습니다.
                  </div>
                ) : (
                  currentMembers.map((m) => (
                    <div className={styles.cardItem} key={m.id}>
                      <div className="row">
                        <span className={styles.label}>이름</span>{" "}
                        <button
                          onClick={() => setSelectedMember(m)}
                          className={styles.nameBtn}
                        >
                          {m.name}
                        </button>
                      </div>
                      <div className="row">
                        <span className={styles.label}>성별</span>{" "}
                        {formatGender(m.gender)}
                      </div>
                      <div className="row">
                        <span className={styles.label}>출생</span>{" "}
                        {formatDate(m.birth_date,m.birth_date_precision)}
                      </div>
                      <div className="row">
                        <span className={styles.label}>세대</span>{" "}
                        {m.generation}
                      </div>
                      <div className="row">
                        <span className={styles.label}>족보</span>{" "}
                        <button
                          onClick={() => {
                            setFocusId(m.id);
                            setActiveTab("tree");
                          }}
                          className={styles.nameBtn}
                        >
                          족보 이동
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />

          {selectedMember && (
            <ModalDetail
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
              onUpdated={handleMemberUpdate}
              onShowInTree={onShowInTree}
              onDeleted={(id)=>{setMembers(prev=>prev.filter(m=>m.id!==id));setSelectedMember(null);}}
              isAdmin={isAdmin}
            />
          )}
        </>
      )}
    </>
  );
}
