import presentation from "../../../utils/recordPresentation.cjs";
import { randomBytes } from 'node:crypto';
import pool from '../../../server/db_pg';
import { assertMutation, assertSuper, requireUser, getUser, publicUser, hashPassword,
  verifyPassword, tokenHash, sessionToken, setSessionCookie, audit, HttpError, sendError } from '../../../server/auth';

function validateAccount(body) {
  if (typeof body.username !== 'string' || !/^[A-Za-z0-9_.-]{3,80}$/.test(body.username))
    throw new HttpError(400, '아이디는 영문·숫자·_.-로 3~80자 입력해주세요.');
  if (typeof body.display_name !== 'string' || !body.display_name.trim() || body.display_name.length > 80)
    throw new HttpError(400, '표시 이름을 1~80자로 입력해주세요.');
  validatePassword(body.password);
}
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256)
    throw new HttpError(400, '비밀번호는 12~256자로 입력해주세요.');
}
async function throttle(client, req, username = '') {
  const key = tokenHash(`${req.socket.remoteAddress}:${username.toLowerCase()}`);
  const result = await client.query(`INSERT INTO auth_attempts(key,attempts) VALUES($1,1)
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.started_at<now()-interval '15 minutes' THEN 1 ELSE auth_attempts.attempts+1 END,
    started_at=CASE WHEN auth_attempts.started_at<now()-interval '15 minutes' THEN now() ELSE auth_attempts.started_at END RETURNING attempts`, [key]);
  if (result.rows[0].attempts > 10) throw new HttpError(429, '시도가 너무 많습니다. 15분 후 다시 시도해주세요.');
  return key;
}

