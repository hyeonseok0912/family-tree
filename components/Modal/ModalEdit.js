import { useState } from "react";
import styles from "./ModalEdit.module.css";
import { updateMember, fetchMemberById } from "../../utils/api";
import { isRequiredFilled } from "../../utils/helpers";
import FormField from "../Form/FormField";
import ParentSelector from "../Form/ParentsSelector";
import Swal from "sweetalert2";
import useParentSelection from "../hooks/useParentSelection";
import useConfirmOnClose from "../hooks/useConfirmOnClose";

export default function ModalEdit({ member, onClose, onUpdated }) {
  const initialData = { ...member };
  const [formData, setFormData] = useState(initialData);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRequiredFilled(formData)) {
      Swal.fire("입력 누락", "필수 항목을 모두 입력해주세요.", "warning");
      return;
    }

    try {
      const updatedMember = await updateMember(formData);
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
            label="출생"
            name="birth_date"
            value={formData.birth_date || ""}
            onChange={handleChange}
            required
            type="date"
          />
          <FormField
            label="사망"
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
            <button type="submit" className={styles.editBtn}>
              수정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
