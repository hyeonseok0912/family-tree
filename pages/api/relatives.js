import pool from "../../server/db_pg";

export default async function handler(req, res) {
  const { memberId, parentId } = req.query;

  try {
    let siblings = [];
    let children = [];

    // 형제 쿼리는 parentId가 null이 아닐 때만 수행
    if (parentId !== "null" && parentId !== null && parentId !== undefined) {
      const siblingsQuery = `
        SELECT * FROM family_members
        WHERE parent_id = $1 AND id != $2
        ORDER BY birth_date ASC
      `;
      const siblingsResult = await pool.query(siblingsQuery, [
        parseInt(parentId),
        parseInt(memberId),
      ]);
      siblings = siblingsResult.rows;
    }

    // 자식은 무조건 조회 가능
    const childrenQuery = `
      SELECT * FROM family_members
      WHERE parent_id = $1
      ORDER BY birth_date ASC
    `;
    const childrenResult = await pool.query(childrenQuery, [
      parseInt(memberId),
    ]);
    children = childrenResult.rows;

    res.status(200).json({ siblings, children });
  } catch (err) {
    console.error("Relatives 조회 실패:", err);
    res.status(500).json({ message: "서버 에러" });
  }
}
