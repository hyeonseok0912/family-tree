import { useEffect, useState } from "react";
import styles from "./ModalDetail.module.css";
import ModalEdit from "./ModalEdit";
import { formatGender, formatDate } from "../../utils/helpers";
import Swal from "sweetalert2";

export default function ModalDetail({ member, onClose, onUpdated, isAdmin }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localMember, setLocalMember] = useState(member);
  const [historyStack, setHistoryStack] = useState([]);
  const [showSiblings, setShowSiblings] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [relatives, setRelatives] = useState({ siblings: [], children: [] });
  const [showSpouses, setShowSpouses] = useState(false);

  useEffect(() => {
    if (member?.id) {
      fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          setLocalMember(data);
          setHistoryStack([]);
          setShowSiblings(false);
          setShowChildren(false);
        })
        .catch((err) => {
          console.error("상세 정보 조회 실패:", err);
          Swal.fire("오류", "구성원 정보를 불러오지 못했습니다.", "error");
        });
    }
  }, [member]);

  const fetchRelatives = async () => {
    try {
      const res = await fetch("/api/relatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: localMember.id,
          parentId: localMember.parent_id,
        }),
      });
      const data = await res.json();
      setRelatives(data);
    } catch (err) {
      console.error("형제/자식 조회 실패:", err);
      Swal.fire("조회 실패", "형제나 자식 정보를 가져올 수 없습니다.", "error");
    }
  };

  const toggleSiblings = async () => {
    if (!showSiblings) await fetchRelatives();
    setShowSiblings(!showSiblings);
  };

  const toggleChildren = async () => {
    if (!showChildren) await fetchRelatives();
    setShowChildren(!showChildren);
  };

  const handleGoToMember = async (id) => {
    const confirm = await Swal.fire({
      title: "해당 인물 정보로 이동하시겠습니까?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "이동",
      cancelButtonText: "취소",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const next = await res.json();
      if (next) {
        setHistoryStack((prev) => [...prev, localMember]);
        setLocalMember(next);
        setShowSiblings(false);
        setShowChildren(false);
      }
    } catch (err) {
      console.error("상세 조회 실패:", err);
      Swal.fire("조회 실패", "정보를 가져오지 못했습니다.", "error");
    }
  };

  const handleGoBack = () => {
    const prev = historyStack.pop();
    if (prev) {
      setLocalMember(prev);
      setHistoryStack([...historyStack]);
      setShowSiblings(false);
      setShowChildren(false);
    }
  };

  if (!member) return null;

  if (isEditing) {
    return (
      <ModalEdit
        member={localMember}
        onClose={() => setIsEditing(false)}
        onUpdated={(updated) => {
          setLocalMember(updated);
          if (onUpdated) onUpdated(updated);
        }}
      />
    );
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>
        <h2>{localMember.name} 상세 정보</h2>

        <div className={styles.toggleGroup}>
          {localMember.parent_id && (
            <button onClick={toggleSiblings}>
              {showSiblings ? "형제 숨기기" : "형제 보기"}
            </button>
          )}
          <button onClick={toggleChildren}>
            {showChildren ? "자식 숨기기" : "자식 보기"}
          </button>
        </div>

        <table className={styles.detailTable}>
          <tbody>
            <tr>
              <th>이름</th>
              <td className={styles.notesCell}>{localMember.name}</td>
            </tr>
            <tr>
              <th>한자</th>
              <td className={styles.notesCell}>{localMember.hanja || "-"}</td>
            </tr>
            <tr>
              <th>성별</th>
              <td className={styles.notesCell}>
                {formatGender(localMember.gender)}
              </td>
            </tr>
            <tr>
              <th>출생</th>
              <td className={styles.notesCell}>
                {formatDate(localMember.birth_date)}
              </td>
            </tr>
            <tr>
              <th>사망</th>
              <td className={styles.notesCell}>
                {formatDate(localMember.death_date)}
              </td>
            </tr>
            <tr>
              <th>세</th>
              <td className={styles.notesCell}>{localMember.generation}</td>
            </tr>
            <tr>
              <th>부모</th>
              <td className={styles.notesCell}>
                {localMember.parent_name ? (
                  <>
                    <span
                      className={styles.linkText}
                      onClick={() => handleGoToMember(localMember.parent_id)}
                    >
                      {localMember.parent_name}(父)
                    </span>
                    {localMember.mother_nm && `, ${localMember.mother_nm}(母)`}
                  </>
                ) : (
                  "-"
                )}
              </td>
            </tr>
            <tr>
              <th>배우자</th>
              <td className={styles.notesCell}>
                {!localMember.spouseList ||
                localMember.spouseList.length === 0 ? (
                  "-"
                ) : (
                  <div className={styles.spouseWrapper}>
                    <div className={styles.spouseHeader}>
                      <span>
                        {localMember.spouseList[0].spouse_nm}
                        {localMember.spouseList[0].spouse_nm ===
                          localMember.mother_nm && " (母)"}
                      </span>
                      {localMember.spouseList.length > 1 && (
                        <button
                          className={styles.spouseToggleBtn}
                          onClick={() => setShowSpouses((prev) => !prev)}
                          type="button"
                        >
                          + {localMember.spouseList.length - 1}명 더보기
                        </button>
                      )}
                    </div>

                    {showSpouses &&
                      localMember.spouseList.slice(1).map((s, idx) => (
                        <div key={idx} className={styles.spouseItem}>
                          • {s.spouse_nm}
                          {s.spouse_nm === localMember.mother_nm && " (母)"}
                        </div>
                      ))}
                  </div>
                )}
              </td>
            </tr>

            <tr>
              <th>비고</th>
              <td className={styles.notesCell}>{localMember.notes || "-"}</td>
            </tr>
          </tbody>
        </table>

        {showSiblings && (
          <div className={styles.section}>
            <h4>형제 목록</h4>
            {relatives.siblings?.length > 0 ? (
              <ul className={styles.list}>
                {relatives.siblings.map((s) => (
                  <li
                    key={s.id}
                    className={styles.linkText}
                    onClick={() => handleGoToMember(s.id)}
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>형제가 없습니다.</p>
            )}
          </div>
        )}

        {showChildren && (
          <div className={styles.section}>
            <h4>자식 목록</h4>
            {relatives.children?.length > 0 ? (
              <ul className={styles.list}>
                {relatives.children.map((c) => (
                  <li
                    key={c.id}
                    className={styles.linkText}
                    onClick={() => handleGoToMember(c.id)}
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>자식이 없습니다.</p>
            )}
          </div>
        )}

        <div className={styles.buttonGroup}>
          {historyStack.length > 0 && (
            <button className={styles.backBtn} onClick={handleGoBack}>
              뒤로가기
            </button>
          )}
          <button className={styles.cancelBtn} onClick={onClose}>
            닫기
          </button>
          {isAdmin && (
            <button
              className={styles.editBtn}
              onClick={() => setIsEditing(true)}
            >
              수정하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
