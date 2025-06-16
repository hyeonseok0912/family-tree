import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    id, name, gender, birth_date, death_date,
    generation, parent_id, spouse_nm, notes,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE family_members
       SET name = $1,
           gender = $2,
           birth_date = $3,
           death_date = $4,
           generation = $5,
           parent_id = $6,
           spouse_nm = $7,
           notes = $8
       WHERE id = $9`,
      [name, gender, birth_date, death_date, generation, parent_id, spouse_nm, notes, id]
    );

    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("DB 업데이트 실패:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
