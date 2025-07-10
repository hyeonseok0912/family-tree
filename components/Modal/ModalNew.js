import { useState, useEffect } from "react";
import styles from "./ModalNew.module.css";
import { createMember, fetchSpousesByMemberId } from "../../utils/api";
import { isRequiredFilled, sanitizeFormData } from "../../utils/helpers";
import FormField from "../Form/FormField";
import ParentSelector from "../Form/ParentsSelector";
import useParentSelection from "../hooks/useParentSelection";
import useConfirmOnClose from "../hooks/useConfirmOnClose";
import Swal from "sweetalert2";

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
};

export default function ModalNew({ onClose, onCreated }) {
  const [formData, setFormData] = useState({ ...initialData });
  const [spouses, setSpouses] = useState([]);
  const [newSpouse, setNewSpouse] = useState("");

  const {
    parentNameInput,
    setParentNameInput,
    filteredOptions,
    showParentDropdown,
    setShowDropdown: setShowParentDropdown,
    handleParentSelect,
  } = useParentSelection(setFormData);

  const handleClose = useConfirmOnClose(initialData, formData, onClose);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 부 설정 시 → 첫 번째 배우자 이름을 모(mother_nm)로 자동 지정
  useEffect(() => {
    const fatherId = formData.parent_id;

    if (!fatherId) {
      setFormData((prev) => ({ ...prev, mother_nm: "" }));
      return;
    }

    fetchSpousesByMemberId(fatherId)
      .then((spouses) => {
        const firstWife = spouses.find((s) => s.order_no === 1);

        if (firstWife) {
          setFormData((prev) => ({
            ...prev,
            mother_nm: firstWife.name,
          }));
        } else {
          setFormData((prev) => ({ ...prev, mother_nm: "" }));
        }
      })
      .catch((err) => {
        setFormData((prev) => ({ ...prev, mother_nm: "" }));
      });
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
    if (!isRequiredFilled(formData)) {
      Swal.fire("입력 누락", "필수 항목을 모두 입력해주세요.", "warning");
      return;
    }

    try {
      const payload = {
        ...sanitizeFormData(formData),
        spouseList: spouses,
      };
      const newMember = await createMember(payload);
      Swal.fire("추가 완료", "구성원이 추가되었습니다!", "success");
      onCreated(newMember);
      onClose();
    } catch (err) {
      Swal.fire("추가 실패", "구성원 추가에 실패했습니다.", "error");
    }
  };

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose}>
          ✖
        </button>
        <h2>➕ 구성원 추가</h2>
        <form onSubmit={handleSubmit} className={styles.editForm}>
          <FormField
            label="이름"
            name="name"
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
            required
            type="select"
            options={[
              { value: "M", label: "남" },
              { value: "F", label: "여" },
            ]}
          />
          <FormField
            label="출생 연도"
            name="birth_date"
            value={formData.birth_date}
            onChange={handleChange}
            type="date"
          />
          <FormField
            label="사망 연도"
            name="death_date"
            value={formData.death_date}
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

          {/* 모 정보는 자동 설정되며 readOnly */}
          <FormField
            label="모 (자동)"
            name="mother_nm"
            value={formData.mother_nm || ""}
            readOnly
          />

          <FormField
            label="대"
            name="generation"
            value={formData.generation}
            readOnly
            required
          />

          {/* 배우자 리스트 */}
          <div className={styles.spouseSection}>
            <label>배우자</label>
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
            <button type="submit" className={styles.saveBtn}>
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
