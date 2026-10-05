import pool from "../../server/db_pg";
import {getUser} from "../../server/auth";
import presentation from "../../utils/recordPresentation.cjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id } = req.body || {};

  if (!Number.isInteger(Number(id)) || Number(id)<1 || Number(id)>2147483647) {
    return res.status(400).json({ error: "id가 필요합니다." });
  }

  let client;

  try {
    client=await pool.connect();
    // 1. 구성원 기본 정보 + 부모 이름만 JOIN, 모는 m.mother_nm 직접 사용
    const memberResult = await client.query(
      `
      SELECT 
        m.*, 
        father.name AS parent_name,
        creator.display_name AS created_by_name,
        updater.display_name AS updated_by_name,
        COALESCE(mother.spouse_nm,m.mother_nm) AS mother_nm
      FROM family_members m
      LEFT JOIN family_members father ON m.parent_id = father.id
      LEFT JOIN admin_users creator ON m.created_by=creator.id
      LEFT JOIN admin_users updater ON m.updated_by=updater.id
      LEFT JOIN spouse mother ON m.mother_spouse_id=mother.id
      WHERE m.id = $1 AND m.deleted_at IS NULL
      `,
      [id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: "구성원을 찾을 수 없습니다." });
    }

    const member = memberResult.rows[0];

    // 2. spouseList 조회
    const spouseResult = await client.query(
      `SELECT id, spouse_nm, order_no FROM spouse WHERE husband_id = $1 ORDER BY order_no,id`,
      [id]
    );

    member.spouseList = spouseResult.rows;

    const user = await getUser(req, client);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json(presentation.visibleMember(member, user));
  } catch (err) {
    console.error("조회 실패:", err);
    return res.status(500).json({ error: "서버 오류" });
  } finally {
    client?.release();
  }
}
