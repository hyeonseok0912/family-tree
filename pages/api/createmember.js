import pool from "../../server/db_pg";

function sanitizeInput(data) {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] =
      typeof value === "string" && value.trim() === "" ? null : value;
  }
  return sanitized;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    name,
    hanja,
    gender,
    birth_date,
    death_date,
    generation,
    parent_id,
    mother_nm,
    notes,
    spouseList = [],
  } = sanitizeInput(req.body);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertMemberQuery = `
      INSERT INTO family_members 
      (name, hanja, gender, birth_date, death_date, generation, parent_id, mother_nm, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const memberValues = [
      name,
      hanja,
      gender,
      birth_date,
      death_date,
      generation,
      parent_id,
      mother_nm,
      notes,
    ];

    const memberResult = await client.query(insertMemberQuery, memberValues);
    const newMember = memberResult.rows[0];
    const newMemberId = newMember.id;

    for (const { spouse_nm, order_no } of spouseList) {
      if (!spouse_nm?.trim()) continue; // ✅ spouse_nm 비어있으면 skip
      await client.query(
        `INSERT INTO spouse (husband_id, spouse_nm, order_no)
         VALUES ($1, $2, $3)`,
        [newMemberId, spouse_nm.trim(), order_no]
      );
    }

    await client.query(`
      UPDATE family_members fm
      SET mother_nm = s.spouse_nm
      FROM (
        SELECT husband_id, spouse_nm
        FROM spouse
        WHERE order_no = 1
      ) s
      WHERE fm.id = $1
        AND fm.parent_id = s.husband_id;
    `);

    await client.query("COMMIT");
    res.status(200).json(newMember);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("DB insert error:", error);
    res.status(500).json({ message: "DB error", error });
  } finally {
    client.release();
  }
}
