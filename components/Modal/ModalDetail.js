import presentation from "../../utils/recordPresentation.cjs";
import { useEffect, useState, useRef } from "react";
import styles from "./ModalDetail.module.css";
import ModalEdit from "./ModalEdit";
import { formatGender, formatDate } from "../../utils/helpers";
import Swal from "sweetalert2";
import {memberAction} from '../Admin/DeletedMembers';
import useDialogFocus from "../hooks/useDialogFocus";
import useAuth from '../hooks/useAuth';

export default function ModalDetail({ member, onClose, onUpdated, isAdmin, onShowInTree, onDeleted }) {
  const {user}=useAuth();
  const requestRef=useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const dialogRef=useDialogFocus(onClose,!isEditing);
  const [localMember, setLocalMember] = useState(member);
  const [historyStack, setHistoryStack] = useState([]);
  const [showSiblings, setShowSiblings] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [relatives, setRelatives] = useState({ siblings: [], children: [] });
  const [showSpouses, setShowSpouses] = useState(false);
  const memberIdRef=useRef(localMember.id);
  memberIdRef.current=localMember.id;

  useEffect(() => {
    let active = true;
    requestRef.current++;
    if (member?.id) {
      fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("상세 조회 실패");
          return res.json();
        })
        .then((data) => {
          if (!active) return;
          setLocalMember(data);
          setHistoryStack([]);
          setShowSiblings(false);
          setShowChildren(false);
          setShowSpouses(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error("상세 정보 조회 실패:", err);
          Swal.fire("오류", "구성원 정보를 불러오지 못했습니다.", "error");
        });
    }
    return () => { active = false; };
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
      if (!res.ok) throw new Error("형제/자식 조회 실패");
      const data = await res.json();
      if (memberIdRef.current!==localMember.id) return false;
      setRelatives(data);
      return true;
    } catch (err) {
      console.error("형제/자식 조회 실패:", err);
      Swal.fire("조회 실패", "형제나 자식 정보를 가져올 수 없습니다.", "error");
      return false;
    }
  };

  const toggleSiblings = async () => {
    if (!showSiblings && !(await fetchRelatives())) return;
    setShowSiblings(!showSiblings);
  };

  const toggleChildren = async () => {
    if (!showChildren && !(await fetchRelatives())) return;
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
    const requestId=++requestRef.current;

    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("상세 조회 실패");
      const next = await res.json();
      if (next && requestId===requestRef.current) {
        setHistoryStack((prev) => [...prev, localMember]);
        setLocalMember(next);
        setShowSiblings(false);
        setShowChildren(false);
          setShowSpouses(false);
      }
    } catch (err) {
      console.error("상세 조회 실패:", err);
      Swal.fire("조회 실패", "정보를 가져오지 못했습니다.", "error");
    }
  };

  const handleGoBack = () => {
    requestRef.current++;
    const prev = historyStack[historyStack.length - 1];
    if (prev) {
      setLocalMember(prev);
      setHistoryStack(historyStack.slice(0, -1));
      setShowSiblings(false);
      setShowChildren(false);
          setShowSpouses(false);
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
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="구성원 상세정보" className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>
        <h2>{localMember.name} 상세 정보 {presentation.hasManagementAccess(user) && <small>#{localMember.id}</small>}</h2>
        {onShowInTree&&<button className={styles.showInTreeBtn} onClick={()=>{onClose();onShowInTree(localMember.id);}}>→ 가계도로 이동해서 보기</button>}

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
                {formatDate(localMember.birth_date,localMember.birth_date_precision)}
              </td>
            </tr>
            <tr>
              <th>사망</th>
              <td className={styles.notesCell}>
                {formatDate(localMember.death_date,localMember.death_date_precision)}
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
                    {onShowInTree && <button onClick={()=>{onClose();onShowInTree(localMember.parent_id);}}>부모 가계도</button>}
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
                    {onShowInTree&&<button onClick={event=>{event.stopPropagation();onClose();onShowInTree(s.id);}}>가계도</button>}
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
                    {onShowInTree&&<button onClick={event=>{event.stopPropagation();onClose();onShowInTree(c.id);}}>가계도</button>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>자식이 없습니다.</p>
            )}
          </div>
        )}

        {presentation.hasManagementAccess(user) && <p className={styles.metadata}>등록자: {localMember.created_by_name || "상위관리자"} · 최종 수정자: {localMember.updated_by_name || "상위관리자"}<br/>등록: {presentation.formatRecordDate(localMember.created_at)} · 수정: {presentation.formatRecordDate(localMember.updated_at)}</p>}
        <div className={styles.buttonGroup}>
          {historyStack.length > 0 && (
            <button className={styles.backBtn} onClick={handleGoBack}>
              뒤로가기
            </button>
          )}
          <button className={styles.cancelBtn} onClick={onClose}>
            닫기
          </button>
          {isAdmin && user && !user.must_change_password && (user.role==='SUPER_ADMIN'||(user.permissions?.delete && localMember.created_by != null && String(localMember.created_by)===String(user.id))) && <button onClick={async()=>{
            const result=await Swal.fire({title:`${localMember.name} 삭제`,text:'삭제 후 목록에서 복원할 수 있습니다. 삭제 사유를 입력해주세요.',input:'text',showCancelButton:true,confirmButtonText:'삭제',cancelButtonText:'취소',inputValidator:value=>!value.trim()?'삭제 사유가 필요합니다.':undefined});
            if(!result.isConfirmed)return;
            try{await memberAction({action:'delete',id:localMember.id,reason:result.value});onDeleted?.(localMember.id);onClose();}
            catch(error){Swal.fire('삭제 실패',error.message,'error');}
          }}>삭제</button>}
          {isAdmin && user && !user.must_change_password && (user.role==='SUPER_ADMIN'||(user.permissions?.update && localMember.created_by != null && String(localMember.created_by)===String(user.id))) && (
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
