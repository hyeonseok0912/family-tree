import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { id } = req.query;

    try {
      const result = await pool.query(
        `
        SELECT m.*, 
              father.name AS parent_name,
              father.spouse_nm AS mother_name
        FROM family_members m
        LEFT JOIN family_members father ON m.parent_id = father.id
        WHERE m.id = $1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Not found" });
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error("조회 실패:", err);
      res.status(500).json({ error: "서버 오류" });
    }
  } else {
    res.status(405).json({ error: "허용되지 않은 메서드" });
  }
}
