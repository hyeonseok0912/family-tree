import { useEffect, useState } from "react";
import styles from "./ModalDetail.module.css";
import ModalEdit from "./ModalEdit";
import { formatGender, formatDate } from "../../utils/helpers";

export default function ModalDetail({ member, onClose, onUpdated, isAdmin }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localMember, setLocalMember] = useState(member); // ← 내부 상태

  useEffect(() => {
    setLocalMember(member); // member prop 바뀌면 동기화
  }, [member]);

  if (!member) return null;

  if (isEditing)
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

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>
        <h2>{localMember.name} 상세 정보</h2>
        <table className={styles.detailTable}>
          <tbody>
            <tr>
              <th>이름</th>
              <td className={styles.notesCell}>{localMember.name}</td>
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
              <th>세대</th>
              <td className={styles.notesCell}>{localMember.generation}</td>
            </tr>
            <tr>
              <th>부모</th>
              <td className={styles.notesCell}>
                {localMember.parent_name || "-"}
              </td>
            </tr>
            <tr>
              <th>배우자</th>
              <td className={styles.notesCell}>
                {localMember.spouse_nm || "-"}
              </td>
            </tr>
            <tr>
              <th>비고</th>
              <td className={styles.notesCell}>{localMember.notes || "-"}</td>
            </tr>
          </tbody>
        </table>
        {isAdmin && (
          <div className={styles.buttonGroup}>
            <button className={styles.cancelBtn} onClick={onClose}>
              닫기
            </button>
            <button
              className={styles.editBtn}
              onClick={() => setIsEditing(true)}
            >
              수정하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
