import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env, AppVariables } from '../types';
import {
  adminLoginSchema,
  adminProductSchema,
  adminFontSchema,
  adminOrderStatusSchema,
  adminPasswordChangeSchema,
  adminReviewVisibilitySchema,
  adminSettingsUpdateSchema,
  adminLineTestSchema,
  adminPointsAdjustSchema,
  adminResetPinSchema,
  adminRewardSchema,
  adminRedemptionStatusSchema,
  adminOrderLinkMemberSchema,
  adminBillCreateSchema,
  adminOrderDriveLinkSchema,
  adminProductVisibilitySchema,
  adminSlipTestSchema,
} from '../schemas';
import {
  hashPasswordPBKDF2,
  verifyPasswordPBKDF2,
  signJwt,
} from '../utils/crypto';
import { checkRateLimit } from '../utils/rateLimit';
import {
  ADMIN_COOKIE_NAME,
  adminAuthMiddleware,
  getJwtSecret,
} from '../middleware/auth';
import { testLinePushNotification } from '../utils/line';
import {
  getLoyaltyRules,
  calculateEarnedPoints,
  computeExpiresAt,
} from '../utils/loyalty';
import {
  verifyOrderSlip,
  testSlipProviderConnection,
} from '../utils/slipVerification';

export const adminRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

/**
 * สร้างบัญชีแอดมินเริ่มต้นอัตโนมัติ (PBKDF2 Hash) เฉพาะเมื่อตั้งค่า ADMIN_INITIAL_PASSWORD ใน Secret/Environment
 * (ไม่มีการฝังรหัสผ่านไว้ในโค้ด — สามารถใช้สคริปต์ scripts/create-admin.mjs เพื่อสร้างแอดมินคนแรกได้)
 */
async function ensureInitialAdmin(env: Env): Promise<void> {
  const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM admins').first<{
    cnt: number;
  }>();
  if (countRow && countRow.cnt > 0) {
    return;
  }

  const initialPassword = env.ADMIN_INITIAL_PASSWORD?.trim();
  if (!initialPassword || initialPassword.length < 6) {
    return;
  }

  const initialUsername = env.ADMIN_INITIAL_USERNAME?.trim() || 'admin';
  const { hashHex, saltHex } = await hashPasswordPBKDF2(initialPassword);

  await env.DB.prepare(
    'INSERT OR IGNORE INTO admins (username, password_hash, salt) VALUES (?, ?, ?)'
  )
    .bind(initialUsername, hashHex, saltHex)
    .run();
}

/**
 * POST /api/admin/login - ล็อกอินแอดมินพร้อมป้องกัน Brute-force และตั้งค่า httpOnly Cookie
 */
adminRoute.post('/login', async (c) => {
  const clientIp = getClientIp(c);
  const rateLimit = await checkRateLimit(c.env.DB, 'admin_login', clientIp, 6, 900); // 6 ครั้งต่อ 15 นาที

  if (!rateLimit.allowed) {
    return c.json(
      {
        error: `พยายามเข้าสู่ระบบผิดพลาดเกินกำหนด กรุณารออีก ${Math.ceil(
          rateLimit.retryAfterSeconds / 60
        )} นาที`,
      },
      429
    );
  }

  await ensureInitialAdmin(c.env);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400);
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'กรุณากรอกข้อมูลให้ครบ' }, 400);
  }

  const { username, password } = parsed.data;
  const admin = await c.env.DB.prepare(
    'SELECT id, username, password_hash, salt, failed_attempts, locked_until FROM admins WHERE username = ?'
  )
    .bind(username)
    .first<{
      id: number;
      username: string;
      password_hash: string;
      salt: string;
      failed_attempts: number;
      locked_until: string | null;
    }>();

  if (!admin) {
    return c.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401);
  }

  // ตรวจสอบการล็อกบัญชีชั่วคราวจาก Brute-force
  if (admin.locked_until) {
    const lockTime = new Date(admin.locked_until).getTime();
    if (lockTime > Date.now()) {
      const waitMin = Math.ceil((lockTime - Date.now()) / 60000);
      return c.json(
        { error: `บัญชีถูกล็อกชั่วคราวเพื่อความปลอดภัย กรุณารออีกประมาณ ${waitMin} นาที` },
        429
      );
    }
  }

  const valid = await verifyPasswordPBKDF2(password, admin.password_hash, admin.salt);
  if (!valid) {
    const nextFailed = (admin.failed_attempts || 0) + 1;
    const lockedUntil =
      nextFailed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

    await c.env.DB.prepare(
      'UPDATE admins SET failed_attempts = ?, locked_until = ? WHERE id = ?'
    )
      .bind(nextFailed, lockedUntil, admin.id)
      .run();

    return c.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401);
  }

  // รีเซ็ตจำนวนครั้งที่ผิดพลาดเมื่อเข้าสู่ระบบสำเร็จ
  await c.env.DB.prepare(
    'UPDATE admins SET failed_attempts = 0, locked_until = NULL WHERE id = ?'
  )
    .bind(admin.id)
    .run();

  const secret = getJwtSecret(c.env);
  if (!secret) {
    return c.json({ error: 'ระบบยืนยันตัวตนไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, 500);
  }

  const token = await signJwt({ sub: admin.id, username: admin.username }, secret);

  const isSecure =
    c.req.url.startsWith('https://') ||
    c.req.header('x-forwarded-proto') === 'https' ||
    c.env.ENVIRONMENT === 'production';
  setCookie(c, ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return c.json({
    message: 'เข้าสู่ระบบสำเร็จ',
    admin: { id: admin.id, username: admin.username },
  });
});

/**
 * POST /api/admin/logout - ออกจากระบบและล้าง httpOnly Cookie
 */
adminRoute.post('/logout', (c) => {
  deleteCookie(c, ADMIN_COOKIE_NAME, { path: '/' });
  return c.json({ message: 'ออกจากระบบเรียบร้อยแล้ว' });
});

// ============================================================================
// เส้นทางด้านล่างทั้งหมดต้องผ่าน Auth Middleware เท่านั้น
// ============================================================================
adminRoute.use('/*', adminAuthMiddleware);

/**
 * GET /api/admin/me - ตรวจสอบสถานะการล็อกอินของแอดมิน
 */
adminRoute.get('/me', (c) => {
  const admin = c.get('admin');
  return c.json({ admin });
});

/**
 * POST /api/admin/change-password - เปลี่ยนรหัสผ่านแอดมิน (PBKDF2)
 */
adminRoute.post('/change-password', async (c) => {
  const adminSession = c.get('admin');
  if (!adminSession) return c.json({ error: 'ไม่ได้รับอนุญาต' }, 401);

  const body = await c.req.json().catch(() => null);
  const parsed = adminPasswordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' }, 400);
  }

  const admin = await c.env.DB.prepare(
    'SELECT id, password_hash, salt FROM admins WHERE id = ?'
  )
    .bind(adminSession.sub)
    .first<{ id: number; password_hash: string; salt: string }>();

  if (!admin) {
    return c.json({ error: 'ไม่พบบัญชีผู้ดูแลระบบ' }, 404);
  }

  const valid = await verifyPasswordPBKDF2(
    parsed.data.current_password,
    admin.password_hash,
    admin.salt
  );
  if (!valid) {
    return c.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, 400);
  }

  const { hashHex, saltHex } = await hashPasswordPBKDF2(parsed.data.new_password);
  await c.env.DB.prepare(
    "UPDATE admins SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(hashHex, saltHex, admin.id)
    .run();

  return c.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้วค่ะ' });
});

/**
 * GET /api/admin/dashboard - ข้อมูลสรุปภาพรวมสำหรับหน้า Dashboard หลังบ้าน
 */
