import { timingSafeEqual } from 'node:crypto';
import { getUser, HttpError } from './auth';
export async function requireOperator(req){
 const expected=process.env.CRON_SECRET;
 const given=req.headers.authorization?.replace(/^Bearer /,'');
 if(expected&&given&&Buffer.byteLength(expected)===Buffer.byteLength(given)&&timingSafeEqual(Buffer.from(expected),Buffer.from(given)))return;
 const user=await getUser(req);
 if(user?.role==='SUPER_ADMIN'&&!user.must_change_password)return;
 throw new HttpError(401,'운영 작업 인증이 필요합니다.');
}
