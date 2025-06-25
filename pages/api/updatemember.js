import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    id, hanja, name, gender, birth_date, death_date,
    generation, parent_id, spouse_nm, notes,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE family_members
       SET name = $1,
            hanja = $2,
           gender = $3,
           birth_date = $4,
           death_date = $5,
           generation = $6,
           parent_id = $7,
           spouse_nm = $8,
           notes = $9
       WHERE id = $10`,
      [name, hanja, gender, birth_date, death_date, generation, parent_id, spouse_nm, notes, id]
    );

    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("DB 업데이트 실패:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