adminRoute.get('/dashboard', async (c) => {
  const db = c.env.DB;
  const [
    productsCount,
    fontsCount,
    ordersStats,
    reviewsStats,
    recentOrders,
    membersCount,
    ledgerStats,
    redemptionStats,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as total FROM products').first<{ total: number }>(),
    db.prepare('SELECT COUNT(*) as total FROM fonts').first<{ total: number }>(),
    db
      .prepare(
        `SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
          COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue
         FROM orders`
      )
      .first<{ total_orders: number; pending_orders: number; total_revenue: number }>(),
    db
      .prepare(
        'SELECT COUNT(*) as total_reviews, COALESCE(ROUND(AVG(rating), 2), 0) as avg_rating FROM reviews'
      )
      .first<{ total_reviews: number; avg_rating: number }>(),
    db
      .prepare(
        `SELECT o.*, c.member_code, c.display_name as member_display_name
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         ORDER BY o.id DESC LIMIT 5`
      )
      .all(),
    db.prepare('SELECT COUNT(*) as total_members FROM customers').first<{ total_members: number }>(),
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN type IN ('earn', 'bonus') OR (type = 'adjust' AND points > 0) THEN points ELSE 0 END), 0) as total_points_issued
         FROM points_ledger`
      )
      .first<{ total_points_issued: number }>(),
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN status != 'cancelled' THEN points_spent ELSE 0 END), 0) as total_points_redeemed,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_redemptions
         FROM redemptions`
      )
      .first<{ total_points_redeemed: number; pending_redemptions: number }>(),
  ]);

  return c.json({
    stats: {
      total_products: productsCount?.total ?? 0,
      total_fonts: fontsCount?.total ?? 0,
      total_orders: ordersStats?.total_orders ?? 0,
      pending_orders: ordersStats?.pending_orders ?? 0,
      total_revenue: ordersStats?.total_revenue ?? 0,
      total_reviews: reviewsStats?.total_reviews ?? 0,
      avg_rating: reviewsStats?.avg_rating ?? 0,
      total_members: membersCount?.total_members ?? 0,
      total_points_issued: ledgerStats?.total_points_issued ?? 0,
      total_points_redeemed: redemptionStats?.total_points_redeemed ?? 0,
      pending_redemptions: redemptionStats?.pending_redemptions ?? 0,
    },
    recentOrders: recentOrders.results,
  });
});

/**
 * GET /api/admin/products - ดึงสินค้าและบริการทั้งหมด (รวมที่ซ่อนอยู่)
 */
adminRoute.get('/products', async (c) => {
  const [productsRes, categoriesRes] = await Promise.all([
    c.env.DB.prepare(
      `SELECT p.*, c.name as category_name, c.type as category_type
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.id DESC`
    ).all(),
    c.env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all(),
  ]);

  return c.json({
    products: productsRes.results,
    categories: categoriesRes.results,
  });
});

function generateSlug(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return `${cleaned || 'item'}-${Date.now().toString(36)}`;
}

/**
 * POST /api/admin/products - เพิ่มสินค้าหรือบริการใหม่
 */
adminRoute.post('/products', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminProductSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ครบถ้วน' }, 400);
  }

  const d = parsed.data;
  const slug = d.slug?.trim() || generateSlug(d.title);

  const res = await c.env.DB.prepare(
    `INSERT INTO products (
      category_id, title, slug, subtitle, description, details,
      price, price_label, image_url, gallery_json, badge, is_featured, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      d.category_id,
      d.title,
      slug,
      d.subtitle,
      d.description,
      d.details,
      d.price,
      d.price_label,
      d.image_url,
      d.gallery_json,
      d.badge,
      d.is_featured,
      d.is_active
    )
    .run();

  return c.json({
    message: 'เพิ่มสินค้า/บริการเรียบร้อยแล้วค่ะ',
    id: res.meta.last_row_id,
  });
});

/**
 * PUT /api/admin/products/:id - แก้ไขสินค้าหรือบริการ
 */
adminRoute.put('/products/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => null);
  const parsed = adminProductSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ครบถ้วน' }, 400);
  }

  const d = parsed.data;
  await c.env.DB.prepare(
    `UPDATE products SET
      category_id = ?, title = ?, subtitle = ?, description = ?, details = ?,
      price = ?, price_label = ?, image_url = ?, gallery_json = ?, badge = ?,
      is_featured = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      d.category_id,
      d.title,
      d.subtitle,
      d.description,
      d.details,
      d.price,
      d.price_label,
      d.image_url,
      d.gallery_json,
      d.badge,
      d.is_featured,
      d.is_active,
      id
    )
    .run();

  return c.json({ message: 'บันทึกการแก้ไขสินค้าเรียบร้อยแล้วค่ะ' });
});

/**
 * DELETE /api/admin/products/:id - ลบสินค้าหรือบริการ
 */
adminRoute.delete('/products/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสสินค้าไม่ถูกต้อง' }, 400);
  }
  await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return c.json({ message: 'ลบรายการสินค้าเรียบร้อยแล้ว' });
});

/**
 * PATCH /api/admin/products/:id/toggle-visibility - สลับการแสดงผลสินค้าบนเว็บ
 * 1 = แสดงบนเว็บ, 0 = ซ่อนไว้ใช้เฉพาะบิลไลน์
 */
adminRoute.patch('/products/:id/toggle-visibility', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const product = await c.env.DB.prepare('SELECT id, is_active FROM products WHERE id = ?')
    .bind(id)
    .first<{ id: number; is_active: number }>();

  if (!product) {
    return c.json({ error: 'ไม่พบสินค้าที่ต้องการสลับสถานะ' }, 404);
  }

  const nextActive =
    body && body.is_active !== undefined
      ? body.is_active ? 1 : 0
      : product.is_active === 1 ? 0 : 1;

  await c.env.DB.prepare(
    "UPDATE products SET is_active = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(nextActive, id)
    .run();

  return c.json({
    message:
      nextActive === 1
        ? 'เปิดแสดงบนเว็บแล้วค่ะ'
        : 'ซ่อนจากเว็บแล้ว (สามารถเลือกในบิลส่งไลน์ได้ตามปกติ)',
    is_active: nextActive,
  });
});

/**
 * POST /api/admin/products/:id/image - อัปโหลดเปลี่ยนรูปปกหรือเพิ่มรูปแกลเลอรีของสินค้าขึ้น R2 (เฉพาะแอดมิน)
 */
adminRoute.post('/products/:id/image', async (c) => {
  const productId = Number(c.req.param('id'));
  if (!productId || Number.isNaN(productId)) {
    return c.json({ error: 'รหัสสินค้าไม่ถูกต้อง' }, 400);
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json({ error: 'ไม่พบข้อมูลไฟล์รูปภาพ' }, 400);
  }

  const file = formData.get('file');
  const mode = (formData.get('mode') as string) || 'cover';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'กรุณาเลือกไฟล์รูปภาพที่ต้องการใส่' }, 400);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedImageExts = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
  if (!allowedImageExts.includes(ext)) {
    return c.json(
      { error: 'รองรับเฉพาะไฟล์รูปภาพ (.png, .jpg, .jpeg, .webp, .svg, .gif)' },
      400
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB' }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id, image_url, gallery_json FROM products WHERE id = ?'
  )
    .bind(productId)
    .first<{ id: number; image_url: string; gallery_json: string }>();

  if (!existing) {
    return c.json({ error: 'ไม่พบรายการสินค้าที่ต้องการเปลี่ยนรูป' }, 404);
  }

  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 40);

  const key = `products/${Date.now()}-${safeBaseName || 'card'}.${ext}`;
  const contentType =
    file.type || (ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`);

  const buffer = await file.arrayBuffer();
  await c.env.BUCKET.put(key, buffer, {
    httpMetadata: { contentType },
  });

  const newUrl = `/r2/${key}`;
  let galleryList: string[] = [];
  try {
    const parsed = JSON.parse(existing.gallery_json || '[]');
    if (Array.isArray(parsed)) galleryList = parsed;
  } catch {
    galleryList = [];
  }

  if (mode === 'gallery') {
    galleryList.push(newUrl);
    await c.env.DB.prepare(
      "UPDATE products SET gallery_json = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(JSON.stringify(galleryList), productId)
      .run();
  } else {
    if (!galleryList.includes(newUrl)) {
      galleryList.unshift(newUrl);
    }
    await c.env.DB.prepare(
      "UPDATE products SET image_url = ?, gallery_json = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(newUrl, JSON.stringify(galleryList), productId)
      .run();
  }

  return c.json({
    message: 'อัปโหลดและเปลี่ยนรูปภาพเรียบร้อยแล้วค่ะ ♡',
    image_url: mode === 'gallery' ? existing.image_url : newUrl,
    added_url: newUrl,
    gallery: galleryList,
  });
});

/**
 * GET /api/admin/fonts - ดึงรายการฟอนต์ทั้งหมด
 */
adminRoute.get('/fonts', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM fonts ORDER BY id DESC'
  ).all();
  return c.json({ fonts: results });
});

/**
 * POST /api/admin/fonts - เพิ่มฟอนต์ใหม่สำหรับหน้าทดลองพิมพ์ฟอนต์
 */
adminRoute.post('/fonts', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminFontSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'ข้อมูลฟอนต์ไม่ครบถ้วน' }, 400);
  }

  const d = parsed.data;
  const res = await c.env.DB.prepare(
    `INSERT INTO fonts (
      product_id, name, family_name, file_url, format, sample_text,
      description, price, discount_type, discount_value, promo_start_at, promo_end_at,
      style_tags, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      d.product_id ?? null,
      d.name,
      d.family_name,
      d.file_url,
      d.format,
      d.sample_text,
      d.description,
      d.price,
      d.discount_type || 'none',
      d.discount_value || 0,
      d.promo_start_at || null,
      d.promo_end_at || null,
      d.style_tags,
      d.is_active
    )
    .run();

  return c.json({
    message: 'เพิ่มฟอนต์ใหม่เรียบร้อยแล้วค่ะ',
    id: res.meta.last_row_id,
  });
});

