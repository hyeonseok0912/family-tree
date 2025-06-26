import pool from "@/server/db_pg"; // PostgreSQL 연결

export default async function handler(req, res) {
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 1000;
  const targetUrl = "https://milseongson.onrender.com/";

  let attempt = 1;
  let success = false;
  let lastErrorMessage = "";

  const ping = async () => {
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      success = true;
    } catch (err) {
      lastErrorMessage = err.message;
      if (attempt >= MAX_RETRIES) return;
      attempt++;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      await ping();
    }
  };

  await ping();

  // ping_log 테이블에 로그 저장
  try {
    await pool.query(
      `INSERT INTO ping_log (status, attempts, message) VALUES ($1, $2, $3)`,
      [success ? "success" : "fail", attempt, success ? null : lastErrorMessage]
    );
  } catch (dbErr) {
    // DB 에러 자체는 무시하되, 나중에 필요시 로그 추가 가능
  }

  // 응답
  if (success) {
    res.status(200).json({ status: "Ping 성공", attempts: attempt });
  } else {
    res.status(500).json({ status: "Ping 실패", attempts: attempt, error: lastErrorMessage });
  }
}
