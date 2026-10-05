import { useState, useEffect } from "react";
import styles from "./ModalEdit.module.css";
import {
  updatemember,
  fetchMemberById,
  fetchSpousesByMemberId,
} from "../../utils/api";
import { isRequiredFilled, sanitizeFormData } from "../../utils/helpers";
import FormField from "../Form/FormField";
import DateInput from "../Form/DateInput";
import { memberAction } from "../Admin/DeletedMembers";
import ParentSelector from "../Form/ParentsSelector";
import Swal from "sweetalert2";
import useDialogFocus from "../hooks/useDialogFocus";
import useParentSelection from "../hooks/useParentSelection";
import useConfirmOnClose from "../hooks/useConfirmOnClose";

export default function ModalEdit({ member, onClose, onUpdated }) {
  const initialData = { ...member, rootMember: !member.parent_id };
  const [formData, setFormData] = useState(initialData);

  // spouseList를 props에서 바로 초기화
  const [spouses, setSpouses] = useState(member.spouseList || []);
  const [newSpouse, setNewSpouse] = useState("");
  const [saving, setSaving] = useState(false);
  const [motherOptions, setMotherOptions] = useState([]);

  const {
    parentNameInput,
    filteredOptions,
    showParentDropdown,
    setShowDropdown: setShowParentDropdown,
    handleParentSelect,
    handleParentInputChange,
  } = useParentSelection(setFormData, member.parent_id);

  const confirmClose = useConfirmOnClose(
    { formData: initialData, spouses: member.spouseList || [], newSpouse: "" },
    { formData, spouses, newSpouse },
    onClose
  );

  const handleClose = () => { if (!saving) confirmClose(); };
  const dialogRef = useDialogFocus(handleClose);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value, ...(name === "mother_spouse_id" ? {mother_nm: ""} : {}) }));
  };

  // 부(parent_id)가 바뀌면 여성 spouse 목록 불러오기
  useEffect(() => {
    const fatherId = formData.parent_id;
    let cancelled = false;
    if (fatherId) {
      fetchSpousesByMemberId(fatherId)
        .then((spouses) => {
          if (cancelled) return;
          setMotherOptions(spouses);
        })
        .catch(() => {
          if (cancelled) return;
          setMotherOptions([]);
        });
    } else {
      setMotherOptions([]);
    }
    return () => { cancelled = true; };
  }, [formData.parent_id]);

  const handleAddSpouse = () => {
    const trimmed = newSpouse.trim();
    if (!trimmed) return;

    const alreadyExists = spouses.some((s) => s.spouse_nm === trimmed);
    if (alreadyExists) return;

    setSpouses((prev) => [
      ...prev,
      { spouse_nm: trimmed, order_no: prev.length + 1 },
    ]);
    setNewSpouse("");
  };

  const handleDeleteSpouse = (idx) => {
    const updated = spouses.filter((_, i) => i !== idx);
    const reordered = updated.map((s, i) => ({
      ...s,
      order_no: i + 1,
    }));
    setSpouses(reordered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!isRequiredFilled(formData)) {
      Swal.fire("입력 누락", "필수 항목을 모두 입력해주세요.", "warning");
      return;
    }

    setSaving(true);
    try {
      if (newSpouse.trim()) { await Swal.fire('배우자 입력 확인','입력 중인 배우자를 추가하거나 지운 뒤 저장해주세요.','warning'); return; }
      const payload = {
        ...sanitizeFormData(formData),
        spouseList: spouses,
      };

      if (String(payload.parent_id||'')!==String(member.parent_id||'') || Number(payload.generation)!==Number(member.generation)) {
        const preview=await memberAction({action:'preview-parent',id:member.id});
        const result=await Swal.fire({title:'부모·세대 변경 확인',text:`후손 ${preview.count}명의 세대를 확인하고 다시 계산합니다.`,showCancelButton:true,confirmButtonText:'변경',cancelButtonText:'취소'});
        if (!result.isConfirmed) return;
      }
      await updatemember(payload);
      const refreshed = await fetchMemberById(formData.id);
      Swal.fire("수정 완료!", "", "success");
      onUpdated(refreshed);
      onClose();
    } catch (err) {
      Swal.fire("오류 발생", err.message, "error");
    } finally { setSaving(false); }
  };

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="구성원 수정" className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose}>
          ✖
        </button>
        <h2>✏️ 구성원 정보 수정</h2>

        <form onSubmit={handleSubmit} className={styles.editForm}>
          <FormField
            label="이름"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            maxLength={20}
          />
          <FormField
            label="한자"
            name="hanja"
            value={formData.hanja || ""}
            onChange={handleChange}
            maxLength={20}
          />
          <FormField
            label="성별"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            type="select"
            options={[
              { value: "", label: "선택 안함" },
              { value: "M", label: "남" },
              { value: "F", label: "여" },
            ]}
          />
          <DateInput label="출생" name="birth_date" value={formData.birth_date} precision={formData.birth_date_precision} onChange={({date,precision})=>setFormData(prev=>({...prev,birth_date:date||'',birth_date_precision:precision}))} />
          <DateInput label="사망" name="death_date" value={formData.death_date} precision={formData.death_date_precision} onChange={({date,precision})=>setFormData(prev=>({...prev,death_date:date||'',death_date_precision:precision}))} />
          <label><input type="checkbox" checked={!formData.parent_id && !!formData.rootMember} onChange={e=>setFormData(prev=>({...prev,rootMember:e.target.checked,parent_id:'',mother_nm:'',mother_spouse_id:null,generation:prev.generation||'1'}))}/> 부모를 모르는 시작 인물</label>
          <ParentSelector
            label="부 성명"
            value={formData.rootMember ? "" : parentNameInput}
            onInputChange={handleParentInputChange}
            onSelect={handleParentSelect}
            options={filteredOptions}
            showDropdown={showParentDropdown}
            setShowDropdown={setShowParentDropdown}
            required={!formData.rootMember}
            placeholder="부모 이름을 검색하여 선택하세요."
          />
          <FormField
            label="모 (선택)"
            name="mother_spouse_id"
            value={formData.mother_spouse_id || ""}
            onChange={handleChange}
            type="select"
            options={[
              { value: "", label: "선택 안함" },
              ...motherOptions.map((m) => ({
                value: m.id,
                label: `${m.name}`,
              })),
            ]}
          />
          <FormField
            label="대"
            name="generation"
            value={formData.generation}
            type="number"
            readOnly={!!formData.parent_id}
            required
          />

          {/* 🔹 배우자 목록 UI */}
          <div className={styles.spouseSection}>
            <label>배우자 목록</label>
            <div className={styles.spouseList}>
              {spouses.map((s, i) => (
                <div key={i} className={styles.spouseItem}>
                  <input aria-label={`배우자 ${i+1} 이름`} required maxLength={80} value={s.spouse_nm} onChange={e=>setSpouses(prev=>prev.map((item,index)=>index===i?{...item,spouse_nm:e.target.value}:item))}/>
                  <button
                    type="button"
                    onClick={() => handleDeleteSpouse(i)}
                    className={styles.deleteBtn}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.spouseInputGroup}>
              <input
                type="text"
                placeholder="이름 입력"
                value={newSpouse}
                onChange={(e) => setNewSpouse(e.target.value)}
              />
              <button type="button" onClick={handleAddSpouse}>
                추가
              </button>
            </div>
          </div>

          <FormField
            label="비고"
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
            multiline
            rows={3}
          />

          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelBtn}
            >
              닫기
            </button>
            <button disabled={saving} type="submit" className={styles.editBtn}>
              수정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