/**
 * PUT /api/admin/fonts/:id - แก้ไขข้อมูลฟอนต์
 */
adminRoute.put('/fonts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => null);
  const parsed = adminFontSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'ข้อมูลฟอนต์ไม่ครบถ้วน' }, 400);
  }

  const d = parsed.data;
  await c.env.DB.prepare(
    `UPDATE fonts SET
      product_id = ?, name = ?, family_name = ?, file_url = ?, format = ?,
      sample_text = ?, description = ?, price = ?,
      discount_type = ?, discount_value = ?, promo_start_at = ?, promo_end_at = ?,
      style_tags = ?, is_active = ?
     WHERE id = ?`
  )
    .bind(
      d.product_id ?? null,
      d.name,
      d.family_name,
      d.file_url,
      d.format,
      d.sample_text,
      d.description,
      d.price,
      d.discount_type || 'none',
      d.discount_value || 0,
      d.promo_start_at || null,
      d.promo_end_at || null,
      d.style_tags,
      d.is_active,
      id
    )
    .run();

  return c.json({ message: 'อัปเดตข้อมูลฟอนต์เรียบร้อยแล้วค่ะ' });
});

/**
 * DELETE /api/admin/fonts/:id - ลบฟอนต์
 */
adminRoute.delete('/fonts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM fonts WHERE id = ?').bind(id).run();
  return c.json({ message: 'ลบฟอนต์เรียบร้อยแล้ว' });
});

/**
 * GET /api/admin/orders - ดึงรายการคำสั่งซื้อทั้งหมดพร้อมรายการสินค้าย่อย (order_items) และข้อมูลสมาชิกสะสมแต้ม
 */
adminRoute.get('/orders', async (c) => {
  const [{ results: orders }, { results: items }, rules] = await Promise.all([
    c.env.DB.prepare(
      `SELECT o.*, c.member_code, c.display_name as member_display_name, c.points_balance as member_points_balance
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY o.id DESC`
    ).all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT * FROM order_items ORDER BY id ASC').all<Record<string, unknown>>(),
    getLoyaltyRules(c.env.DB),
  ]);

  const itemsByOrder = new Map<number, Record<string, unknown>[]>();
  for (const item of items) {
    const orderId = Number(item.order_id);
    if (!itemsByOrder.has(orderId)) {
      itemsByOrder.set(orderId, []);
    }
    itemsByOrder.get(orderId)!.push(item);
  }

  const enrichedOrders = orders.map((o) => ({
    ...o,
    items: itemsByOrder.get(Number(o.id)) || [],
    estimated_points: calculateEarnedPoints(Number(o.total_amount || 0), rules.baht_per_point),
  }));

  return c.json({
    orders: enrichedOrders,
    loyalty_rules: rules,
  });
});

/**
 * PATCH /api/admin/orders/:id/status - เปลี่ยนสถานะคำสั่งซื้อ
 * - เมื่อเปลี่ยนเป็น 'completed' และมี customer_id จะให้แต้มอัตโนมัติ (Idempotent ให้ได้ครั้งเดียวต่อออเดอร์)
 * - หากเปลี่ยนย้อนกลับหรือยกเลิกหลังจากเคยให้แต้มแล้ว จะตัดแต้มคืนผ่านรายการ points_ledger ชนิด 'adjust'
 */
