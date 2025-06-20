import { useState } from "react";
import styles from "./ModalNew.module.css";
import { createMember } from "../../utils/api";
import { isRequiredFilled } from "../../utils/helpers";
import FormField from "../Form/FormField";
import ParentSelector from "../Form/ParentsSelector";
import useParentSelection from "../hooks/useParentSelection";
import useConfirmOnClose from "../hooks/useConfirmOnClose";
import Swal from "sweetalert2";

const initialData = {
  name: "",
  gender: "M",
  birth_date: "",
  death_date: "",
  generation: "",
  parent_id: "",
  spouse_nm: "",
  notes: "",
};

export default function ModalNew({ onClose, onCreated }) {
  const [formData, setFormData] = useState({ ...initialData });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRequiredFilled(formData)) {
      Swal.fire("입력 누락", "필수 항목을 모두 입력해주세요.", "warning");
      return;
    }

    try {
      const newMember = await createMember(formData);
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
            value={formData.birth_date || ""}
            onChange={handleChange}
            required
            type="date"
          />
          <FormField
            label="사망 연도"
            name="death_date"
            value={formData.death_date || ""}
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
            label="대"
            name="generation"
            value={formData.generation}
            onChange={handleChange}
            required
            readOnly
          />
          <FormField
            label="배우자"
            name="spouse_nm"
            value={formData.spouse_nm || ""}
            onChange={handleChange}
          />
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
            <button type="submit" className={styles.saveBtn}>
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
