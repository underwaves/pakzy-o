import { hashPasswordPBKDF2, verifyPasswordPBKDF2 } from './crypto';

// ตัวอักษรและตัวเลขที่ไม่กำกวม (ตัด 0, O, 1, I, L ออก) สำหรับสร้างรหัสสมาชิก เช่น PZ-4K9M
const SAFE_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export interface LoyaltyRulesConfig {
  loyalty_enabled: boolean;
  baht_per_point: number;
  points_expiry_months: number; // 0 = ไม่หมดอายุ
  review_bonus_points: number; // 0 = ปิดโบนัสรีวิว
  contact_line: string;
}

export interface CustomerRow {
  id: number;
  member_code: string;
  display_name: string;
  contact: string;
  pin_hash: string;
  pin_salt: string;
  points_balance: number;
  lifetime_points: number;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  consent_at: string;
}

/**
 * ดึงค่ากติกาการสะสมแต้มจากตาราง site_settings
 */
export async function getLoyaltyRules(db: D1Database): Promise<LoyaltyRulesConfig> {
  const { results } = await db
    .prepare(
      `SELECT key, value FROM site_settings
       WHERE key IN ('loyalty_enabled', 'baht_per_point', 'points_expiry_months', 'review_bonus_points', 'contact_line')`
    )
    .all<{ key: string; value: string }>();

  const map: Record<string, string> = {};
  for (const r of results) {
    map[r.key] = r.value;
  }

  const loyaltyEnabled = map.loyalty_enabled !== 'false' && map.loyalty_enabled !== '0';
  const bahtPerPoint = Math.max(1, Number(map.baht_per_point) || 10);
  const expiryMonths = Math.max(0, Number(map.points_expiry_months) || 0);
  const reviewBonus = Math.max(0, Number(map.review_bonus_points) || 0);

  return {
    loyalty_enabled: loyaltyEnabled,
    baht_per_point: bahtPerPoint,
    points_expiry_months: expiryMonths,
    review_bonus_points: reviewBonus,
    contact_line: (map.contact_line || '@280npxvj').trim(),
  };
}

/**
 * สร้างรหัสสมาชิกใหม่แบบไม่ซ้ำในรูปแบบ PZ-XXXX
 */
export async function generateUniqueMemberCode(db: D1Database): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(4));
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += SAFE_CODE_CHARS[randomBytes[i] % SAFE_CODE_CHARS.length];
    }
    const candidate = `PZ-${suffix}`;
    const existing = await db
      .prepare('SELECT id FROM customers WHERE member_code = ?')
      .bind(candidate)
      .first<{ id: number }>();
    if (!existing) {
      return candidate;
    }
  }
  // Fallback กรณีสุ่มชนกันหลายครั้ง (ใช้ความยาว 6 ตัวอักษร)
  const extraBytes = crypto.getRandomValues(new Uint8Array(6));
  let fallbackSuffix = '';
  for (let i = 0; i < 6; i++) {
    fallbackSuffix += SAFE_CODE_CHARS[extraBytes[i] % SAFE_CODE_CHARS.length];
  }
  return `PZ-${fallbackSuffix}`;
}

/**
 * คำนวณวันหมดอายุแต้ม (SQLite UTC format 'YYYY-MM-DD HH:MM:SS') หากตั้งค่าเดือนหมดอายุ > 0
 */
export function computeExpiresAt(expiryMonths: number): string | null {
  if (!expiryMonths || expiryMonths <= 0) {
    return null;
  }
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + expiryMonths);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * คำนวณจำนวนแต้มที่จะได้รับจากยอดสั่งซื้อ
 */
export function calculateEarnedPoints(totalAmount: number, bahtPerPoint: number): number {
  const rate = Math.max(1, bahtPerPoint || 10);
  if (!totalAmount || totalAmount <= 0) return 0;
  return Math.floor(totalAmount / rate);
}

/**
 * ตรวจสอบรหัสสมาชิกและ PIN พร้อมระบบล็อกชั่วคราวเมื่อกรอก PIN ผิดหลายครั้ง
 * คืนข้อความ Error แบบเดียวกันเพื่อไม่ให้เดาได้ว่ารหัสสมาชิกหรือ PIN ที่ผิด
 */
export async function authenticateCustomerPin(
  db: D1Database,
  memberCodeInput: string,
  pinInput: string
): Promise<
  | { ok: true; customer: CustomerRow }
  | { ok: false; status: 401 | 429; error: string }