adminRoute.patch('/orders/:id/status', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => null);
  const parsed = adminOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'สถานะคำสั่งซื้อไม่ถูกต้อง' }, 400);
  }

  const nextStatus = parsed.data.status;
  const db = c.env.DB;

  const order = await db
    .prepare(
      'SELECT id, order_code, total_amount, status, customer_id, points_awarded, points_awarded_at FROM orders WHERE id = ?'
    )
    .bind(id)
    .first<{
      id: number;
      order_code: string;
      total_amount: number;
      status: string;
      customer_id: number | null;
      points_awarded: number;
      points_awarded_at: string | null;
    }>();

  if (!order) {
    return c.json({ error: 'ไม่พบคำสั่งซื้อที่ต้องการเปลี่ยนสถานะ' }, 404);
  }

  const rules = await getLoyaltyRules(db);
  const adminUser = c.get('admin')?.username || 'admin';

  // กรณีที่ 1: เปลี่ยนเป็น 'completed' (เสร็จสิ้น)
  if (nextStatus === 'completed') {
    if (order.customer_id && !order.points_awarded_at && rules.loyalty_enabled) {
      const earnedPoints = calculateEarnedPoints(Number(order.total_amount), rules.baht_per_point);

      if (earnedPoints > 0) {
        const expiresAt = computeExpiresAt(rules.points_expiry_months);
        // ใช้ WHERE points_awarded_at IS NULL เพื่อป้องกันการกดซ้ำพร้อมกัน
        const updateOrderRes = await db
          .prepare(
            `UPDATE orders
             SET status = 'completed',
                 points_awarded = ?,
                 points_awarded_at = datetime('now'),
                 updated_at = datetime('now')
             WHERE id = ? AND points_awarded_at IS NULL`
          )
          .bind(earnedPoints, id)
          .run();

        if ((updateOrderRes.meta.changes || 0) > 0) {
          await db.batch([
            db
              .prepare(
                `UPDATE customers
                 SET points_balance = points_balance + ?,
                     lifetime_points = lifetime_points + ?
                 WHERE id = ?`
              )
              .bind(earnedPoints, earnedPoints, order.customer_id),
            db
              .prepare(
                `INSERT INTO points_ledger (
                  customer_id, type, points, order_id, note, created_by, expires_at
                ) VALUES (?, 'earn', ?, ?, ?, ?, ?)`
              )
              .bind(
                order.customer_id,
                earnedPoints,
                order.id,
                `ได้รับแต้มจากคำสั่งซื้อ ${order.order_code} (ยอด ${Number(
                  order.total_amount
                ).toLocaleString('th-TH')} บาท)`,
                adminUser,
                expiresAt
              ),
          ]);

          return c.json({
            message: `ส่งงานเรียบร้อยและเพิ่มแต้มสะสม +${earnedPoints} แต้มให้สมาชิกแล้วค่ะ ♡`,
            points_awarded: earnedPoints,
            points_awarded_at: new Date().toISOString(),
          });
        }
      }
    }

    await db
      .prepare("UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE id = ?")
      .bind(id)
      .run();

    return c.json({
      message: order.points_awarded_at
        ? `อัปเดตสถานะเป็นเสร็จสิ้นแล้วค่ะ (ออเดอร์นี้เคยได้รับ +${order.points_awarded} แต้มไปแล้ว ไม่มีการบวกซ้ำ)`
        : 'อัปเดตสถานะคำสั่งซื้อเป็นส่งงานเรียบร้อยแล้วค่ะ',
      points_awarded: order.points_awarded || 0,
      points_awarded_at: order.points_awarded_at,
    });
  }

  // กรณีที่ 2: เปลี่ยนสถานะจาก 'completed' ย้อนกลับเป็นสถานะอื่น หรือ 'cancelled' หลังจากเคยให้แต้มไปแล้ว -> ตัดแต้มคืน
  if (order.points_awarded > 0 && order.points_awarded_at && order.customer_id) {
    const customer = await db
      .prepare('SELECT id, points_balance, lifetime_points FROM customers WHERE id = ?')
      .bind(order.customer_id)
      .first<{ id: number; points_balance: number; lifetime_points: number }>();

    if (customer) {
      const deductBalance = Math.min(customer.points_balance, order.points_awarded);
      const deductLifetime = Math.min(customer.lifetime_points, order.points_awarded);

      const statements: D1PreparedStatement[] = [
        db
          .prepare(
            `UPDATE orders
             SET status = ?,
                 points_awarded = 0,
                 points_awarded_at = NULL,
                 updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(nextStatus, id),
      ];

      if (deductBalance > 0) {
        statements.push(
          db
            .prepare(
              `UPDATE customers
               SET points_balance = points_balance - ?,
                   lifetime_points = MAX(0, lifetime_points - ?)
               WHERE id = ?`
            )
            .bind(deductBalance, deductLifetime, customer.id),
          db
            .prepare(
              `INSERT INTO points_ledger (
                customer_id, type, points, order_id, note, created_by
              ) VALUES (?, 'adjust', ?, ?, ?, ?)`
            )
            .bind(
              customer.id,
              -deductBalance,
              order.id,
              `ตัดแต้มคืนเนื่องจากเปลี่ยนสถานะออเดอร์ ${order.order_code} เป็น "${nextStatus}"`,
              adminUser
            )
        );
      }

      await db.batch(statements);

      return c.json({
        message: `เปลี่ยนสถานะคำสั่งซื้อและตัดแต้มคืน (-${deductBalance} แต้ม) เรียบร้อยแล้วค่ะ`,
        points_awarded: 0,
        points_awarded_at: null,
      });
    }
  }

  await db
    .prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(nextStatus, id)
    .run();

  return c.json({
    message: 'อัปเดตสถานะคำสั่งซื้อเรียบร้อยแล้วค่ะ',
    points_awarded: order.points_awarded || 0,
    points_awarded_at: order.points_awarded_at,
  });
});

/**
 * PATCH /api/admin/orders/:id/link-member - ผูกคำสั่งซื้อกับรหัสสมาชิกย้อนหลัง (กรณีลูกค้าลืมกรอกรหัสตอนสั่ง)
 */
adminRoute.patch('/orders/:id/link-member', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => null);
  const parsed = adminOrderLinkMemberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'กรุณากรอกรหัสสมาชิกให้ถูกต้อง' },
      400
    );
  }

  const db = c.env.DB;
  const memberCode = parsed.data.member_code;

  const [order, customer, rules] = await Promise.all([
    db
      .prepare(
        'SELECT id, order_code, total_amount, status, customer_id, points_awarded, points_awarded_at FROM orders WHERE id = ?'
      )
      .bind(id)
      .first<{
        id: number;
        order_code: string;
        total_amount: number;
        status: string;
        customer_id: number | null;
        points_awarded: number;
        points_awarded_at: string | null;
      }>(),
    db
      .prepare('SELECT id, member_code, display_name FROM customers WHERE member_code = ?')
      .bind(memberCode)
      .first<{ id: number; member_code: string; display_name: string }>(),
    getLoyaltyRules(db),
  ]);

  if (!order) {
    return c.json({ error: 'ไม่พบคำสั่งซื้อนี้ในระบบ' }, 404);
  }
  if (!customer) {
    return c.json({ error: `ไม่พบรหัสสมาชิก "${memberCode}" ในระบบค่ะ` }, 404);
  }
  if (order.points_awarded > 0 && order.points_awarded_at && order.customer_id !== customer.id) {
    return c.json(
      { error: 'คำสั่งซื้อนี้เคยให้แต้มกับสมาชิกท่านอื่นไปแล้ว ไม่สามารถเปลี่ยนรหัสสมาชิกได้ค่ะ' },
      400
    );
  }

  const adminUser = c.get('admin')?.username || 'admin';

  // หากออเดอร์นี้อยู่ในสถานะ 'completed' อยู่แล้วและยังไม่เคยได้แต้ม ให้คำนวณและแจกแต้มทันที
  if (order.status === 'completed' && !order.points_awarded_at && rules.loyalty_enabled) {
    const earnedPoints = calculateEarnedPoints(Number(order.total_amount), rules.baht_per_point);
    if (earnedPoints > 0) {
      const expiresAt = computeExpiresAt(rules.points_expiry_months);
      const upd = await db
        .prepare(
          `UPDATE orders
           SET customer_id = ?,
               points_awarded = ?,
               points_awarded_at = datetime('now'),
               updated_at = datetime('now')
           WHERE id = ? AND points_awarded_at IS NULL`
        )
        .bind(customer.id, earnedPoints, order.id)
        .run();

      if ((upd.meta.changes || 0) > 0) {
        await db.batch([
          db
            .prepare(
              `UPDATE customers
               SET points_balance = points_balance + ?,
                   lifetime_points = lifetime_points + ?
               WHERE id = ?`
            )
            .bind(earnedPoints, earnedPoints, customer.id),
          db
            .prepare(
              `INSERT INTO points_ledger (
                customer_id, type, points, order_id, note, created_by, expires_at
              ) VALUES (?, 'earn', ?, ?, ?, ?, ?)`
            )
            .bind(
              customer.id,
              earnedPoints,
              order.id,
              `ได้รับแต้มย้อนหลังจากคำสั่งซื้อ ${order.order_code}`,
              adminUser,
              expiresAt
            ),
        ]);

        return c.json({
          message: `ผูกคำสั่งซื้อกับสมาชิก ${customer.member_code} (${customer.display_name}) และให้แต้ม +${earnedPoints} แต้มเรียบร้อยแล้วค่ะ ♡`,
          customer_id: customer.id,
          member_code: customer.member_code,
          member_display_name: customer.display_name,
          points_awarded: earnedPoints,
          points_awarded_at: new Date().toISOString(),
        });
      }
    }
  }

  await db
    .prepare("UPDATE orders SET customer_id = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(customer.id, order.id)
    .run();

  return c.json({
    message: `ผูกคำสั่งซื้อกับสมาชิก ${customer.member_code} (${customer.display_name}) เรียบร้อยแล้วค่ะ (แต้มจะเข้าเมื่อเปลี่ยนสถานะเป็นส่งงานเรียบร้อย) ♡`,
    customer_id: customer.id,
    member_code: customer.member_code,
    member_display_name: customer.display_name,
    points_awarded: order.points_awarded || 0,
    points_awarded_at: order.points_awarded_at,
  });
});

/**
 * DELETE /api/admin/orders/:id - ลบคำสั่งซื้อ
 */
adminRoute.delete('/orders/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
  return c.json({ message: 'ลบคำสั่งซื้อเรียบร้อยแล้ว' });
});

/**
 * POST /api/admin/bills - สร้างบิลสรุปคำสั่งซื้อสำหรับส่งให้ลูกค้าทาง LINE
 * รองรับการเลือกสินค้าทั้งหมด (รวมสินค้าที่ซ่อนจากเว็บ), ใส่ส่วนลด, ระบุวันรับ/ส่งงาน
 * และบันทึกลงในตาราง orders (channel = 'line_bill') เพื่อนับยอดขายและคำนวณแต้มสะสม
 */
adminRoute.post('/bills', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminBillCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'ข้อมูลบิลไม่ครบถ้วน' }, 400);
  }

  const data = parsed.data;
  const db = c.env.DB;

  const subtotal = data.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const discount = Math.max(0, data.discount_amount || 0);
  const totalAmount = Math.max(0, subtotal - discount);

  // ตรวจสอบสมาชิกสะสมแต้ม (ถ้ามี)
  const rules = await getLoyaltyRules(db);
  let matchedCustomer: { id: number; member_code: string; display_name: string } | null = null;
  if (rules.loyalty_enabled && data.member_code?.trim()) {
    matchedCustomer = await db
      .prepare('SELECT id, member_code, display_name FROM customers WHERE member_code = ?')
      .bind(data.member_code.trim().toUpperCase())
      .first<{ id: number; member_code: string; display_name: string }>();
  }

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  const orderCode = `PKZ-${yy}${mm}${dd}-${rand}`;

  // สรุปข้อความบิลสำหรับส่งไลน์
  let summaryText = data.summary_text?.trim() || '';
  if (!summaryText) {
    const itemLines = data.items
      .map((it, idx) => `${idx + 1}. ${it.product_title} x${it.quantity} (${it.unit_price} ฿)`)
      .join('\n');
    summaryText = `🌸 สรุปบิลสั่งซื้อร้าน pakzy.o 🌸
รหัสบิล: ${orderCode}
--------------------------
📦 รายการ:
${itemLines}
${discount > 0 ? `🎟️ ส่วนลด: -${discount} บาท\n` : ''}💰 รวมทั้งสิ้น: ${totalAmount} บาท
👤 ลูกค้า: ${data.customer_name}
${data.due_date ? `📅 วันรับ/ส่งงาน: ${data.due_date}\n` : ''}--------------------------
แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡
ขอบคุณที่อุดหนุน pakzy.o ค่า ✨`;
  }

  const insertRes = await db.prepare(
    `INSERT INTO orders (
      order_code, customer_name, customer_contact, customer_phone, customer_email,
      custom_brief, total_amount, discount_amount, due_date, status, payment_status,
      channel, summary_text, customer_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'line_bill', ?, ?)`
  )
    .bind(
      orderCode,
      data.customer_name,
      data.customer_contact || 'LINE',
      data.customer_phone || '',
      data.customer_email || '',
      data.custom_brief || '',
      totalAmount,
      discount,
      data.due_date || null,
      summaryText,
      matchedCustomer ? matchedCustomer.id : null
    )
    .run();

  const orderId = Number(insertRes.meta.last_row_id);

  const statements = data.items.map((it) =>
    db.prepare(
      `INSERT INTO order_items (
        order_id, product_id, product_title, category_type, quantity, unit_price, item_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      orderId,
      it.product_id ?? null,
      it.product_title,
      it.category_type || 'service',
      it.quantity,
      it.unit_price,
      it.item_note || ''
    )
  );

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return c.json({
    message: 'สร้างบิลส่ง LINE เรียบร้อยแล้วค่ะ ♡',
    order: {
      id: orderId,
      order_code: orderCode,
      customer_name: data.customer_name,
      total_amount: totalAmount,
      discount_amount: discount,
      due_date: data.due_date || null,
      channel: 'line_bill',
      summary_text: summaryText,
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  }, 201);
});

/**
 * POST /api/admin/bills/send-line - ส่งรูปบิลเข้าแชต LINE ของร้านผ่าน LINE Messaging API
 */
adminRoute.post('/bills/send-line', async (c) => {
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json({ error: 'ไม่พบข้อมูลฟอร์ม' }, 400);
  }

  const file = formData.get('file');
  const orderCode = String(formData.get('order_code') || 'BILL');
  const customerName = String(formData.get('customer_name') || '-');
  const totalAmount = String(formData.get('total_amount') || '0');

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'กรุณาแนบรูปภาพบิล (.png)' }, 400);
  }

  // 1. ตรวจสอบการตั้งค่า LINE Messaging API
  const settingsRows = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings WHERE key IN ('line_channel_access_token', 'line_admin_user_id')"
  ).all<{ key: string; value: string }>();
  const settingsMap = Object.fromEntries(
    (settingsRows.results || []).map((r) => [r.key, r.value])
  );
  const token = (
    settingsMap.line_channel_access_token ||
    c.env.LINE_CHANNEL_ACCESS_TOKEN ||
    ''
  ).trim();
  const toUserId = (
    settingsMap.line_admin_user_id ||
    c.env.LINE_ADMIN_USER_ID ||
    ''
  ).trim();

  if (!token || !toUserId) {
    return c.json(
      {
        ok: false,
        not_configured: true,
        error:
          'ยังไม่ได้ตั้งค่า LINE Messaging API (Channel Access Token หรือ Admin User ID) ในเมนูตั้งค่าหลังบ้านค่ะ',
      },
      400
    );
  }

  // 2. อัปโหลดรูปบิลขึ้น Cloudflare R2
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const cleanCode = orderCode.replace(/[^a-zA-Z0-9_-]/g, '');
  const r2Key = `bills/bill-${cleanCode}-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  await c.env.BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || 'image/png',
    },
  });

  const origin = new URL(c.req.url).origin;
  const imageUrl = `${origin}/r2/${r2Key}`;

  // 3. ส่ง Push Message เข้า LINE ของแอดมินร้าน
  try {
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: toUserId,
        messages: [
          {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
          },
          {
            type: 'text',
            text: `🌸 บิลคำสั่งซื้อร้าน pakzy.o (${orderCode})\n👤 ลูกค้า: ${customerName}\n💰 ยอดชำระ: ฿${totalAmount} บาท\n\nแอดมินสามารถบันทึกรูปบิลด้านบนส่งต่อให้ลูกค้าในแชต LINE ได้เลยนะคะ ♡`,
          },
        ],
      }),
    });

    if (!lineRes.ok) {
      const errText = await lineRes.text();
      return c.json(
        {
          ok: false,
          error: `ส่งเข้า LINE ไม่สำเร็จ (${lineRes.status}): ${errText}`,
          image_url: imageUrl,
        },
        502
      );
    }

    return c.json({
      ok: true,
      message: 'ส่งรูปบิลเข้าแชต LINE แอดมินเรียบร้อยแล้วค่ะ ♡',
      image_url: imageUrl,
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE API',
        image_url: imageUrl,
      },
      500
    );
  }
});

/**
 * PATCH /api/admin/orders/:id/drive-link - บันทึกหรืออัปเดตลิงก์ส่งมอบงานผ่าน Google Drive ให้ลูกค้า
 */
adminRoute.patch('/orders/:id/drive-link', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => null);
  const parsed = adminOrderDriveLinkSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' }, 400);
  }

  const { drive_link, status } = parsed.data;
  const db = c.env.DB;

  const order = await db
    .prepare(
      'SELECT id, order_code, total_amount, status, customer_id, points_awarded, points_awarded_at FROM orders WHERE id = ?'
    )
    .bind(id)
    .first<{
      id: number;
      order_code: string;
      total_amount: number;
      status: string;
      customer_id: number | null;
      points_awarded: number;
      points_awarded_at: string | null;
    }>();

  if (!order) {
    return c.json({ error: 'ไม่พบคำสั่งซื้อ' }, 404);
  }

  const nextStatus = status || (drive_link ? 'completed' : order.status);
  const adminUser = c.get('admin')?.username || 'admin';
  const rules = await getLoyaltyRules(db);

  let earnedPoints = 0;
  if (nextStatus === 'completed' && order.customer_id && !order.points_awarded_at && rules.loyalty_enabled) {
    earnedPoints = calculateEarnedPoints(Number(order.total_amount), rules.baht_per_point);
  }

  if (earnedPoints > 0) {
    const expiresAt = computeExpiresAt(rules.points_expiry_months);
    await db.batch([
      db.prepare(
        `UPDATE orders
         SET drive_link = ?,
             status = 'completed',
             points_awarded = ?,
             points_awarded_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ?`
      ).bind(drive_link || null, earnedPoints, id),
      db.prepare(
        `UPDATE customers
         SET points_balance = points_balance + ?,
             lifetime_points = lifetime_points + ?
         WHERE id = ?`
      ).bind(earnedPoints, earnedPoints, order.customer_id),
      db.prepare(
        `INSERT INTO points_ledger (
          customer_id, type, points, order_id, note, created_by, expires_at
        ) VALUES (?, 'earn', ?, ?, ?, ?, ?)`
      ).bind(
        order.customer_id,
        earnedPoints,
        order.id,
        `ได้รับแต้มจากคำสั่งซื้อ ${order.order_code} (ยอด ${Number(order.total_amount).toLocaleString('th-TH')} บาท)`,
        adminUser,
        expiresAt
      ),
    ]);
  } else {
    await db.prepare(
      `UPDATE orders
       SET drive_link = ?,
           status = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(drive_link || null, nextStatus, id).run();
  }

  return c.json({
    message: 'บันทึกลิงก์ Google Drive เรียบร้อยแล้วค่ะ ♡',
    drive_link,
    status: nextStatus,
    points_awarded: earnedPoints > 0 ? earnedPoints : order.points_awarded,
  });
});

