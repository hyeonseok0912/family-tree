import { useEffect, useState } from "react";
import styles from "../Members/TableList.module.css";
import Pagination from "../UI/Pagination";
import ModalDetail from "../Modal/ModalDetail";
import { fetchAllMembers } from "../../utils/api";
import { formatGender } from "../../utils/helpers";
import LoadingOverlay from "../Tree/LoadingOverlay";

export default function TableList({
  searchQuery,
  setActiveTab,
  setFocusId,
  refreshList,
  members,
  setMembers,
  isAdmin,
  showLoginModal,
}) {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (showLoginModal) return;

    const fetchMembers = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        if (searchQuery?.name) params.append("name", searchQuery.name);
        if (searchQuery?.startYear)
          params.append("startYear", searchQuery.startYear);
        if (searchQuery?.endYear) params.append("endYear", searchQuery.endYear);

        params.append("sort", "table");

        const data = await fetchAllMembers("table", searchQuery || {});
        setMembers(data);
      } catch (err) {
        console.error("가족 정보 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [searchQuery, showLoginModal, refreshList]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentMembers = members.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(members.length / itemsPerPage);

  const handleMemberUpdate = (updated) => {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setSelectedMember(updated);
  };

  return (
    <>
      {loading ? (
        <LoadingOverlay />
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <h2>📜 손씨 가계도 구성원 목록</h2>
            <br />
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
                      <td>{m.birth_date}</td>
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
              isAdmin={isAdmin}
            />
          )}
        </>
      )}
    </>
  );
}
