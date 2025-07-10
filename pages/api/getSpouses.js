import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { member_id } = req.body;
  if (!member_id) {
    return res.status(400).json({ message: "member_id is required" });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT 
        s.spouse_nm AS name,
        s.order_no
      FROM spouse s
      WHERE s.husband_id = $1
      ORDER BY s.order_no ASC
      `,
      [member_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("배우자 조회 실패:", err);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    client.release();
  }
}