/**
 * POST /api/admin/orders/:id/verify-slip - แอดมินสั่งตรวจสอบสลิปอัตโนมัติด้วยตนเอง
 */
adminRoute.post('/orders/:id/verify-slip', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสคำสั่งซื้อไม่ถูกต้อง' }, 400);
  }

  const db = c.env.DB;
  const order = await db
    .prepare(
      'SELECT id, order_code, total_amount, status, payment_status, slip_url FROM orders WHERE id = ?'
    )
    .bind(id)
    .first<{
      id: number;
      order_code: string;
      total_amount: number;
      status: string;
      payment_status: string;
      slip_url: string | null;
    }>();

  if (!order) {
    return c.json({ error: 'ไม่พบคำสั่งซื้อ' }, 404);
  }

  if (!order.slip_url) {
    return c.json({ error: 'คำสั่งซื้อนี้ยังไม่มีการแนบรูปสลิปค่ะ' }, 400);
  }

  const { results: settingsRows } = await db
    .prepare('SELECT key, value FROM site_settings')
    .all<{ key: string; value: string }>();
  const settings: Record<string, string> = {};
  for (const row of settingsRows) {
    settings[row.key] = row.value;
  }

  const result = await verifyOrderSlip({
    env: c.env,
    orderId: order.id,
    orderCode: order.order_code,
    expectedAmount: Number(order.total_amount),
    slipUrl: order.slip_url,
    settings,
    isManualTrigger: true,
  });

  const updatedOrder = await db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .bind(id)
    .first();

  if (!result.ok) {
    return c.json(
      {
        error: result.error || 'การตรวจสอบสลิปล้มเหลว',
        result,
        order: updatedOrder,
      },
      400
    );
  }

  return c.json({
    message: result.note || 'ตรวจสอบสลิปอัตโนมัติสำเร็จแล้วค่ะ ♡',
    result,
    order: updatedOrder,
  });
});

