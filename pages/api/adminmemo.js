// pages/api/adminMemo.js
import pool from "@/server/db_pg"; // PostgreSQL 연결 객체

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { action, content } = req.body;

    // 메모 조회
    if (action === "get") {
      try {
        const result = await pool.query(
          "SELECT content FROM admin_memo WHERE id = 1"
        );
        const memo = result.rows[0]?.content || "";
        return res.status(200).json({ content: memo });
      } catch (err) {
        console.error("메모 조회 실패:", err);
        return res.status(500).json({ error: "DB 조회 실패" });
      }
    }

    // 메모 저장
    if (action === "save") {
      if (typeof content !== "string") {
        return res
          .status(400)
          .json({ error: "content는 문자열이어야 합니다." });
      }
      try {
        await pool.query(
          "UPDATE admin_memo SET content = $1 WHERE id = 1",
          [content]
        );
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error("메모 저장 실패:", err);
        return res.status(500).json({ error: "DB 저장 실패" });
      }
    }

    return res.status(400).json({ error: "알 수 없는 action" });
  }

  res.setHeader("Allow", ["POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
