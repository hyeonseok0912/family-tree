import pool from "../../server/db_pg";
import {requireOperator} from '../../server/cronAuth';
import {sendError} from '../../server/auth';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  let client;

  try {
    await requireOperator(req);
    client=await pool.connect();
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
    return sendError(res,error);
  } finally {
    client?.release();
  }
}