/**
 * GET /api/admin/reviews - ดึงรีวิวทั้งหมด (รวมที่ถูกซ่อน)
 */
adminRoute.get('/reviews', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM reviews ORDER BY id DESC'
  ).all();
  return c.json({ reviews: results });
});

/**
 * PATCH /api/admin/reviews/:id/visibility - เปิด/ปิดการแสดงผลรีวิวหน้าบ้าน
 */
adminRoute.patch('/reviews/:id/visibility', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสรีวิวไม่ถูกต้อง' }, 400);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = adminReviewVisibilitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'ข้อมูลสถานะการแสดงผลรีวิวไม่ถูกต้อง' }, 400);
  }
  const isVisible = parsed.data.is_visible;

  await c.env.DB.prepare('UPDATE reviews SET is_visible = ? WHERE id = ?')
    .bind(isVisible, id)
    .run();

  return c.json({
    message: isVisible ? 'เปิดแสดงรีวิวบนหน้าเว็บแล้ว' : 'ซ่อนรีวิวจากหน้าเว็บแล้ว',
  });
});

/**
 * DELETE /api/admin/reviews/:id - ลบรีวิว
 */
adminRoute.delete('/reviews/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสรีวิวไม่ถูกต้อง' }, 400);
  }
  await c.env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
  return c.json({ message: 'ลบรีวิวเรียบร้อยแล้ว' });
});

/**
 * PUT /api/admin/settings - บันทึกการตั้งค่าเว็บไซต์ (ชื่อร้าน, โลโก้, ช่องทางติดต่อ, ธีมสี, ผลงาน)
 */
adminRoute.put('/settings', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'ข้อมูลการตั้งค่าไม่ถูกต้อง' }, 400);
  }

  const entries = Object.entries(parsed.data.settings);
  const statements = entries.map(([key, value]) =>
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(key, String(value ?? ''))
  );

  if (statements.length > 0) {
    await c.env.DB.batch(statements);
  }

  return c.json({ message: 'บันทึกการตั้งค่าเว็บไซต์เรียบร้อยแล้วค่ะ ♡' });
});

/**
 * GET /api/admin/line-config - ดึงค่า LINE Messaging API Token และ Admin User ID เฉพาะแอดมินที่ล็อกอินแล้ว
 */
adminRoute.get('/line-config', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings WHERE key IN ('line_channel_access_token', 'line_admin_user_id', 'enable_line_messaging_api')"
  ).all<{ key: string; value: string }>();

  const map: Record<string, string> = {};
  for (const r of results) {
    map[r.key] = r.value;
  }

  return c.json({
    enable_line_messaging_api: map.enable_line_messaging_api || 'false',
    line_channel_access_token: map.line_channel_access_token || '',
    line_admin_user_id: map.line_admin_user_id || '',
    has_env_token: Boolean(c.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
    has_env_user_id: Boolean(c.env.LINE_ADMIN_USER_ID?.trim()),
  });
});

/**
 * POST /api/admin/line-test - บันทึกและทดสอบยิงข้อความ Push Message เข้า LINE แอดมิน
 */
adminRoute.post('/line-test', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminLineTestSchema.safeParse(body || {});
  if (!parsed.success) {
    return c.json({ error: 'รูปแบบข้อมูลตั้งค่า LINE ไม่ถูกต้อง' }, 400);
  }
  const inputToken = parsed.data.line_channel_access_token;
  const inputUserId = parsed.data.line_admin_user_id;

  // บันทึกค่าลง site_settings ด้วยทันทีเพื่อความสะดวกของร้าน
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('line_channel_access_token', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(inputToken),
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('line_admin_user_id', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(inputUserId),
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('enable_line_messaging_api', 'true', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ),
  ];
  await c.env.DB.batch(statements);

  const effectiveToken = inputToken || c.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || '';
  const effectiveUserId = inputUserId || c.env.LINE_ADMIN_USER_ID?.trim() || '';

  const siteNameRow = await c.env.DB.prepare(
    "SELECT value FROM site_settings WHERE key = 'site_name'"
  ).first<{ value: string }>();

  const result = await testLinePushNotification(
    effectiveToken,
    effectiveUserId,
    siteNameRow?.value || 'pakzy.o'
  );

  if (!result.ok) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    message: 'ส่งข้อความทดสอบเข้า LINE แอดมินสำเร็จแล้วค่ะ! (บันทึกค่าและเปิดใช้งานให้อัตโนมัติแล้วค่ะ ♡)',
  });
});

/**
 * GET /api/admin/slip-config - ดึงข้อมูลการตั้งค่าระบบตรวจสอบสลิปอัตโนมัติ
 */
adminRoute.get('/slip-config', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings WHERE key LIKE 'slip_verify_%'"
  ).all<{ key: string; value: string }>();

  const map: Record<string, string> = {};
  for (const r of results) {
    map[r.key] = r.value;
  }

  return c.json({
    slip_verify_enabled: map.slip_verify_enabled || 'false',
    slip_verify_provider: map.slip_verify_provider || 'slipok',
    slip_verify_api_key: map.slip_verify_api_key || '',
    slip_verify_branch_id: map.slip_verify_branch_id || '',
    slip_verify_auto_confirm: map.slip_verify_auto_confirm || 'true',
    slip_verify_check_receiver: map.slip_verify_check_receiver !== 'false',
    has_env_api_key: Boolean(c.env.SLIPOK_API_KEY?.trim()),
    has_env_branch_id: Boolean(c.env.SLIPOK_BRANCH_ID?.trim()),
  });
});

/**
 * POST /api/admin/slip-test - ทดสอบการเชื่อมต่อ API ของ Slip Provider
 */
adminRoute.post('/slip-test', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminSlipTestSchema.safeParse(body || {});
  if (!parsed.success) {
    return c.json({ error: 'รูปแบบข้อมูลตั้งค่าผู้ให้บริการสลิปไม่ถูกต้อง' }, 400);
  }

  const provider = parsed.data.slip_verify_provider;
  const apiKey = parsed.data.slip_verify_api_key || c.env.SLIPOK_API_KEY || '';
  const branchId = parsed.data.slip_verify_branch_id || c.env.SLIPOK_BRANCH_ID || '';

  // บันทึกค่าลง site_settings ด้วยเพื่อความสะดวก
  if (parsed.data.slip_verify_api_key) {
    await c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('slip_verify_api_key', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(parsed.data.slip_verify_api_key).run();
  }
  if (parsed.data.slip_verify_branch_id) {
    await c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('slip_verify_branch_id', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(parsed.data.slip_verify_branch_id).run();
  }

  const res = await testSlipProviderConnection(provider, apiKey, branchId);
  if (!res.ok) {
    return c.json({ error: res.message }, 400);
  }
  return c.json({ message: res.message, quota: res.quota });
});

/**
 * POST /api/admin/upload - อัปโหลดไฟล์รูปภาพหรือไฟล์ฟอนต์ (.ttf, .otf, .woff2) ขึ้น Cloudflare R2
 * จำกัดชนิดและขนาดไฟล์ไม่เกิน 5 MB
 */
adminRoute.post('/upload', async (c) => {
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json({ error: 'ไม่พบข้อมูลไฟล์ที่อัปโหลด' }, 400);
  }

  const file = formData.get('file');
  const folder = (formData.get('folder') as string) || 'uploads';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' }, 400);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedImageExts = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
  const allowedFontExts = ['ttf', 'otf', 'woff2'];

  if (!allowedImageExts.includes(ext) && !allowedFontExts.includes(ext)) {
    return c.json(
      { error: 'รองรับเฉพาะไฟล์รูปภาพ (.png, .jpg, .webp, .svg, .gif) และไฟล์ฟอนต์ (.ttf, .otf, .woff2)' },
      400
    );
  }

  // จำกัดขนาดไฟล์สูงสุด 5 MB เพื่อความรวดเร็วและปลอดภัย
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'ขนาดไฟล์ต้องไม่เกิน 5 MB' }, 400);
  }

  const isFont = allowedFontExts.includes(ext);
  const safeFolder = isFont
    ? folder === 'private'
      ? 'private/fonts'
      : 'fonts/preview'
    : folder.replace(/[^a-z0-9_-]/gi, '') || 'uploads';
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 40);

  const key = `${safeFolder}/${Date.now()}-${safeBaseName || 'file'}.${ext}`;

  let contentType = file.type;
  if (!contentType) {
    if (ext === 'woff2') contentType = 'font/woff2';
    else if (ext === 'ttf') contentType = 'font/ttf';
    else if (ext === 'otf') contentType = 'font/otf';
    else if (ext === 'svg') contentType = 'image/svg+xml';
    else contentType = 'application/octet-stream';
  }

  const buffer = await file.arrayBuffer();
  await c.env.BUCKET.put(key, buffer, {
    httpMetadata: { contentType },
  });

  const format =
    ext === 'woff2' ? 'woff2' : ext === 'otf' ? 'opentype' : ext === 'ttf' ? 'truetype' : ext;

  return c.json({
    message: 'อัปโหลดไฟล์ขึ้น R2 สำเร็จ',
    key,
    url: `/r2/${key}`,
    format,
  });
});