// Only failed credential checks count toward the temporary lock.
async function credentialLimit(client, req, username) {
  const key=tokenHash(`${req.socket.remoteAddress}:${username.toLowerCase()}`);
  const result=await client.query("SELECT attempts FROM auth_attempts WHERE key=$1 AND started_at>now()-interval '15 minutes'",[key]);
  if((result.rows[0]?.attempts||0)>=10)throw new HttpError(429,'비밀번호 확인에 여러 번 실패해 잠시 차단되었습니다. 15분 후 다시 시도해주세요.');
  return key;
}
async function failedCredential(client,key) {
  await client.query(`INSERT INTO auth_attempts(key,attempts) VALUES($1,1)
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.started_at<=now()-interval '15 minutes' THEN 1 ELSE auth_attempts.attempts+1 END,
    started_at=CASE WHEN auth_attempts.started_at<=now()-interval '15 minutes' THEN now() ELSE auth_attempts.started_at END`,[key]);
}
async function clearCredentialFailures(client,key) {
  await client.query('DELETE FROM auth_attempts WHERE key=$1',[key]);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let client;
  let transaction = false;
  try {
    const action = req.query.action;
    if (action === 'session') {
      if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
      return res.json({ user: publicUser(await getUser(req)) });
    }
    assertMutation(req);
    const body = req.body || {};
    client = await pool.connect();
    if (action === 'login') {
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      const attemptKey=await credentialLimit(client, req, username);
      const result = await client.query('SELECT * FROM admin_users WHERE username=$1 AND deleted_at IS NULL', [username]);
      const user = result.rows[0];
      const valid = await verifyPassword(body.password, user?.password_hash || `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`);
      if (!valid || user?.status !== 'ACTIVE') {await failedCredential(client,attemptKey);throw new HttpError(401, '아이디·비밀번호 또는 계정 활성 상태를 확인해주세요.');}
      await clearCredentialFailures(client,attemptKey);
      const token = randomBytes(32).toString('hex');
      const seconds = body.remember === true ? 30 * 86400 : 8 * 3600;
      await client.query('BEGIN'); transaction = true;
      await client.query(`INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+$3*interval '1 second')`, [tokenHash(token), user.id, seconds]);
      await client.query('UPDATE admin_users SET last_login_at=now() WHERE id=$1', [user.id]);
      await client.query('DELETE FROM admin_sessions WHERE expires_at<=now()');
      await client.query('COMMIT'); transaction = false;
      setSessionCookie(res, token, seconds);
      return res.json({ user: publicUser(user) });
    }
    if (action === 'logout') {
      const token = sessionToken(req);
      if (token) await client.query('DELETE FROM admin_sessions WHERE token_hash=$1', [tokenHash(token)]);
      setSessionCookie(res, '', 0);
      return res.json({ success: true });
    }
    if (action === 'register') {
      await throttle(client, req, 'register');
      validateAccount(body);
      const existing = await client.query('SELECT id FROM admin_users WHERE username=$1', [body.username]);
      if (existing.rowCount) throw new HttpError(409, '이미 사용 중인 아이디입니다.');
      const passwordHash = await hashPassword(body.password);
      await client.query('BEGIN'); transaction = true;
      const result = await client.query(`INSERT INTO admin_users(username,password_hash,display_name) VALUES($1,$2,$3) RETURNING id`, [body.username,passwordHash,body.display_name.trim()]);
      await audit(client,null,'REGISTER','admin_users',result.rows[0].id,null,{username:body.username,status:'PENDING'});
      await client.query('COMMIT'); transaction = false;
      return res.status(201).json({ success: true, message: '가입 신청이 완료되었습니다. 상위 관리자 승인 후 로그인할 수 있습니다.' });
    }
    const user = await requireUser(req, client);
    if (action === 'verify') {
      const attemptKey=await credentialLimit(client, req, user.username);
      if (!(await verifyPassword(body.password,user.password_hash))) {await failedCredential(client,attemptKey);throw new HttpError(401,'비밀번호가 일치하지 않습니다.');}
      await clearCredentialFailures(client,attemptKey);
      await client.query('UPDATE admin_sessions SET verified_at=now() WHERE token_hash=$1',[tokenHash(sessionToken(req))]);
      return res.json({ success:true });
    }
    if (action === 'password') {
      validatePassword(body.password);
      const attemptKey=await credentialLimit(client, req, user.username);
      if (!(await verifyPassword(body.current_password,user.password_hash))) {await failedCredential(client,attemptKey);throw new HttpError(401,'현재 비밀번호가 일치하지 않습니다.');}
      await clearCredentialFailures(client,attemptKey);
      await client.query('BEGIN'); transaction = true;
      await client.query('UPDATE admin_users SET password_hash=$1,must_change_password=false WHERE id=$2',[await hashPassword(body.password),user.id]);
      await client.query('DELETE FROM admin_sessions WHERE user_id=$1 AND token_hash<>$2',[user.id,tokenHash(sessionToken(req))]);
      await audit(client,user.id,'PASSWORD_CHANGE','admin_users',user.id,null,null);
      await client.query('COMMIT'); transaction=false;
      return res.json({ success:true });
    }
    if (action === 'audit') {
      if (!presentation.hasManagementAccess(user)) throw new HttpError(403, '작업 이력 조회 권한이 없습니다.');
      const result = await client.query(`SELECT a.*,u.display_name AS actor_name FROM audit_log a LEFT JOIN admin_users u ON u.id=a.actor_id
        ${user.role === 'SUPER_ADMIN' ? '' : 'WHERE a.actor_id=$1'} ORDER BY a.id DESC LIMIT 200`,user.role === 'SUPER_ADMIN' ? [] : [user.id]);
      return res.json(result.rows);
    }
    assertSuper(user);
    if (user.must_change_password) throw new HttpError(403,'초기 비밀번호를 변경해주세요.');
    if (action === 'admins') {
      const result = await client.query('SELECT id,username,display_name,role,status,permissions,created_at,last_login_at FROM admin_users WHERE deleted_at IS NULL ORDER BY id');
      return res.json(result.rows);
    }
    if (action === 'admin-create') {
      assertSuper(user,true);
      const temporaryPassword=randomBytes(18).toString('base64url');
      validateAccount({...body,password:temporaryPassword});
      await client.query('BEGIN');transaction=true;
      const created=await client.query("INSERT INTO admin_users(username,password_hash,display_name,role,status,must_change_password,created_by) VALUES($1,$2,$3,'EDITOR','ACTIVE',true,$4) RETURNING *",[body.username,await hashPassword(temporaryPassword),body.display_name.trim(),user.id]);
      await audit(client,user.id,'ADMIN_CREATE','admin_users',created.rows[0].id,null,publicUser(created.rows[0]));
      await client.query('COMMIT');transaction=false;
      return res.status(201).json({success:true,temporary_password:temporaryPassword});
    }
    if (action === 'admin-delete' || action === 'admin-update' || action === 'assign-owner' || action === 'reset-password') {
      assertSuper(user, action === 'assign-owner');
      await client.query('BEGIN'); transaction = true;
      await client.query('LOCK TABLE admin_users IN SHARE ROW EXCLUSIVE MODE');
      if (action === 'assign-owner') {
        const owner = await client.query("SELECT id FROM admin_users WHERE id=$1 AND status='ACTIVE'",[body.owner_id]);
        if (!owner.rowCount) throw new HttpError(400,'활성 관리자 계정을 선택해주세요.');
        const previous=await client.query('SELECT * FROM family_members WHERE id=$1 FOR UPDATE',[body.member_id]);
        if (!previous.rowCount) throw new HttpError(404,'구성원이 없습니다.');
        const updated=await client.query('UPDATE family_members SET created_by=$1,updated_by=$2,updated_at=now() WHERE id=$3 RETURNING *',[body.owner_id,user.id,body.member_id]);
        await audit(client,user.id,'ASSIGN_OWNER','family_members',body.member_id,previous.rows[0],updated.rows[0]);
      } else {
        const previous = await client.query('SELECT * FROM admin_users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[body.id]);
        if (!previous.rowCount) throw new HttpError(404,'관리자 계정이 없습니다.');
        if (action === 'admin-delete') {
          const count=await client.query("SELECT count(*)::int AS count FROM admin_users WHERE role='SUPER_ADMIN' AND status='ACTIVE' AND deleted_at IS NULL");
          if(previous.rows[0].role==='SUPER_ADMIN'&&previous.rows[0].status==='ACTIVE'&&count.rows[0].count<=1)throw new HttpError(400,'마지막 활성 상위 관리자는 삭제할 수 없습니다.');
          await client.query("UPDATE admin_users SET deleted_at=now(),status='SUSPENDED' WHERE id=$1",[body.id]);
          await client.query('DELETE FROM admin_sessions WHERE user_id=$1',[body.id]);
          await audit(client,user.id,'ADMIN_DELETE','admin_users',body.id,publicUser(previous.rows[0]),{deleted:true});
          await client.query('COMMIT');transaction=false;
          return res.json({success:true});
        }
        if (action === 'reset-password') {
          const temporaryPassword = randomBytes(18).toString('base64url');
          await client.query('UPDATE admin_users SET password_hash=$1,must_change_password=true WHERE id=$2',[await hashPassword(temporaryPassword),body.id]);
          await client.query('DELETE FROM admin_sessions WHERE user_id=$1',[body.id]);
          await audit(client,user.id,'PASSWORD_RESET','admin_users',body.id,null,null);
          await client.query('COMMIT'); transaction=false;
          return res.json({ success:true, temporary_password:temporaryPassword });
        }
        if (!['SUPER_ADMIN','EDITOR'].includes(body.role) || !['PENDING','ACTIVE','SUSPENDED','REJECTED'].includes(body.status)) throw new HttpError(400,'역할·상태 값이 올바르지 않습니다.');
        const permissions = Object.fromEntries(['create','update','delete'].map((key)=>[key,body.permissions?.[key]===true]));
        const count=await client.query("SELECT count(*)::int AS count FROM admin_users WHERE role='SUPER_ADMIN' AND status='ACTIVE'");
        if (previous.rows[0].role==='SUPER_ADMIN' && previous.rows[0].status==='ACTIVE' && (body.role!=='SUPER_ADMIN'||body.status!=='ACTIVE') && count.rows[0].count<=1) throw new HttpError(400,'마지막 활성 상위 관리자는 변경할 수 없습니다.');
        const updated=await client.query('UPDATE admin_users SET role=$1,status=$2,permissions=$3 WHERE id=$4 RETURNING *',[body.role,body.status,JSON.stringify(permissions),body.id]);
        await client.query('DELETE FROM admin_sessions WHERE user_id=$1',[body.id]);
        await audit(client,user.id,'ADMIN_UPDATE','admin_users',body.id,publicUser(previous.rows[0]),publicUser(updated.rows[0]));
      }
      await client.query('COMMIT'); transaction=false;
      return res.json({ success:true });
    }
    throw new HttpError(404,'알 수 없는 기능입니다.');
  } catch (error) {
    if (transaction && client) await client.query('ROLLBACK').catch(()=>{});
    if (error.code==='23505') return res.status(409).json({message:'이미 사용 중인 값입니다.'});
    return sendError(res,error);
  } finally { client?.release(); }
}
