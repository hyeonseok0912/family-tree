import { useEffect, useState, useRef } from "react";
import styles from "./AdminMemoTab.module.css";

export default function AdminMemoTab() {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("불러오는 중...");
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchMemo = async () => {
      try {
        const res = await fetch("/api/adminmemo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get" }),
        });
        const data = await res.json();
        setNote(data.content || "");
        setStatus("저장됨");
      } catch {
        setStatus("불러오기 실패");
      }
    };
    fetchMemo();
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setNote(value);
    setStatus("저장 중...");

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/adminmemo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", content: value }),
        });
        setStatus("저장됨");
      } catch {
        setStatus("저장 실패");
      }
    }, 1000);
  };

  const handleClear = async () => {
    if (!confirm("정말 초기화하시겠습니까?")) return;
    setNote("");
    setStatus("초기화 중...");

    try {
      await fetch("/api/adminmemo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", content: "" }),
      });
      setStatus("초기화됨");
    } catch {
      setStatus("초기화 실패");
    }
  };

  return (
    <div className={styles.memoContainer}>
      <h2>🛠 관리자 메모</h2>
      <br></br>
      <textarea
        value={note}
        onChange={handleChange}
        placeholder="개발 관련 메모를 입력하세요..."
        className={styles.textarea}
      />
      <div className={styles.footer}>
        <span className={styles.status}>{status}</span>
        <button onClick={handleClear} className={styles.clearButton}>
          초기화
        </button>
      </div>
    </div>
  );
}
