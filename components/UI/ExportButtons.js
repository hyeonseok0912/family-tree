import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import styles from "./ExportButtons.module.css";

export default function ExportButtons({ targetRef, fileName = "download" }) {
  const handleExportImage = async () => {
    if (!targetRef?.current) return;

    Swal.fire({
      title: "이미지 생성 중...",
      text: "잠시만 기다려 주세요.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const canvas = await html2canvas(targetRef.current, {
        useCORS: true,
        scale: window.devicePixelRatio || 2, // 고해상도
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `${fileName}.png`;
      link.click();
    } catch (err) {
      console.error("이미지 저장 실패:", err);
      Swal.fire("실패", "이미지 저장 중 오류가 발생했습니다.", "error");
    } finally {
      Swal.close();
    }
  };

  const handleExportPDF = async () => {
    if (!targetRef?.current) return;

    Swal.fire({
      title: "PDF 생성 중...",
      text: "잠시만 기다려 주세요.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const canvas = await html2canvas(targetRef.current, {
        useCORS: true,
        scale: window.devicePixelRatio || 2, // 고해상도
      });

      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(image, "PNG", 0, 0, canvas.width, canvas.height);

      // iOS 대응: 새 탭으로 열기
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);
        window.open(url);
      } else {
        pdf.save(`${fileName}.pdf`);
      }
    } catch (err) {
      console.error("PDF 저장 실패:", err);
      Swal.fire("실패", "PDF 저장 중 오류가 발생했습니다.", "error");
    } finally {
      Swal.close();
    }
  };

  return (
    <div className={styles.buttonGroup}>
      <button className={styles.exportBtn} onClick={handleExportImage}>
        이미지로 저장
      </button>
      <button className={styles.exportBtn} onClick={handleExportPDF}>
        PDF로 저장
      </button>
    </div>
  );
}
