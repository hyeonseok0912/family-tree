import { useState } from "react";
import styles from "./AdminLoginModal.module.css";

export default function AdminLoginModal({ onLogin, onClose }) {
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (adminId === "admin" && adminPw === "son1234") {
      onLogin();
    } else {
      setError("아이디 또는 비밀번호가 일치하지 않습니다.");
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>관리자 로그인</h2>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <input
            type="text"
            placeholder="ID"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={adminPw}
            onChange={(e) => setAdminPw(e.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.btnGroup}>
            <button type="submit">로그인</button>
            <button type="button" onClick={onClose}>
              관리자 아님
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