> {
  const normalizedCode = memberCodeInput.trim().toUpperCase();
  const genericError = 'รหัสสมาชิกหรือรหัส PIN ไม่ถูกต้องค่ะ';

  const customer = await db
    .prepare('SELECT * FROM customers WHERE member_code = ?')
    .bind(normalizedCode)
    .first<CustomerRow>();

  if (!customer) {
    // หน่วงเวลาด้วยการคำนวณ PBKDF2 หลอก เพื่อป้องกัน Timing Enumeration ของรหัสสมาชิก
    await hashPasswordPBKDF2(pinInput, '00000000000000000000000000000000');
    return { ok: false, status: 401, error: genericError };
  }

  // ตรวจสอบว่าถูกล็อกชั่วคราวหรือไม่
  if (customer.locked_until) {
    const lockTime = new Date(customer.locked_until).getTime();
    if (lockTime > Date.now()) {
      const waitMin = Math.max(1, Math.ceil((lockTime - Date.now()) / 60000));
      return {
        ok: false,
        status: 429,
        error: `รหัสสมาชิกนี้ถูกระงับชั่วคราวเนื่องจากใส่ PIN ผิดหลายครั้ง กรุณารออีกประมาณ ${waitMin} นาทีนะคะ`,
      };
    }
  }

  const valid = await verifyPasswordPBKDF2(pinInput, customer.pin_hash, customer.pin_salt);
  if (!valid) {
    const nextFailed = (customer.failed_attempts || 0) + 1;
    const lockedUntil =
      nextFailed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

    await db
      .prepare('UPDATE customers SET failed_attempts = ?, locked_until = ? WHERE id = ?')
      .bind(nextFailed, lockedUntil, customer.id)
      .run();

    if (lockedUntil) {
      return {
        ok: false,
        status: 429,
        error: 'รหัสสมาชิกนี้ถูกระงับชั่วคราว 15 นาทีเนื่องจากใส่ PIN ผิดเกิน 5 ครั้งค่ะ',
      };
    }

    return { ok: false, status: 401, error: genericError };
  }

  // รีเซ็ตจำนวนครั้งที่ผิดพลาดหากเคยมีประวัติผิด
  if (customer.failed_attempts > 0 || customer.locked_until) {
    await db
      .prepare('UPDATE customers SET failed_attempts = 0, locked_until = NULL WHERE id = ?')
      .bind(customer.id)
      .run();
    customer.failed_attempts = 0;
    customer.locked_until = null;
  }

  return { ok: true, customer };
}

/**
 * ฟังก์ชันตัดแต้มที่หมดอายุอัตโนมัติ (เรียกจาก Cloudflare Workers Cron Trigger วันละครั้ง)
 * บันทึกรายการใน points_ledger ชนิด 'expire'
 */
export async function processExpiredPoints(db: D1Database): Promise<{
  processedCount: number;
  totalPointsExpired: number;
}> {
  const nowSql = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const { results: expiredRows } = await db
    .prepare(
      `SELECT id, customer_id, points, expires_at
       FROM points_ledger
       WHERE type IN ('earn', 'bonus')
         AND expires_at IS NOT NULL
         AND expires_at <= ?
         AND expired_processed = 0
       ORDER BY id ASC
       LIMIT 100`
    )
    .bind(nowSql)
    .all<{
      id: number;
      customer_id: number;
      points: number;
      expires_at: string;
    }>();

  let processedCount = 0;
  let totalPointsExpired = 0;

  for (const row of expiredRows) {
    const customer = await db
      .prepare('SELECT id, points_balance FROM customers WHERE id = ?')
      .bind(row.customer_id)
      .first<{ id: number; points_balance: number }>();

    if (!customer) {
      await db
        .prepare('UPDATE points_ledger SET expired_processed = 1 WHERE id = ?')
        .bind(row.id)
        .run();
      continue;
    }

    const deduct = Math.min(Math.max(0, row.points), Math.max(0, customer.points_balance));
    const statements: D1PreparedStatement[] = [
      db
        .prepare('UPDATE points_ledger SET expired_processed = 1 WHERE id = ? AND expired_processed = 0')
        .bind(row.id),
    ];

    if (deduct > 0) {
      statements.push(
        db
          .prepare(
            `UPDATE customers
             SET points_balance = points_balance - ?
             WHERE id = ? AND points_balance >= ?`
          )
          .bind(deduct, customer.id, deduct),
        db
          .prepare(
            `INSERT INTO points_ledger (customer_id, type, points, note, created_by)
             VALUES (?, 'expire', ?, ?, 'system')`
          )
          .bind(
            customer.id,
            -deduct,
            `แต้มหมดอายุตามรอบ (จากรายการ #${row.id} วันหมดอายุ ${row.expires_at})`
          )
      );
    }

    await db.batch(statements);
    processedCount++;
    totalPointsExpired += deduct;
  }

  return { processedCount, totalPointsExpired };
}
