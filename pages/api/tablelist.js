import pool from "../../server/db_pg";

export default async function handler(req, res) {
  const { name, startYear, endYear, sort } = req.query;

  try {
    let query = `
      SELECT 
        f.*, 
        p.name AS parent_name 
      FROM family_members f
      LEFT JOIN family_members p ON f.parent_id = p.id
    `;

    const conditions = [];
    const values = [];

    if (name) {
      values.push(`%${name}%`);
      conditions.push(`f.name ILIKE $${values.length}`);
    }

    if (startYear && endYear) {
      values.push(startYear, endYear);
      conditions.push(`CAST(LEFT(f.birth_date, 4) AS INTEGER) BETWEEN $${values.length - 1} AND $${values.length}`);
    } else if (startYear) {
      values.push(startYear);
      conditions.push(`CAST(LEFT(f.birth_date, 4) AS INTEGER) >= $${values.length}`);
    } else if (endYear) {
      values.push(endYear);
      conditions.push(`CAST(LEFT(f.birth_date, 4) AS INTEGER) <= $${values.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += sort === "asc"
      ? " ORDER BY f.generation ASC, f.birth_date DESC, f.id ASC"
      : " ORDER BY f.generation DESC, f.birth_date DESC, f.id ASC";

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("DB 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
}
