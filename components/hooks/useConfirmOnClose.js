import Swal from "sweetalert2";
import { useCallback } from "react";

export default function useConfirmOnClose(initialData, currentData, onClose) {
  const handleClose = useCallback(async () => {
    const changed = JSON.stringify(initialData) !== JSON.stringify(currentData);
    if (changed) {
      const result = await Swal.fire({
        title: "입력값이 수정되었습니다.",
        text: "정말 닫으시겠습니까?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "네, 닫기",
        cancelButtonText: "취소",
      });
      if (!result.isConfirmed) return;
    }
    onClose();
  }, [initialData, currentData, onClose]);

  return handleClose;
}
