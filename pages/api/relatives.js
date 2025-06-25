export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { memberId, parentId } = req.body;

  try {
    let siblings = [];
    let children = [];

    if (parentId !== null && parentId !== undefined) {
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
