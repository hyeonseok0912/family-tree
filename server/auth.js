import pool from './db_pg';
import security from './security.cjs';
export const { hashPassword, verifyPassword, tokenHash, canManage } = security;
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const publicUser = (user) => user ? ({ id: user.id, username: user.username,
  display_name: user.display_name, role: user.role, status: user.status,
  permissions: user.permissions, must_change_password: user.must_change_password }) : null;
export function sessionToken(req) {
  const token = req.cookies?.family_session;
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export async function getUser(req, client = pool) {
  const token = sessionToken(req);
  if (!token) return null;
  const result = await client.query(`SELECT u.*, s.verified_at FROM admin_sessions s
    JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='ACTIVE' AND u.deleted_at IS NULL`, [tokenHash(token)]);
  return result.rows[0] || null;
}
export async function requireUser(req, client = pool) {
  const user = await getUser(req, client);
  if (!user) throw new HttpError(401, '관리자 로그인이 필요합니다.');
  return user;
}
export function assertMutation(req) {
  if (req.method !== 'POST') throw new HttpError(405, 'Method Not Allowed');
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'JSON 요청이 필요합니다.');
  if (req.headers.origin) {
    let origin;
    try { origin = new URL(req.headers.origin); } catch { throw new HttpError(403, '잘못된 요청 출처입니다.'); }
    if (origin.host !== req.headers.host) throw new HttpError(403, '다른 사이트에서의 변경 요청은 허용되지 않습니다.');
  }
}
export function assertSuper(user, recent = false) {
  if (user.role !== 'SUPER_ADMIN') throw new HttpError(403, '상위 관리자 권한이 필요합니다.');
  if (recent && (!user.verified_at || Date.now() - new Date(user.verified_at).getTime() > 5 * 60 * 1000))
    throw new HttpError(403, '비밀번호를 다시 확인해주세요.');
}
export function assertCanManage(user, member, action) {
  if (user.must_change_password) throw new HttpError(403, '초기 비밀번호를 변경해주세요.');
  if (!canManage(user, member, action)) throw new HttpError(403, '이 구성원에 대한 작업 권한이 없습니다.');
}
export function setSessionCookie(res, token, seconds) {
  res.setHeader('Set-Cookie', `family_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}
export async function audit(client, actorId, action, entityType, entityId, before, after, reason = null) {
  await client.query(`INSERT INTO audit_log(actor_id,action,entity_type,entity_id,before_data,after_data,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7)`, [actorId,action,entityType,String(entityId),before ? JSON.stringify(before) : null,after ? JSON.stringify(after) : null,reason]);
}
export function sendError(res, error) {
  if (!error.status) console.error('API error:', error.code || error.message);
  return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : '서버 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' });
}
