import styles from "./LoadingOverlay.module.css";

export default function LoadingOverlay() {
  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.spinner}></div>
      <div className={styles.loadingText}>
        <div>해당 정보를 불러오고 있습니다.</div>
        <div>잠시만 기다려주세요.</div>
      </div>
    </div>
  );
}
