import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { name, startYear, endYear, sort } = req.body || {};
  const validYear = value => !value || (/^\d{1,4}$/.test(String(value)) && Number(value)>=1 && Number(value)<=9999);
  if ((name && (typeof name!=="string" || name.length>80)) || !validYear(startYear) || !validYear(endYear) || (startYear && endYear && Number(startYear)>Number(endYear))) return res.status(400).json({message:"검색 이름 또는 연도 범위를 확인해주세요."});

  try {
    let query = `
    SELECT
      f.id,f.name,f.hanja,f.gender,f.birth_date,f.birth_date_precision,f.death_date,f.death_date_precision,f.generation,f.parent_id,
      p.name AS parent_name
    FROM family_members f
    LEFT JOIN family_members p ON f.parent_id = p.id
  `;

    const conditions = ['f.deleted_at IS NULL'];
    const values = [];

    if (name) {
      values.push(`%${name}%`);
      conditions.push(`f.name ILIKE $${values.length}`);
    }

    if (startYear && endYear) {
      values.push(startYear, endYear);
      conditions.push(
        `EXTRACT(YEAR FROM f.birth_date) BETWEEN $${values.length - 1} AND $${
          values.length
        }`
      );
    } else if (startYear) {
      values.push(startYear);
      conditions.push(`EXTRACT(YEAR FROM f.birth_date) >= $${values.length}`);
    } else if (endYear) {
      values.push(endYear);
      conditions.push(`EXTRACT(YEAR FROM f.birth_date) <= $${values.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query +=
      sort === "asc"
        ? " ORDER BY f.generation ASC, f.birth_date DESC, f.id ASC"
        : " ORDER BY f.generation DESC, f.birth_date DESC, f.id ASC";

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("DB 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
}
