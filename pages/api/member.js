import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "id가 필요합니다." });
  }

  const client = await pool.connect();

  try {
    // 1. 구성원 기본 정보 + 부모 이름만 JOIN, 모는 m.mother_nm 직접 사용
    const memberResult = await client.query(
      `
      SELECT 
        m.*, 
        father.name AS parent_name
      FROM family_members m
      LEFT JOIN family_members father ON m.parent_id = father.id
      WHERE m.id = $1
      `,
      [id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: "구성원을 찾을 수 없습니다." });
    }

    const member = memberResult.rows[0];

    // 2. spouseList 조회
    const spouseResult = await client.query(
      `SELECT spouse_nm, order_no FROM spouse WHERE husband_id = $1 ORDER BY order_no`,
      [id]
    );

    member.spouseList = spouseResult.rows;

    return res.status(200).json(member);
  } catch (err) {
    console.error("조회 실패:", err);
    return res.status(500).json({ error: "서버 오류" });
  } finally {
    client.release();
  }
}
