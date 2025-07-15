import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const client = await pool.connect();

  try {
    const deleteQuery = `
      DELETE FROM ping_log
      WHERE created_at < NOW() - INTERVAL '7 days'
    `;

    const result = await client.query(deleteQuery);

    console.log(`[ping_log] 삭제 완료: ${result.rowCount}건`);
    res.status(200).json({
      success: true,
      message: `${result.rowCount}개의 로그가 삭제되었습니다.`,
    });
  } catch (error) {
    console.error("[ping_log] 삭제 실패:", error);
    res.status(500).json({ success: false, error: "DB 삭제 실패" });
  } finally {
    client.release();
  }
}