// ============================================================================
// เส้นทางจัดการระบบสะสมแต้มสำหรับแอดมิน (Members, Points Ledger, Rewards, Redemptions)
// ============================================================================

/**
 * GET /api/admin/members - ดึงรายชื่อสมาชิกทั้งหมด รองรับการค้นหาด้วยรหัสสมาชิก ชื่อเล่น หรือช่องทางติดต่อ
 */
adminRoute.get('/members', async (c) => {
  const q = c.req.query('q')?.trim();
  const db = c.env.DB;

  let sql = `
    SELECT
      id, member_code, display_name, contact,
      points_balance, lifetime_points, failed_attempts, locked_until,
      created_at, consent_at
    FROM customers
  `;
  const params: string[] = [];

  if (q) {
    sql += ' WHERE member_code LIKE ? OR display_name LIKE ? OR contact LIKE ?';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  sql += ' ORDER BY id DESC LIMIT 200';

  const [{ results: members }, rules] = await Promise.all([
    db.prepare(sql).bind(...params).all(),
    getLoyaltyRules(db),
  ]);

  return c.json({
    members,
    rules,
  });
});

/**
 * GET /api/admin/members/:id - ดึงรายละเอียดสมาชิกรายคน พร้อมประวัติ points_ledger และรายการแลกของรางวัล
 */
adminRoute.get('/members/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสสมาชิกไม่ถูกต้อง' }, 400);
  }

  const db = c.env.DB;
  const member = await db
    .prepare(
      `SELECT
        id, member_code, display_name, contact,
        points_balance, lifetime_points, failed_attempts, locked_until,
        created_at, consent_at
       FROM customers WHERE id = ?`
    )
    .bind(id)
    .first();

  if (!member) {
    return c.json({ error: 'ไม่พบข้อมูลสมาชิก' }, 404);
  }

  const [ledgerRes, redemptionsRes, ordersRes] = await Promise.all([
    db
      .prepare(
        `SELECT id, type, points, order_id, reward_id, note, created_by, created_at, expires_at
         FROM points_ledger
         WHERE customer_id = ?
         ORDER BY id DESC
         LIMIT 100`
      )
      .bind(id)
      .all(),
    db
      .prepare(
        `SELECT r.*, rw.name as reward_name
         FROM redemptions r
         LEFT JOIN rewards rw ON r.reward_id = rw.id
         WHERE r.customer_id = ?
         ORDER BY r.id DESC
         LIMIT 50`
      )
      .bind(id)
      .all(),
    db
      .prepare(
        `SELECT id, order_code, total_amount, status, points_awarded, points_awarded_at, created_at
         FROM orders
         WHERE customer_id = ?
         ORDER BY id DESC
         LIMIT 50`
      )
      .bind(id)
      .all(),
  ]);

  return c.json({
    member,
    ledger: ledgerRes.results,
    redemptions: redemptionsRes.results,
    orders: ordersRes.results,
  });
});

/**
 * POST /api/admin/points/adjust - ปรับแต้มสมาชิกด้วยมือ (+/-) พร้อมบังคับระบุเหตุผล บันทึกลง ledger ชนิด 'adjust'
 */
adminRoute.post('/points/adjust', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminPointsAdjustSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลการปรับแต้มไม่ครบถ้วนค่ะ' },
      400
    );
  }

  const { customer_id, points, note } = parsed.data;
  const db = c.env.DB;
  const adminUser = c.get('admin')?.username || 'admin';

  const customer = await db
    .prepare('SELECT id, member_code, display_name, points_balance, lifetime_points FROM customers WHERE id = ?')
    .bind(customer_id)
    .first<{
      id: number;
      member_code: string;
      display_name: string;
      points_balance: number;
      lifetime_points: number;
    }>();

  if (!customer) {
    return c.json({ error: 'ไม่พบสมาชิกที่ต้องการปรับแต้ม' }, 404);
  }

  if (points < 0 && customer.points_balance + points < 0) {
    return c.json(
      {
        error: `ไม่สามารถหักแต้มเกินยอดคงเหลือของสมาชิกได้ค่ะ (ปัจจุบันมี ${customer.points_balance} แต้ม)`,
      },
      400
    );
  }

  const lifetimeDelta = points > 0 ? points : 0;

  try {
    await db.batch([
      db
        .prepare(
          `UPDATE customers
           SET points_balance = points_balance + ?,
               lifetime_points = lifetime_points + ?
           WHERE id = ?`
        )
        .bind(points, lifetimeDelta, customer.id),
      db
        .prepare(
          `INSERT INTO points_ledger (customer_id, type, points, note, created_by)
           VALUES (?, 'adjust', ?, ?, ?)`
        )
        .bind(customer.id, points, note, adminUser),
    ]);
  } catch {
    return c.json({ error: 'ไม่สามารถปรับแต้มได้ เนื่องจากยอดคงเหลือห้ามติดลบค่ะ' }, 400);
  }

  const updated = await db
    .prepare('SELECT points_balance, lifetime_points FROM customers WHERE id = ?')
    .bind(customer.id)
    .first<{ points_balance: number; lifetime_points: number }>();

  return c.json({
    message:
      points > 0
        ? `เพิ่มแต้ม +${points} แต้ม ให้สมาชิก ${customer.member_code} เรียบร้อยแล้วค่ะ ♡`
        : `หักแต้ม ${points} แต้ม ของสมาชิก ${customer.member_code} เรียบร้อยแล้วค่ะ`,
    points_balance: updated?.points_balance ?? customer.points_balance + points,
    lifetime_points: updated?.lifetime_points ?? customer.lifetime_points + lifetimeDelta,
  });
});

/**
 * POST /api/admin/members/:id/reset-pin - รีเซ็ต PIN ให้สมาชิก (สร้าง PIN ชั่วคราวหรือตามที่แอดมินกำหนด และปลดล็อกบัญชีทันที)
 */
adminRoute.post('/members/:id/reset-pin', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสสมาชิกไม่ถูกต้อง' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = adminResetPinSchema.safeParse(body || {});
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'รูปแบบรหัส PIN ไม่ถูกต้อง' },
      400
    );
  }

  const db = c.env.DB;
  const customer = await db
    .prepare('SELECT id, member_code, display_name FROM customers WHERE id = ?')
    .bind(id)
    .first<{ id: number; member_code: string; display_name: string }>();

  if (!customer) {
    return c.json({ error: 'ไม่พบข้อมูลสมาชิก' }, 404);
  }

  // สร้างรหัส PIN ชั่วคราว 4 หลักแบบสุ่มปลอดภัย यदिแอดมินไม่ได้กรอกมา
  const randBytes = crypto.getRandomValues(new Uint32Array(1));
  const randomFourDigit = String(1000 + (randBytes[0] % 9000));
  const newPin = parsed.data.new_pin || randomFourDigit;

  const { hashHex, saltHex } = await hashPasswordPBKDF2(newPin);

  await db
    .prepare(
      `UPDATE customers
       SET pin_hash = ?, pin_salt = ?, failed_attempts = 0, locked_until = NULL
       WHERE id = ?`
    )
    .bind(hashHex, saltHex, customer.id)
    .run();

  return c.json({
    message: `รีเซ็ต PIN ให้สมาชิก ${customer.member_code} (${customer.display_name}) สำเร็จแล้วค่ะ`,
    member_code: customer.member_code,
    temporary_pin: newPin,
  });
});

