import Swal from "sweetalert2";
import styles from "./ExportButtons.module.css";

function nativeSave(filename,dataUrl){
  if(window.FamilyTreeNative?.saveFile){window.FamilyTreeNative.saveFile(filename,dataUrl);return true;}
  if(window.webkit?.messageHandlers?.familyTreeExport){window.webkit.messageHandlers.familyTreeExport.postMessage({filename,dataUrl});return true;}
  return false;
}
async function capture(target) {
  const {default:html2canvas}=await import("html2canvas");
  const clone=target.cloneNode(true);
  const host=document.createElement('div');
  Object.assign(host.style,{position:'absolute',left:'-100000px',top:'0',background:'white'});
  host.appendChild(clone);document.body.appendChild(host);
  Array.from(clone.querySelectorAll('*')).reverse().forEach(element=>{
    if(element.scrollWidth>element.clientWidth || element.scrollHeight>element.clientHeight){
      element.style.maxHeight='none';element.style.height='auto';element.style.overflow='visible';
      element.style.width=`${Math.max(element.scrollWidth,element.clientWidth)}px`;
      element.scrollLeft=0;element.scrollTop=0;
    }
    if(element.style.transform?.startsWith('scale('))element.style.transform='none';
  });
  try {
    const width=Math.max(clone.scrollWidth,clone.offsetWidth),height=Math.max(clone.scrollHeight,clone.offsetHeight);
    if(width*height>25000000)throw Error('가계도가 너무 커서 이미지로 저장할 수 없습니다. 브라우저 인쇄 기능을 사용해주세요.');
    return await html2canvas(clone,{useCORS:true,scale:Math.min(2,Math.sqrt(25000000/(width*height))),width,height,backgroundColor:'#ffffff'});
  }finally{host.remove();}
}
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
      const canvas = await capture(targetRef.current);

      const image = canvas.toDataURL("image/png");
      if(nativeSave(`${fileName}.png`,image)){Swal.close();return;}
      const link = document.createElement("a");
      link.href = image;
      link.download = `${fileName}.png`;
      link.click();
      Swal.close();
    } catch (err) {
      console.error("이미지 저장 실패:", err);
      Swal.close();
      Swal.fire("실패", err.message || "이미지 저장 중 오류가 발생했습니다.", "error");
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
      const canvas = await capture(targetRef.current);

      const image = canvas.toDataURL("image/png");
      const {jsPDF}=await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      const pageWidth=pdf.internal.pageSize.getWidth()-20,pageHeight=pdf.internal.pageSize.getHeight()-20;
      const imageHeight=canvas.height*pageWidth/canvas.width;
      for(let y=0,page=0;y<imageHeight;y+=pageHeight,page++){
        if(page)pdf.addPage();
        pdf.addImage(image,'PNG',10,10-y,pageWidth,imageHeight);
      }

      if(nativeSave(`${fileName}.pdf`,pdf.output("datauristring"))){Swal.close();return;}
      // iOS 대응: 새 탭으로 열기
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);
        window.open(url);
        setTimeout(()=>URL.revokeObjectURL(url),60000);
      } else {
        pdf.save(`${fileName}.pdf`);
      }
      Swal.close();
    } catch (err) {
      console.error("PDF 저장 실패:", err);
      Swal.close();
      Swal.fire("실패", err.message || "PDF 저장 중 오류가 발생했습니다.", "error");
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
