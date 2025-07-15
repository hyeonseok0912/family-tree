import pool from "../../server/db_pg";

function sanitizeDate(value) {
  return value === "" ? null : value;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    id,
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
  } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: "id is required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. 구성원 정보 업데이트
    await client.query(
      `
      UPDATE family_members
      SET
        name = $1,
        hanja = $2,
        gender = $3,
        birth_date = $4,
        death_date = $5,
        generation = $6,
        parent_id = $7,
        mother_nm = $8,
        notes = $9
      WHERE id = $10
      `,
      [
        name,
        hanja,
        gender,
        sanitizeDate(birth_date),
        sanitizeDate(death_date),
        generation,
        parent_id,
        mother_nm || null,
        notes,
        id,
      ]
    );

    // 2. 기존 배우자 정보 삭제
    await client.query(`DELETE FROM spouse WHERE husband_id = $1`, [id]);

    // 3. 배우자 정보 재삽입
    for (const { spouse_nm, order_no } of spouseList) {
      if (!spouse_nm?.trim()) continue; // 유효성 체크
      await client.query(
        `
        INSERT INTO spouse (husband_id, spouse_nm, order_no)
        VALUES ($1, $2, $3)
        `,
        [id, spouse_nm.trim(), order_no]
      );
    }

    await client.query("COMMIT");
    res.status(200).json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DB 업데이트 실패:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
}
