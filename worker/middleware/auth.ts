import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env, AppVariables } from '../types';
import { verifyJwt } from '../utils/crypto';

export const ADMIN_COOKIE_NAME = 'pakzy_admin_token';
export const MIN_JWT_SECRET_LENGTH = 32;

/**
 * ดึงค่า JWT_SECRET จาก Environment
 * - บน Production: ต้องมีค่าและยาวไม่น้อยกว่า 32 ตัวอักษรเท่านั้น หากไม่มีหรือสั้นเกินไปจะส่งคืน null (Fail-Closed)
 * - บน Local Development: อนุญาตค่า dev fallback เฉพาะเมื่อระบุ ENVIRONMENT ว่าเป็น 'development' หรือ 'test' เท่านั้น
 */
export function getJwtSecret(env: Env): string | null {
  const secret = env.JWT_SECRET?.trim();
  const isExplicitDevOrTest =
    env.ENVIRONMENT === 'development' || env.ENVIRONMENT === 'test';

  if (secret && secret.length >= MIN_JWT_SECRET_LENGTH) {
    return secret;
  }

  if (isExplicitDevOrTest) {
    if (secret && secret.length >= 16) {
      return secret;
    }
    return 'pakzy-local-dev-jwt-secret-key-at-least-32-chars-long';
  }

  // บน Production หรือสภาพแวดล้อมที่ไม่ได้ระบุ dev/test: บันทึก Error และ Fail-Closed โดยไม่เปิดเผย secret
  if (!secret) {
    console.error('[AUTH_SECURITY] JWT_SECRET is not configured in production environment. Refusing authentication.');
  } else {
    console.error(`[AUTH_SECURITY] JWT_SECRET does not meet minimum length requirement (${MIN_JWT_SECRET_LENGTH} characters). Refusing authentication.`);
  }

  return null;
}

/**
 * Middleware ตรวจสอบสิทธิ์แอดมินผ่าน httpOnly Cookie สำหรับเส้นทาง /api/admin/*
 */
export async function adminAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  next: Next
) {
  const secret = getJwtSecret(c.env);
  if (!secret) {
    // ปฏิเสธคำขอทันทีหากระบบความปลอดภัยของ production ไม่พร้อม (Fail-Closed)
    return c.json({ error: 'ระบบความปลอดภัยไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, 500);
  }

  const token = getCookie(c, ADMIN_COOKIE_NAME);
  if (!token) {
    return c.json({ error: 'กรุณาเข้าสู่ระบบสำหรับผู้ดูแลระบบก่อนดำเนินการ' }, 401);
  }

  const payload = await verifyJwt(token, secret);

  if (!payload) {
    return c.json({ error: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง' }, 401);
  }

  c.set('admin', payload);
  await next();
}
