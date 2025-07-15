import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      DELETE FROM ping_log
      WHERE created_at < NOW() - INTERVAL '7 days'
      RETURNING *
      `
    );

    const deletedCount = result.rowCount;

    res.status(200).json({
      success: true,
      deleted: deletedCount,
      message: `${deletedCount}건의 로그가 삭제되었습니다.`,
    });
  } catch (error) {
    console.error("ping_log 삭제 실패:", error);
    res.status(500).json({
      success: false,
      message: "ping_log 삭제 중 오류 발생",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
