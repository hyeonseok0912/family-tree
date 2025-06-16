import pool from "../../server/db_pg"; // ← pg.Pool 인스턴스

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    name,
    gender,
    birth_date,
    death_date,
    generation,
    parent_id,
    spouse_nm,
    notes,
  } = req.body;

  try {
    // INSERT 쿼리 (PostgreSQL은 RETURNING 사용)
    const insertQuery = `
      INSERT INTO family_members 
      (name, gender, birth_date, death_date, generation, parent_id, spouse_nm, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      name,
      gender,
      birth_date,
      death_date,
      generation,
      parent_id,
      spouse_nm,
      notes,
    ];

    const result = await pool.query(insertQuery, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("DB insert error:", error);
    res.status(500).json({ message: "DB error", error });
  }
}
