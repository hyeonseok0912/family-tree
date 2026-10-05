import {getUser} from "../../server/auth";
import presentation from "../../utils/recordPresentation.cjs";
import pool from "../../server/db_pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { memberId, parentId } = req.body || {};
  if(!Number.isInteger(Number(memberId)) || Number(memberId)<1 || (parentId!=null && (!Number.isInteger(Number(parentId)) || Number(parentId)<1)))return res.status(400).json({message:"구성원 ID를 확인해주세요."});

  try {
    let siblings = [];
    let children = [];

    if (parentId !== null && parentId !== undefined) {
      const siblingsQuery = `
        SELECT * FROM family_members
        WHERE parent_id = $1 AND id != $2 AND deleted_at IS NULL
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
      WHERE parent_id = $1 AND deleted_at IS NULL
      ORDER BY birth_date ASC
    `;
    const childrenResult = await pool.query(childrenQuery, [
      parseInt(memberId),
    ]);
    children = childrenResult.rows;

    const user=await getUser(req);
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ siblings:siblings.map(member=>presentation.visibleMember(member,user)), children:children.map(member=>presentation.visibleMember(member,user)) });
  } catch (err) {
    console.error("Relatives 조회 실패:", err);
    res.status(500).json({ message: "서버 에러" });
  }
}