/**
 * DELETE /api/admin/members/:id - ยกเลิก/ลบข้อมูลสมาชิกตามแนวทาง PDPA
 */
adminRoute.delete('/members/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสสมาชิกไม่ถูกต้อง' }, 400);
  }

  const db = c.env.DB;
  await db.batch([
    db.prepare('UPDATE orders SET customer_id = NULL WHERE customer_id = ?').bind(id),
    db.prepare('DELETE FROM points_ledger WHERE customer_id = ?').bind(id),
    db.prepare('DELETE FROM redemptions WHERE customer_id = ?').bind(id),
    db.prepare('DELETE FROM customers WHERE id = ?').bind(id),
  ]);

  return c.json({ message: 'ลบข้อมูลสมาชิกและประวัติแต้มเรียบร้อยแล้วค่ะ' });
});

/**
 * GET /api/admin/rewards - ดึงรายการของรางวัลทั้งหมด (รวมที่ปิดซ่อนไว้)
 */
adminRoute.get('/rewards', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM rewards ORDER BY sort_order ASC, id ASC'
  ).all();
  return c.json({ rewards: results });
});

/**
 * POST /api/admin/rewards - เพิ่มของรางวัลใหม่
 */
adminRoute.post('/rewards', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminRewardSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลของรางวัลไม่ครบถ้วน' },
      400
    );
  }

  const d = parsed.data;
  const res = await c.env.DB.prepare(
    `INSERT INTO rewards (name, description, cost_points, stock, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(d.name, d.description, d.cost_points, d.stock ?? null, d.is_active, d.sort_order)
    .run();

  return c.json(
    {
      message: 'เพิ่มรายการของรางวัลใหม่เรียบร้อยแล้วค่ะ ♡',
      id: res.meta.last_row_id,
    },
    201
  );
});

/**
 * PUT /api/admin/rewards/:id - แก้ไขของรางวัล
 */
adminRoute.put('/rewards/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสของรางวัลไม่ถูกต้อง' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = adminRewardSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลของรางวัลไม่ครบถ้วน' },
      400
    );
  }

  const d = parsed.data;
  await c.env.DB.prepare(
    `UPDATE rewards
     SET name = ?, description = ?, cost_points = ?, stock = ?, is_active = ?, sort_order = ?
     WHERE id = ?`
  )
    .bind(d.name, d.description, d.cost_points, d.stock ?? null, d.is_active, d.sort_order, id)
    .run();

  return c.json({ message: 'บันทึกการแก้ไขของรางวัลเรียบร้อยแล้วค่ะ ♡' });
});

/**
 * DELETE /api/admin/rewards/:id - ลบของรางวัล
 */
adminRoute.delete('/rewards/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสของรางวัลไม่ถูกต้อง' }, 400);
  }

  const usedCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM redemptions WHERE reward_id = ?'
  )
    .bind(id)
    .first<{ cnt: number }>();

  if (usedCount && usedCount.cnt > 0) {
    // หากเคยมีประวัติการแลกของรางวัลนี้แล้ว ให้ลบเฉพาะเมื่อไม่มี FK ติด หรือปลด FK ใน ledger/redemptions
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM redemptions WHERE reward_id = ?').bind(id),
      c.env.DB.prepare('UPDATE points_ledger SET reward_id = NULL WHERE reward_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM rewards WHERE id = ?').bind(id),
    ]);
  } else {
    await c.env.DB.prepare('DELETE FROM rewards WHERE id = ?').bind(id).run();
  }

  return c.json({ message: 'ลบของรางวัลเรียบร้อยแล้วค่ะ' });
});

/**
 * GET /api/admin/redemptions - ดึงรายการแลกของรางวัลทั้งหมดพร้อมข้อมูลสมาชิก
 */
adminRoute.get('/redemptions', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT
      r.*,
      c.member_code,
      c.display_name as member_display_name,
      c.contact as member_contact,
      c.points_balance as member_points_balance,
      rw.name as reward_name
     FROM redemptions r
     LEFT JOIN customers c ON r.customer_id = c.id
     LEFT JOIN rewards rw ON r.reward_id = rw.id
     ORDER BY r.id DESC
     LIMIT 200`
  ).all();

  return c.json({ redemptions: results });
});

/**
 * PATCH /api/admin/redemptions/:id - เปลี่ยนสถานะการแลกของรางวัล (pending -> fulfilled / cancelled)
 * หากเปลี่ยนเป็น 'cancelled' ระบบจะคืนแต้มให้สมาชิกและคืนสต็อกของรางวัลให้อัตโนมัติใน D1 Batch
 */
adminRoute.patch('/redemptions/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!id || Number.isNaN(id)) {
    return c.json({ error: 'รหัสรายการแลกไม่ถูกต้อง' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = adminRedemptionStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'สถานะรายการแลกของรางวัลไม่ถูกต้อง' }, 400);
  }

  const { status: nextStatus, note } = parsed.data;
  const db = c.env.DB;
  const adminUser = c.get('admin')?.username || 'admin';

  const existing = await db
    .prepare(
      `SELECT r.*, rw.name as reward_name
       FROM redemptions r
       LEFT JOIN rewards rw ON r.reward_id = rw.id
       WHERE r.id = ?`
    )
    .bind(id)
    .first<{
      id: number;
      customer_id: number;
      reward_id: number;
      reward_name: string | null;
      points_spent: number;
      status: 'pending' | 'fulfilled' | 'cancelled';
      note: string;
    }>();

  if (!existing) {
    return c.json({ error: 'ไม่พบรายการแลกของรางวัลนี้' }, 404);
  }

  if (existing.status === 'cancelled') {
    return c.json(
      { error: 'รายการแลกของรางวัลนี้ถูกยกเลิกและคืนแต้มไปแล้วค่ะ' },
      400
    );
  }

  if (nextStatus === 'cancelled') {
    // ป้องกันการกดซ้ำด้วย WHERE status != 'cancelled'
    const cancelRes = await db
      .prepare(
        `UPDATE redemptions
         SET status = 'cancelled',
             note = ?
         WHERE id = ? AND status != 'cancelled'`
      )
      .bind(note !== undefined ? note : existing.note, id)
      .run();

    if ((cancelRes.meta.changes || 0) > 0) {
      await db.batch([
        db
          .prepare('UPDATE customers SET points_balance = points_balance + ? WHERE id = ?')
          .bind(existing.points_spent, existing.customer_id),
        db
          .prepare(
            'UPDATE rewards SET stock = CASE WHEN stock IS NULL THEN NULL ELSE stock + 1 END WHERE id = ?'
          )
          .bind(existing.reward_id),
        db
          .prepare(
            `INSERT INTO points_ledger (customer_id, type, points, reward_id, note, created_by)
             VALUES (?, 'adjust', ?, ?, ?, ?)`
          )
          .bind(
            existing.customer_id,
            existing.points_spent,
            existing.reward_id,
            `คืนแต้มจากการยกเลิกรายการแลกของรางวัล #${existing.id} (${
              existing.reward_name || 'ของรางวัล'
            })`,
            adminUser
          ),
      ]);
    }

    return c.json({
      message: `ยกเลิกรายการแลกและคืนแต้ม +${existing.points_spent} แต้ม พร้อมคืนสต็อกเรียบร้อยแล้วค่ะ ♡`,
    });
  }

  const fulfilledAt = nextStatus === 'fulfilled' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null;
  await db
    .prepare(
      `UPDATE redemptions
       SET status = ?,
           fulfilled_at = COALESCE(?, fulfilled_at),
           note = ?
       WHERE id = ?`
    )
    .bind(nextStatus, fulfilledAt, note !== undefined ? note : existing.note, id)
    .run();

  return c.json({
    message:
      nextStatus === 'fulfilled'
        ? 'อัปเดตสถานะเป็นส่งมอบของรางวัลเรียบร้อยแล้วค่ะ ♡'
        : 'อัปเดตสถานะรายการแลกของรางวัลแล้วค่ะ',
  });
});

