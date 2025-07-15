import { useState, useEffect } from "react";
import styles from "./ModalEdit.module.css";
import {
  updatemember,
  fetchMemberById,
  fetchSpousesByMemberId,
} from "../../utils/api";
import { isRequiredFilled, sanitizeFormData, formatInputDate } from "../../utils/helpers";
import FormField from "../Form/FormField";
import ParentSelector from "../Form/ParentsSelector";
import Swal from "sweetalert2";
import useParentSelection from "../hooks/useParentSelection";
import useConfirmOnClose from "../hooks/useConfirmOnClose";

export default function ModalEdit({ member, onClose, onUpdated }) {
  const initialData = { ...member };
  const [formData, setFormData] = useState(initialData);

  // spouseList를 props에서 바로 초기화
  const [spouses, setSpouses] = useState(member.spouseList || []);
  const [newSpouse, setNewSpouse] = useState("");
  const [motherOptions, setMotherOptions] = useState([]);

  const {
    parentNameInput,
    setParentNameInput,
    filteredOptions,
    showParentDropdown,
    setShowDropdown: setShowParentDropdown,
    handleParentSelect,
  } = useParentSelection(setFormData, member.parent_id);

  const handleClose = useConfirmOnClose(initialData, formData, onClose);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 부(parent_id)가 바뀌면 여성 spouse 목록 불러오기
  useEffect(() => {
    const fatherId = formData.parent_id;
    if (fatherId) {
      fetchSpousesByMemberId(fatherId)
        .then((spouses) => {
          setMotherOptions(spouses);
        })
        .catch(() => {
          setMotherOptions([]);
        });
    } else {
      setMotherOptions([]);
    }
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

    if (!isRequiredFilled(formData)) {
      Swal.fire("입력 누락", "필수 항목을 모두 입력해주세요.", "warning");
      return;
    }

    try {
      const payload = {
        ...sanitizeFormData(formData),
        spouseList: spouses,
      };

      await updatemember(payload);
      const refreshed = await fetchMemberById(formData.id);
      Swal.fire("수정 완료!", "", "success");
      onUpdated(refreshed);
      onClose();
    } catch (err) {
      Swal.fire("오류 발생", "다시 시도해주세요.", "error");
    }
  };

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
          <FormField
            label="출생 (※ 연도를 모를 경우 1월 1일로 입력)"
            name="birth_date"
            value={formatInputDate(formData.birth_date || "")}
            onChange={handleChange}
            type="date"
          />
          <FormField
            label="사망"
            name="death_date"
            value={formatInputDate(formData.death_date || "")}
            onChange={handleChange}
            type="date"
          />
          <ParentSelector
            label="부 성명"
            value={parentNameInput}
            onInputChange={(e) => {
              setParentNameInput(e.target.value);
              setShowParentDropdown(true);
            }}
            onSelect={handleParentSelect}
            options={filteredOptions}
            showDropdown={showParentDropdown}
            setShowDropdown={setShowParentDropdown}
            required
            placeholder="필수 입력값입니다."
          />
          <FormField
            label="모 (선택)"
            name="mother_nm"
            value={formData.mother_nm || ""}
            onChange={handleChange}
            type="select"
            options={[
              { value: "", label: "선택 안함" },
              ...motherOptions.map((m) => ({
                value: m.name,
                label: `${m.name}`,
              })),
            ]}
          />
          <FormField
            label="대"
            name="generation"
            value={formData.generation}
            readOnly
            required
          />

          {/* 🔹 배우자 목록 UI */}
          <div className={styles.spouseSection}>
            <label>배우자 목록</label>
            <div className={styles.spouseList}>
              {spouses.map((s, i) => (
                <div key={i} className={styles.spouseItem}>
                  <span>{s.spouse_nm}</span>
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
            <button type="submit" className={styles.editBtn}>
              수정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
