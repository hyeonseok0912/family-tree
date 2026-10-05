import { useEffect, useState, useRef } from "react";
import styles from "./AdminMemoTab.module.css";
import { fetchAdminMemo, saveAdminMemo } from "../../utils/api";
import { createMemoAutosave } from "../../utils/memoAutosave";

export default function AdminMemoTab() {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("불러오는 중...");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const autosaveRef = useRef(null);
  useEffect(() => {
    let active = true;
    const autosave = createMemoAutosave({ save: saveAdminMemo, onStatus: setStatus });
    autosaveRef.current = autosave;
    setReady(false);
    setStatus("불러오는 중...");
    fetchAdminMemo().then((content) => {
      if (!active) return;
      setNote(content); setReady(true); setStatus("저장됨");
    }).catch(() => { if (active) setStatus("불러오기 실패"); });
    return () => {
      active = false; autosave.dispose();
      if (autosaveRef.current === autosave) autosaveRef.current = null;
    };
  }, [attempt]);
  const handleChange = (event) => {
    setNote(event.target.value); autosaveRef.current?.change(event.target.value);
  };
  const handleClear = () => {
    if (!ready || !confirm("정말 초기화하시겠습니까?")) return;
    setNote(""); autosaveRef.current?.clear();
  };
  return (
    <div className={styles.memoContainer}>
      <h2>🛠 관리자 메모</h2><br />
      <textarea value={note} onChange={handleChange} disabled={!ready}
        placeholder="개발 관련 메모를 입력하세요..." className={styles.textarea} />
      <div className={styles.footer}>
        <span role="status">{status}</span>
        {status === "불러오기 실패" && <button onClick={() => setAttempt((value) => value + 1)}>다시 불러오기</button>}
        {status === "저장 실패" && <button onClick={() => autosaveRef.current?.change(note)}>다시 저장</button>}
        {status === "초기화 실패" && <button onClick={() => autosaveRef.current?.clear()}>초기화 다시 시도</button>}
        <button onClick={handleClear} disabled={!ready} className={styles.clearButton}>초기화</button>
      </div>
    </div>
  );
}
