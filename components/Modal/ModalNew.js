import { useState, useEffect } from "react";
import styles from "./ModalNew.module.css";
import { createmember, fetchSpousesByMemberId } from "../../utils/api";
import { isRequiredFilled, sanitizeFormData, formatDate } from "../../utils/helpers";
import FormField from "../Form/FormField";
import DateInput from "../Form/DateInput";
import { memberAction } from "../Admin/DeletedMembers";
import ParentSelector from "../Form/ParentsSelector";
import useParentSelection from "../hooks/useParentSelection";
import useConfirmOnClose from "../hooks/useConfirmOnClose";
import Swal from "sweetalert2";
import useDialogFocus from "../hooks/useDialogFocus";

const initialData = {
  name: "",
  hanja: "",
  gender: "M",
  birth_date: "",
  death_date: "",
  generation: "",
  parent_id: "",
  mother_nm: "",
  notes: "",
  birth_date_precision: "UNKNOWN",
  death_date_precision: "UNKNOWN",
  mother_spouse_id: null,
  rootMember: false,
};

export default function ModalNew({ onClose, onCreated }) {
  const [formData, setFormData] = useState({ ...initialData });
  const [spouses, setSpouses] = useState([]);
  const [motherOptions,setMotherOptions]=useState([]);
  const [newSpouse, setNewSpouse] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    parentNameInput,
    filteredOptions,
    showParentDropdown,
    setShowDropdown: setShowParentDropdown,
    handleParentSelect,
    handleParentInputChange,
  } = useParentSelection(setFormData);

  const confirmClose = useConfirmOnClose(
    { formData: initialData, spouses: [], newSpouse: "" },
    { formData, spouses, newSpouse },
    onClose
  );

  const handleClose = () => { if (!saving) confirmClose(); };
  const dialogRef = useDialogFocus(handleClose);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value, ...(name === "mother_spouse_id" ? {mother_nm: ""} : {}) }));
  };

  // 부 설정 시 → 첫 번째 배우자 이름을 모(mother_nm)로 자동 지정
  useEffect(() => {
    const fatherId = formData.parent_id;
    let cancelled = false;

    if (!fatherId) {
      setMotherOptions([]);
      setFormData((prev) => ({ ...prev, mother_nm: "", mother_spouse_id: null }));
      return;
    }

    fetchSpousesByMemberId(fatherId)
      .then((spouses) => {
        if (cancelled) return;
        setMotherOptions(spouses);
        const firstWife = spouses.find((s) => s.order_no === 1);

        if (firstWife) {
          setFormData((prev) => ({
            ...prev,
            mother_nm: firstWife.name,
            mother_spouse_id: firstWife.id,
          }));
        } else {
          setFormData((prev) => ({ ...prev, mother_nm: "", mother_spouse_id: null }));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setFormData((prev) => ({ ...prev, mother_nm: "", mother_spouse_id: null }));
      });
    return () => { cancelled = true; };
  }, [formData.parent_id]);

  const handleAddSpouse = () => {
    const trimmed = newSpouse.trim();
    if (!trimmed) return;
    if (spouses.some((s) => s.spouse_nm === trimmed)) return;

    setSpouses([
      ...spouses,
      { spouse_nm: trimmed, order_no: spouses.length + 1 },
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
      const candidates = await memberAction({action:'duplicates',name:payload.name});
      if (candidates.length) {
        const result = await Swal.fire({title:'같은 이름의 인물이 있습니다',text:candidates.map(m=>`${m.name} (#${m.id}) / ${m.generation}세 / 부: ${m.parent_name||'미상'} / 출생: ${formatDate(m.birth_date,m.birth_date_precision)}`).join(', ')+' · 동명이인이면 계속 등록하세요.',showCancelButton:true,confirmButtonText:'동명이인으로 등록',cancelButtonText:'취소'});
        if (!result.isConfirmed) return;
      }
      const newMember = await createmember(payload);
      Swal.fire("추가 완료", "구성원이 추가되었습니다!", "success");
      onCreated(newMember);
      onClose();
    } catch (err) {
      Swal.fire("추가 실패", err.message, "error");
    } finally { setSaving(false); }
  };

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="구성원 등록" className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose}>
          ✖
        </button>
        <h2>➕ 구성원 추가</h2>
        <form onSubmit={handleSubmit} className={styles.editForm}>
          <FormField
            label="이름"
            name="name"
            maxLength={20}
            value={formData.name}
            onChange={handleChange}
            required
          />
          <FormField
            label="한자"
            name="hanja"
            value={formData.hanja || ""}
            onChange={handleChange}
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

          {/* 모 정보는 자동 설정되며 readOnly */}
          <FormField
            label="모 (선택)"
            name="mother_spouse_id"
            value={formData.mother_spouse_id || ""}
            type="select"
            onChange={handleChange}
            options={[{value:"",label:"선택 안함"},...motherOptions.map(m=>({value:m.id,label:m.name}))]}
          />

          <FormField
            label="대"
            name="generation"
            value={formData.generation}
            type="number"
            readOnly={!!formData.parent_id}
            required
          />

          {/* 배우자 리스트 */}
          <div className={styles.spouseSection}>
            <label>배우자</label>
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
            value={formData.notes}
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
            <button disabled={saving} type="submit" className={styles.saveBtn}>
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
