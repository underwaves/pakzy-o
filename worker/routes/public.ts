import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import {
  orderCreateSchema,
  reviewCreateSchema,
  pointsRegisterSchema,
  pointsLookupSchema,
  pointsRedeemSchema,
} from '../schemas';
import { checkRateLimit } from '../utils/rateLimit';
import {
  hashIp,
  hashPasswordPBKDF2,
  generateTrackingToken,
  hashTrackingToken,
} from '../utils/crypto';
import { calculateOrderServerSide } from '../utils/pricing';
import {
  buildOrderSummaryText,
  buildRedemptionSummaryText,
  buildLineDeepLink,
  sendLinePushNotificationIfEnabled,
} from '../utils/line';
import {
  getLoyaltyRules,
  generateUniqueMemberCode,
  authenticateCustomerPin,
  calculateEarnedPoints,
  computeExpiresAt,
  processExpiredPoints,
} from '../utils/loyalty';
import { verifyOrderSlip } from '../utils/slipVerification';

export const publicRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

const PRIVATE_SETTING_KEYS = new Set([
  'line_channel_access_token',
  'line_admin_user_id',
  'slip_verify_api_key',
]);

async function getSettingsMap(
  db: D1Database,
  includeSecrets = false
): Promise<Record<string, string>> {
  const { results } = await db
    .prepare('SELECT key, value FROM site_settings')
    .all<{ key: string; value: string }>();

  const map: Record<string, string> = {};
  for (const row of results) {
    if (!includeSecrets && PRIVATE_SETTING_KEYS.has(row.key)) {
      continue;
    }
    map[row.key] = row.value;
  }
  return map;
}

async function getReviewStats(db: D1Database) {
  const stats = await db
    .prepare(
      `SELECT
        COUNT(*) as total_count,
        COALESCE(ROUND(AVG(rating), 2), 0) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as star_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as star_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as star_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as star_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as star_1
       FROM reviews
       WHERE is_visible = 1`
    )
    .first<{
      total_count: number;
      average_rating: number;
      star_5: number;
      star_4: number;
      star_3: number;
      star_2: number;
      star_1: number;
    }>();

  return {
    total_count: stats?.total_count ?? 0,
    average_rating: stats?.average_rating ?? 0,
    distribution: {
      5: stats?.star_5 ?? 0,
      4: stats?.star_4 ?? 0,
      3: stats?.star_3 ?? 0,
      2: stats?.star_2 ?? 0,
      1: stats?.star_1 ?? 0,
    },
  };
}

/**
 * GET /api/bootstrap - ดึงข้อมูลพื้นฐานของเว็บไซต์ในครั้งเดียวสำหรับแสดงผลหน้าแรกอย่างรวดเร็ว
 */
publicRoute.get('/bootstrap', async (c) => {
  const db = c.env.DB;
  const [settings, categoriesRes, productsRes, fontsRes, reviewsRes, reviewStats] =
    await Promise.all([
      getSettingsMap(db),
      db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all(),
      db
        .prepare(
          `SELECT p.*, c.name as category_name, c.slug as category_slug, c.type as category_type
           FROM products p
           JOIN categories c ON p.category_id = c.id
           WHERE p.is_active = 1
           ORDER BY p.is_featured DESC, p.id ASC`
        )
        .all(),
      db
        .prepare('SELECT * FROM fonts WHERE is_active = 1 ORDER BY id ASC')
        .all(),
      db
        .prepare(
          'SELECT id, reviewer_name, service_name, rating, comment, created_at FROM reviews WHERE is_visible = 1 ORDER BY id DESC LIMIT 12'
        )
        .all(),
      getReviewStats(db),
    ]);

  return c.json({
    settings,
    categories: categoriesRes.results,
    products: productsRes.results,
    fonts: fontsRes.results,
    reviews: reviewsRes.results,
    reviewStats,
  });
});

/**
 * GET /api/settings - ดึงการตั้งค่าเว็บไซต์ (ชื่อร้าน, โลโก้, ช่องทางติดต่อ, ธีมสี)
 */
publicRoute.get('/settings', async (c) => {
  const settings = await getSettingsMap(c.env.DB);
  return c.json({ settings });
});

/**
 * GET /api/categories - ดึงหมวดหมู่ทั้งหมด
 */
publicRoute.get('/categories', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM categories ORDER BY sort_order ASC, id ASC'
  ).all();
  return c.json({ categories: results });
});

/**
 * GET /api/products - ดึงรายการสินค้าและบริการ (รองรับการกรองตาม type, category, featured, q)
 */
publicRoute.get('/products', async (c) => {
  const type = c.req.query('type'); // 'service' | 'font'
  const category = c.req.query('category');
  const featured = c.req.query('featured');
  const q = c.req.query('q')?.trim();

  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug, c.type as category_type
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  const params: (string | number)[] = [];

  if (type && (type === 'service' || type === 'font')) {
    sql += ' AND c.type = ?';
    params.push(type);
  }
  if (category && category !== 'all') {
    sql += ' AND (c.slug = ? OR CAST(c.id AS TEXT) = ?)';
    params.push(category, category);
  }
  if (featured === '1' || featured === 'true') {
    sql += ' AND p.is_featured = 1';
  }
  if (q) {
    sql += ' AND (p.title LIKE ? OR p.subtitle LIKE ? OR p.description LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  sql += ' ORDER BY p.is_featured DESC, p.id ASC';

  const { results } = await c.env.DB.prepare(sql)
    .bind(...params)
    .all();

  return c.json({ products: results });
});

/**
 * GET /api/products/:idOrSlug - ดึงรายละเอียดสินค้า/บริการรายชิ้น
 */
publicRoute.get('/products/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const isNumeric = /^\d+$/.test(idOrSlug);

  const product = await c.env.DB.prepare(
    `SELECT p.*, c.name as category_name, c.slug as category_slug, c.type as category_type
     FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE p.is_active = 1 AND ${isNumeric ? 'p.id = ?' : 'p.slug = ?'}`
  )
    .bind(isNumeric ? Number(idOrSlug) : idOrSlug)
    .first<Record<string, unknown>>();

  if (!product) {
    return c.json({ error: 'ไม่พบสินค้าหรือบริการที่คุณต้องการ' }, 404);
  }

  // ตรวจสอบว่ามีฟอนต์ที่ผูกกับสินค้านี้หรือไม่
  const linkedFont = await c.env.DB.prepare(
    'SELECT * FROM fonts WHERE product_id = ? AND is_active = 1 LIMIT 1'
  )
    .bind(product.id)
    .first();

  // ดึงสินค้าใกล้เคียงในหมวดหมู่เดียวกัน
  const { results: relatedProducts } = await c.env.DB.prepare(
    `SELECT p.*, c.name as category_name, c.slug as category_slug, c.type as category_type
     FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE p.is_active = 1 AND p.id != ?
     ORDER BY CASE WHEN p.category_id = ? THEN 0 ELSE 1 END, p.is_featured DESC
     LIMIT 3`
  )
    .bind(product.id, product.category_id)
    .all();

  return c.json({
    product,
    linkedFont: linkedFont ?? null,
    relatedProducts,
  });
});

/**
 * GET /api/fonts - ดึงรายการฟอนต์ทั้งหมดสำหรับหน้าทดลองพิมพ์ฟอนต์
 */
publicRoute.get('/fonts', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM fonts WHERE is_active = 1 ORDER BY id ASC'
  ).all();
  return c.json({ fonts: results });
});

/**
 * GET /api/reviews - ดึงรายการรีวิวที่เปิดแสดงผลพร้อมค่าเฉลี่ยคะแนน
 */
publicRoute.get('/reviews', async (c) => {
  const db = c.env.DB;
  const [{ results }, stats] = await Promise.all([
    db
      .prepare(
        'SELECT id, reviewer_name, service_name, rating, comment, created_at FROM reviews WHERE is_visible = 1 ORDER BY id DESC LIMIT 50'
      )
      .all(),
    getReviewStats(db),
  ]);

  return c.json({
    reviews: results,
    stats,
  });
});

/**
 * POST /api/reviews - บันทึกรีวิวใหม่จากลูกค้า (Validate ด้วย Zod + Rate Limit กัน Spam)
 */
publicRoute.post('/reviews', async (c) => {
  const clientIp = getClientIp(c);
  const rateLimit = await checkRateLimit(c.env.DB, 'review', clientIp, 3, 600); // สูงสุด 3 ครั้งใน 10 นาที

  if (!rateLimit.allowed) {
    return c.json(
      {
        error: `คุณส่งรีวิวบ่อยเกินไป กรุณารออีกประมาณ ${Math.ceil(
          rateLimit.retryAfterSeconds / 60
        )} นาทีแล้วลองใหม่อีกครั้งนะคะ`,
      },
      429
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400);
  }

  const parsed = reviewCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return c.json({ error: firstIssue?.message || 'ข้อมูลรีวิวไม่ครบถ้วน' }, 400);
  }

  const { reviewer_name, service_name, rating, comment, member_code, order_code } = parsed.data;
  const ipHash = await hashIp(clientIp);

  const insertRes = await c.env.DB.prepare(
    `INSERT INTO reviews (reviewer_name, service_name, rating, comment, is_visible, ip_hash)
     VALUES (?, ?, ?, ?, 1, ?)`
  )
    .bind(reviewer_name, service_name, rating, comment, ipHash)
    .run();

  // ตรวจสอบโบนัสแต้มเมื่อรีวิว (1 ครั้งต่อคำสั่งซื้อ หากเปิดใช้งานในตั้งค่า)
  let bonusAwarded = 0;
  try {
    const rules = await getLoyaltyRules(c.env.DB);
    if (rules.loyalty_enabled && rules.review_bonus_points > 0 && order_code?.trim()) {
      const cleanOrderCode = order_code.trim().toUpperCase();
      const orderRow = await c.env.DB.prepare(
        'SELECT id, customer_id, status FROM orders WHERE UPPER(order_code) = ?'
      )
        .bind(cleanOrderCode)
        .first<{ id: number; customer_id: number | null; status: string }>();

      let targetCustomerId = orderRow?.customer_id ?? null;
      if (!targetCustomerId && member_code?.trim()) {
        const cust = await c.env.DB.prepare(
          'SELECT id FROM customers WHERE member_code = ?'
        )
          .bind(member_code.trim().toUpperCase())
          .first<{ id: number }>();
        targetCustomerId = cust?.id ?? null;
      }

      if (orderRow && orderRow.status === 'completed' && targetCustomerId) {
        const existingBonus = await c.env.DB.prepare(
          "SELECT id FROM points_ledger WHERE order_id = ? AND type = 'bonus'"
        )
          .bind(orderRow.id)
          .first<{ id: number }>();

        if (!existingBonus) {
          const expiresAt = computeExpiresAt(rules.points_expiry_months);
          await c.env.DB.batch([
            c.env.DB.prepare(
              `INSERT INTO points_ledger (customer_id, type, points, order_id, note, created_by, expires_at)
               VALUES (?, 'bonus', ?, ?, ?, 'system', ?)`
            ).bind(
              targetCustomerId,
              rules.review_bonus_points,
              orderRow.id,
              `โบนัสรีวิวความประทับใจสำหรับออเดอร์ ${cleanOrderCode}`,
              expiresAt
            ),
            c.env.DB.prepare(
              `UPDATE customers
               SET points_balance = points_balance + ?,
                   lifetime_points = lifetime_points + ?
               WHERE id = ?`
            ).bind(rules.review_bonus_points, rules.review_bonus_points, targetCustomerId),
          ]);
          bonusAwarded = rules.review_bonus_points;
        }
      }
    }
  } catch {
    // ไม่กระทบการบันทึกรีวิวหลักหากโบนัสซ้ำหรือเกิดข้อผิดพลาด
  }

  const newReview = await c.env.DB.prepare(
    'SELECT id, reviewer_name, service_name, rating, comment, created_at FROM reviews WHERE id = ?'
  )
    .bind(insertRes.meta.last_row_id)
    .first();

  const stats = await getReviewStats(c.env.DB);

  return c.json(
    {
      message:
        bonusAwarded > 0
          ? `ขอบคุณสำหรับรีวิวน่ารัก ๆ นะคะ ได้รับโบนัสพิเศษ +${bonusAwarded} แต้มค่ะ ♡`
          : 'ขอบคุณสำหรับรีวิวน่ารัก ๆ นะคะ ♡',
      review: newReview,
      stats,
      bonus_points_awarded: bonusAwarded,
    },
    201
  );
});

/**
 * POST /api/orders - บันทึกคำสั่งซื้อลง D1 ก่อน แล้วสร้างข้อความสรุปและ Deep Link ส่งเข้า LINE ร้าน (@280npxvj)
 */
publicRoute.post('/orders', async (c) => {
  const clientIp = getClientIp(c);
  const rateLimit = await checkRateLimit(c.env.DB, 'order', clientIp, 10, 600); // สูงสุด 10 ออเดอร์ต่อ 10 นาที

  if (!rateLimit.allowed) {
    return c.json(
      { error: 'มีการส่งคำสั่งซื้อถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้งนะคะ' },
      429
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'รูปแบบข้อมูลคำสั่งซื้อไม่ถูกต้อง' }, 400);
  }

  const parsed = orderCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return c.json({ error: firstIssue?.message || 'กรุณากรอกข้อมูลคำสั่งซื้อให้ครบถ้วน' }, 400);
  }

  const data = parsed.data;

  // คำนวณราคาและตรวจสอบความถูกต้องของสินค้าจากฐานข้อมูล D1 ฝั่ง Server 100%
  // ห้ามเชื่อ unit_price, product_title, ส่วนลด หรือยอดรวมที่ส่งมาจาก Browser เด็ดขาด
  let calcResult;
  try {
    calcResult = await calculateOrderServerSide(c.env.DB, data.items);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'ไม่สามารถคำนวณราคาคำสั่งซื้อได้ค่ะ' },
      400
    );
  }

  const serverTotalAmount = calcResult.totalAmount;
  const serverDiscountAmount = calcResult.totalDiscount;
  const validatedItems = calcResult.items;

  // ตรวจสอบรหัสสมาชิกสะสมแต้ม (กรณีลูกค้ากรอกมาและระบบแต้มเปิดอยู่)
  const rules = await getLoyaltyRules(c.env.DB);
  let matchedCustomer: { id: number; member_code: string; display_name: string } | null = null;
  let estimatedPoints = 0;

  if (rules.loyalty_enabled && data.member_code && data.member_code.trim()) {
    const cleanMemberCode = data.member_code.trim().toUpperCase();
    matchedCustomer = await c.env.DB.prepare(
      'SELECT id, member_code, display_name FROM customers WHERE member_code = ?'
    )
      .bind(cleanMemberCode)
      .first<{ id: number; member_code: string; display_name: string }>();

    if (!matchedCustomer) {
      return c.json(
        {
          error: `ไม่พบรหัสสมาชิก "${cleanMemberCode}" ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง หรือเว้นว่างเพื่อสั่งซื้อตามปกติค่ะ`,
        },
        400
      );
    }

    estimatedPoints = calculateEarnedPoints(serverTotalAmount, rules.baht_per_point);
  }

  // สร้างรหัสคำสั่งซื้อ เช่น PKZ-261115-4821
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  const orderCode = `PKZ-${yy}${mm}${dd}-${rand}`;

  // สุ่มสร้าง Tracking Token สำหรับติดตามออเดอร์ด้วย Cryptographically Secure RNG (CSPRNG)
  const trackingToken = generateTrackingToken();
  const trackingTokenHash = await hashTrackingToken(trackingToken);

  const summaryText = buildOrderSummaryText({
    order_code: orderCode,
    customer_name: data.customer_name,
    customer_contact: data.customer_contact,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email,
    custom_brief: data.custom_brief,
    member_code: matchedCustomer?.member_code,
    total_amount: serverTotalAmount,
    items: validatedItems.map((i) => ({
      product_title: i.product_title,
      category_type: i.category_type,
      quantity: i.quantity,
      unit_price: i.unit_price,
      item_note: i.item_note,
    })),
  });

  // 1. บันทึกคำสั่งซื้อหลักลงตาราง orders ใน D1 พร้อม tracking_token_hash
  const paymentStatus = data.slip_url ? 'paid' : (data.payment_status || 'pending');
  const orderInsert = await c.env.DB.prepare(
    `INSERT INTO orders (
      order_code, customer_name, customer_contact, customer_phone, customer_email,
      custom_brief, total_amount, discount_amount, status, summary_text, customer_id,
      slip_url, payment_status, channel, tracking_token_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 'web', ?)`
  )
    .bind(
      orderCode,
      data.customer_name,
      data.customer_contact,
      data.customer_phone || '',
      data.customer_email || '',
      data.custom_brief || '',
      serverTotalAmount,
      serverDiscountAmount,
      summaryText,
      matchedCustomer ? matchedCustomer.id : null,
      data.slip_url || null,
      paymentStatus,
      trackingTokenHash
    )
    .run();

  const orderId = Number(orderInsert.meta.last_row_id);

  // 2. บันทึกรายการสินค้าย่อยลงตาราง order_items โดยใช้ราคาและชื่อสินค้าจริงจากเซิร์ฟเวอร์
  const statements = validatedItems.map((item) =>
    c.env.DB.prepare(
      `INSERT INTO order_items (
        order_id, product_id, product_title, category_type, quantity, unit_price, item_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      orderId,
      item.product_id,
      item.product_title,
      item.category_type,
      item.quantity,
      item.unit_price,
      item.item_note || ''
    )
  );

  if (statements.length > 0) {
    await c.env.DB.batch(statements);
  }

  // 3. ดึงค่าการตั้งค่าร้านและตรวจสอบระบบตรวจสลิป / LINE API
  const settings = await getSettingsMap(c.env.DB, true);
  const lineId = settings.contact_line || '@280npxvj';
  const enableLinePush = settings.enable_line_messaging_api === 'true';

  // 3.1 ดำเนินการตรวจสอบสลิปการโอนเงินอัตโนมัติ (หากมีการแนบรูปสลิป) โดยใช้ยอดเงินจริงที่เซิร์ฟเวอร์คำนวณ
  let slipVerifyResult: any = null;
  let finalPaymentStatus: 'pending' | 'paid' | 'verified' = paymentStatus;
  let finalOrderStatus = 'pending';

  if (data.slip_url) {
    slipVerifyResult = await verifyOrderSlip({
      env: c.env,
      orderId,
      orderCode,
      expectedAmount: serverTotalAmount,
      slipUrl: data.slip_url,
      settings,
      isManualTrigger: false,
    });

    if (slipVerifyResult.ok) {
      finalPaymentStatus = 'verified';
      if (settings.slip_verify_auto_confirm !== 'false') {
        finalOrderStatus = 'confirmed';
      }
    }
  }

  let notificationText = summaryText;
  if (slipVerifyResult?.ok) {
    notificationText += `\n\n✅ ตรวจสลิปอัตโนมัติ: ผ่านเรียบร้อยแล้ว (ยอด ${slipVerifyResult.amount} บ. รหัส: ${slipVerifyResult.transRef || '-'})`;
  } else if (slipVerifyResult && !slipVerifyResult.ok && slipVerifyResult.error) {
    notificationText += `\n\n⚠️ ตรวจสลิปอัตโนมัติ: ${slipVerifyResult.error}`;
  }

  const lineDeepLink = buildLineDeepLink(lineId, notificationText);

  // 4. ส่ง Push Message ผ่าน LINE Messaging API อัตโนมัติ (หรือ Fallback เป็นอีเมลแจ้งเตือนของร้าน)
  const fallbackEmail = settings.notification_email || settings.contact_email || '';
  const notifyResult = await sendLinePushNotificationIfEnabled(
    c.env,
    enableLinePush,
    notificationText,
    settings.line_channel_access_token,
    settings.line_admin_user_id,
    fallbackEmail
  );

  if (notifyResult.lineNotified) {
    await c.env.DB.prepare('UPDATE orders SET line_notified = 1 WHERE id = ?')
      .bind(orderId)
      .run();
  }

  return c.json(
    {
      message: 'บันทึกคำสั่งซื้อเรียบร้อยแล้วค่ะ ♡',
      order: {
        id: orderId,
        order_code: orderCode,
        tracking_token: trackingToken, // คืน token สำหรับติดตามให้ลูกค้าเฉพาะตอนสร้างออเดอร์
        total_amount: serverTotalAmount,
        discount_amount: serverDiscountAmount,
        summary_text: summaryText,
        line_id: lineId,
        line_deep_link: lineDeepLink,
        line_notified: notifyResult.lineNotified,
        email_fallback: notifyResult.emailFallback,
        member_code: matchedCustomer?.member_code || null,
        estimated_points: matchedCustomer ? estimatedPoints : 0,
        slip_url: data.slip_url || null,
        slip_verified: slipVerifyResult?.ok ? 1 : (slipVerifyResult ? -1 : 0),
        slip_trans_ref: slipVerifyResult?.transRef || null,
        slip_verify_note: slipVerifyResult?.note || slipVerifyResult?.error || '',
        payment_status: finalPaymentStatus,
        status: finalOrderStatus,
        drive_link: null,
      },
    },
    201
  );
});

/**
 * POST /api/upload-slip - อัปโหลดรูปสลิปการโอนเงินจากหน้าชำระเงินของลูกค้า
 * จำกัดขนาดไม่เกิน 5 MB และอนุญาตเฉพาะรูปภาพ (.jpg, .jpeg, .png, .webp)
 */
publicRoute.post('/upload-slip', async (c) => {
  const clientIp = getClientIp(c);
  const rateLimit = await checkRateLimit(c.env.DB, 'upload_slip', clientIp, 15, 600);
  if (!rateLimit.allowed) {
    return c.json(
      { error: 'อัปโหลดสลิปถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้งนะคะ' },
      429
    );
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json({ error: 'ไม่พบไฟล์สลิปที่อัปโหลด' }, 400);
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'กรุณาเลือกไฟล์รูปภาพสลิปที่ถูกต้องค่ะ' }, 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'ขนาดรูปสลิปต้องไม่เกิน 5 MB ค่ะ' }, 400);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return c.json(
      { error: 'อนุญาตเฉพาะไฟล์รูปภาพสลิป (.jpg, .jpeg, .png, .webp) เท่านั้นค่ะ' },
      400
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `slips/slip-${Date.now()}-${rand}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  await c.env.BUCKET.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  });

  return c.json({
    message: 'อัปโหลดสลิปเรียบร้อยแล้วค่ะ ♡',
    url: `/r2/${key}`,
    key,
  });
});

/**
 * GET /api/orders/track/:order_code - ติดตามสถานะคำสั่งซื้อแบบปลอดภัย รักษาความเป็นส่วนตัว
 * - ต้องระบุ tracking token ผ่าน query parameter (?token=...) หรือ header (x-tracking-token)
 * - รหัสคำสั่งซื้อเพียงอย่างเดียวไม่สามารถเข้าถึงข้อมูลได้ เพื่อป้องกันการไล่เดารหัส (Order Code Enumeration)
 * - มี Rate Limit ป้องกัน Brute-force
 * - ส่งกลับเฉพาะข้อมูลสถานะที่จำเป็น ไม่ส่งอีเมล เบอร์โทร หรือบรีฟงาน
 * - แสดงลิงก์ Google Drive เฉพาะเมื่อยืนยัน token ถูกต้อง
 */
publicRoute.get('/orders/track/:order_code', async (c) => {
  const clientIp = getClientIp(c);
  // Rate limit: สูงสุด 15 ครั้งต่อ 5 นาทีต่อ IP ป้องกันการเดารหัสคำสั่งซื้อ
  const rateLimit = await checkRateLimit(c.env.DB, 'track_order', clientIp, 15, 300);
  if (!rateLimit.allowed) {
    return c.json(
      { error: 'มีการค้นหาคำสั่งซื้อถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้งนะคะ' },
      429
    );
  }

  const orderCode = c.req.param('order_code')?.trim().toUpperCase();
  const token = c.req.query('token')?.trim() || c.req.header('x-tracking-token')?.trim();

  // ข้อความปฏิเสธแบบ Uniform 404 เพื่อไม่ให้ยืนยันว่ามีรหัสคำสั่งซื้อนี้อยู่ในระบบจริงหรือไม่
  const UNIFORM_NOT_FOUND = 'ไม่พบข้อมูลคำสั่งซื้อ หรือข้อมูลการเข้าถึงไม่ถูกต้องค่ะ';

  if (!orderCode || !token) {
    return c.json({ error: UNIFORM_NOT_FOUND }, 404);
  }

  // คำนวณ SHA-256 hash ของ token ที่ส่งมาเพื่อเปรียบเทียบกับ hash ในฐานข้อมูล
  const tokenHash = await hashTrackingToken(token);

  const order = await c.env.DB.prepare(
    `SELECT id, order_code, customer_name, total_amount, discount_amount,
            status, payment_status, drive_link, due_date,
            slip_verified, channel, created_at, tracking_token_hash
     FROM orders
     WHERE UPPER(order_code) = ?`
  )
    .bind(orderCode)
    .first<{
      id: number;
      order_code: string;
      customer_name: string;
      total_amount: number;
      discount_amount: number;
      status: string;
      payment_status: string;
      drive_link: string | null;
      due_date: string | null;
      slip_verified: number;
      channel: string;
      created_at: string;
      tracking_token_hash: string | null;
    }>();

  // ปฏิเสธหาก:
  // 1. ไม่พบออเดอร์
  // 2. เป็นออเดอร์เก่าที่ไม่มี tracking_token_hash (NULL)
  // 3. token_hash ไม่ตรงกับที่บันทึกไว้
  if (!order || !order.tracking_token_hash || order.tracking_token_hash !== tokenHash) {
    return c.json({ error: UNIFORM_NOT_FOUND }, 404);
  }

  const { results: rawItems } = await c.env.DB.prepare(
    'SELECT product_title, category_type, quantity, unit_price FROM order_items WHERE order_id = ? ORDER BY id ASC'
  )
    .bind(order.id)
    .all<{
      product_title: string;
      category_type: string;
      quantity: number;
      unit_price: number;
    }>();

  // ส่งคืนเฉพาะข้อมูลที่ปลอดภัยและจำเป็นสำหรับการติดตามสถานะเท่านั้น
  // ห้ามส่ง: customer_email, customer_phone, customer_contact, custom_brief, slip_url, slip_trans_ref, slip_verify_note, summary_text
  return c.json({
    order: {
      order_code: order.order_code,
      customer_name: order.customer_name,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      discount_amount: order.discount_amount,
      due_date: order.due_date,
      drive_link: order.drive_link || null, // แสดงลิงก์ส่งมอบงานเฉพาะเมื่อผ่านการยืนยัน tracking token
      slip_verified: order.slip_verified,
      created_at: order.created_at,
    },
    items: rawItems || [],
  });
});

// ============================================================================
// เส้นทาง API สำหรับระบบสะสมแต้ม (Loyalty Points System)
// ============================================================================

/**
 * GET /api/points/rules - ดึงกติกาการสะสมแต้มและสถานะเปิด/ปิดระบบ
 */
publicRoute.get('/points/rules', async (c) => {
  const rules = await getLoyaltyRules(c.env.DB);
  return c.json({ rules });
});

/**
 * GET /api/rewards - ดึงรายการของรางวัลที่เปิดให้แลกและกติกาแต้ม
 */
publicRoute.get('/rewards', async (c) => {
  const db = c.env.DB;
  const [rules, rewardsRes] = await Promise.all([
    getLoyaltyRules(db),
    db
      .prepare('SELECT * FROM rewards WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
      .all(),
  ]);

  if (!rules.loyalty_enabled) {
    return c.json({
      rules,
      rewards: [],
    });
  }

  return c.json({
    rules,
    rewards: rewardsRes.results,
  });
});

/**
 * POST /api/points/register - สมัครรับรหัสสมาชิกสะสมแต้มใหม่ (ไม่ต้องล็อกอิน)
 */
publicRoute.post('/points/register', async (c) => {
  const db = c.env.DB;
  const rules = await getLoyaltyRules(db);
  if (!rules.loyalty_enabled) {
    return c.json({ error: 'ระบบสะสมแต้มปิดให้บริการชั่วคราวค่ะ' }, 403);
  }

  const clientIp = getClientIp(c);
  const rateLimit = await checkRateLimit(db, 'points_register', clientIp, 6, 600); // 6 ครั้งต่อ 10 นาทีต่อ IP
  if (!rateLimit.allowed) {
    return c.json(
      {
        error: `มีการสมัครสมาชิกถี่เกินไป กรุณารออีกประมาณ ${Math.ceil(
          rateLimit.retryAfterSeconds / 60
        )} นาทีแล้วลองใหม่นะคะ`,
      },
      429
    );
  }

  const body = await c.req.json().catch(() => null);
  const parsed = pointsRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบถ้วนค่ะ' },
      400
    );
  }

  const { display_name, contact, pin } = parsed.data;
  const memberCode = await generateUniqueMemberCode(db);
  const { hashHex, saltHex } = await hashPasswordPBKDF2(pin);

  const insertRes = await db
    .prepare(
      `INSERT INTO customers (
        member_code, display_name, contact, pin_hash, pin_salt,
        points_balance, lifetime_points, created_at, consent_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))`
    )
    .bind(memberCode, display_name, contact, hashHex, saltHex)
    .run();

  const created = await db
    .prepare(
      `SELECT id, member_code, display_name, contact, points_balance, lifetime_points, created_at, consent_at
       FROM customers WHERE id = ?`
    )
    .bind(insertRes.meta.last_row_id)
    .first();

  return c.json(
    {
      message: `สมัครสมาชิกสำเร็จแล้วค่ะ! รหัสสมาชิกของคุณคือ ${memberCode} ♡`,
      member: created,
    },
    201
  );
});

/**
 * POST /api/points/lookup - ตรวจสอบแต้มคงเหลือ ประวัติได้/ใช้แต้ม และแต้มใกล้หมดอายุ ด้วยรหัสสมาชิก + PIN
 */
publicRoute.post('/points/lookup', async (c) => {
  const db = c.env.DB;
  const rules = await getLoyaltyRules(db);
  if (!rules.loyalty_enabled) {
    return c.json({ error: 'ระบบสะสมแต้มปิดให้บริการชั่วคราวค่ะ' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = pointsLookupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'กรุณากรอกรหัสสมาชิกและ PIN ให้ถูกต้องค่ะ' },
      400
    );
  }

  const { member_code, pin } = parsed.data;
  const clientIp = getClientIp(c);

  // Rate limit ทั้งระดับ IP และระดับรหัสสมาชิก
  const [ipLimit, codeLimit] = await Promise.all([
    checkRateLimit(db, 'points_lookup_ip', clientIp, 15, 300),
    checkRateLimit(db, `points_lookup_code:${member_code}`, clientIp, 8, 300),
  ]);

  if (!ipLimit.allowed || !codeLimit.allowed) {
    const retrySec = Math.max(ipLimit.retryAfterSeconds, codeLimit.retryAfterSeconds);
    return c.json(
      {
        error: `คุณทำรายการตรวจสอบถี่เกินไป กรุณารออีกประมาณ ${Math.max(
          1,
          Math.ceil(retrySec / 60)
        )} นาทีแล้วลองใหม่นะคะ`,
      },
      429
    );
  }

  // ประมวลผลแต้มที่หมดอายุก่อนแสดงผล (กรณีตั้งวันหมดอายุไว้)
  if (rules.points_expiry_months > 0) {
    await processExpiredPoints(db).catch(() => {});
  }

  const auth = await authenticateCustomerPin(db, member_code, pin);
  if (!auth.ok) {
    return c.json({ error: auth.error }, auth.status);
  }

  const customer = auth.customer;
  const [ledgerRes, redemptionsRes, expiringRes] = await Promise.all([
    db
      .prepare(
        `SELECT id, type, points, order_id, reward_id, note, created_by, created_at, expires_at
         FROM points_ledger
         WHERE customer_id = ?
         ORDER BY id DESC
         LIMIT 50`
      )
      .bind(customer.id)
      .all(),
    db
      .prepare(
        `SELECT r.id, r.reward_id, rw.name as reward_name, r.points_spent, r.status, r.created_at, r.fulfilled_at, r.note
         FROM redemptions r
         LEFT JOIN rewards rw ON r.reward_id = rw.id
         WHERE r.customer_id = ?
         ORDER BY r.id DESC
         LIMIT 20`
      )
      .bind(customer.id)
      .all(),
    db
      .prepare(
        `SELECT id, points, expires_at, created_at
         FROM points_ledger
         WHERE customer_id = ?
           AND type IN ('earn', 'bonus')
           AND expires_at IS NOT NULL
           AND expired_processed = 0
           AND expires_at > datetime('now')
         ORDER BY expires_at ASC
         LIMIT 5`
      )
      .bind(customer.id)
      .all(),
  ]);

  return c.json({
    member: {
      id: customer.id,
      member_code: customer.member_code,
      display_name: customer.display_name,
      contact: customer.contact,
      points_balance: customer.points_balance,
      lifetime_points: customer.lifetime_points,
      created_at: customer.created_at,
    },
    ledger: ledgerRes.results,
    redemptions: redemptionsRes.results,
    expiring_soon: expiringRes.results,
    rules,
  });
});

/**
 * POST /api/points/redeem - แลกของรางวัลด้วยแต้มสะสม (Atomic D1 Batch Transaction ป้องกันแลกซ้อน/แต้มติดลบ/สต็อกติดลบ)
 */
publicRoute.post('/points/redeem', async (c) => {
  const db = c.env.DB;
  const rules = await getLoyaltyRules(db);
  if (!rules.loyalty_enabled) {
    return c.json({ error: 'ระบบสะสมแต้มปิดให้บริการชั่วคราวค่ะ' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = pointsRedeemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลการแลกของรางวัลไม่ครบถ้วนค่ะ' },
      400
    );
  }

  const { member_code, pin, reward_id, note } = parsed.data;
  const clientIp = getClientIp(c);

  const [ipLimit, codeLimit] = await Promise.all([
    checkRateLimit(db, 'points_redeem_ip', clientIp, 10, 300),
    checkRateLimit(db, `points_redeem_code:${member_code}`, clientIp, 6, 300),
  ]);

  if (!ipLimit.allowed || !codeLimit.allowed) {
    return c.json(
      { error: 'มีการส่งคำขอแลกของรางวัลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่นะคะ' },
      429
    );
  }

  if (rules.points_expiry_months > 0) {
    await processExpiredPoints(db).catch(() => {});
  }

  const auth = await authenticateCustomerPin(db, member_code, pin);
  if (!auth.ok) {
    return c.json({ error: auth.error }, auth.status);
  }

  const customer = auth.customer;
  const reward = await db
    .prepare('SELECT * FROM rewards WHERE id = ? AND is_active = 1')
    .bind(reward_id)
    .first<{
      id: number;
      name: string;
      description: string;
      cost_points: number;
      stock: number | null;
      is_active: number;
    }>();

  if (!reward) {
    return c.json({ error: 'ไม่พบของรางวัลที่ต้องการแลก หรือของรางวัลนี้ปิดให้บริการแล้วค่ะ' }, 404);
  }

  if (reward.stock !== null && reward.stock <= 0) {
    return c.json({ error: 'ขออภัยค่ะ ของรางวัลรายการนี้ถูกแลกครบจำนวนแล้วค่ะ' }, 400);
  }

  if (customer.points_balance < reward.cost_points) {
    return c.json(
      {
        error: `แต้มสะสมไม่เพียงพอค่ะ (ต้องใช้ ${reward.cost_points} แต้ม แต่คุณมี ${customer.points_balance} แต้ม)`,
      },
      400
    );
  }

  // ทำการหักแต้ม ลดสต็อก สร้างใบแลก และบันทึก points_ledger ใน D1 Batch Transaction เดียวกัน
  // หากมีการกดซ้อนพร้อมกันจนแต้มหรือสต็อกจะติดลบ CHECK constraint ในตารางจะบังคับ Rollback ทั้ง Batch ทันที
  let batchResults: D1Result[];
  try {
    batchResults = await db.batch([
      db
        .prepare('UPDATE customers SET points_balance = points_balance - ? WHERE id = ?')
        .bind(reward.cost_points, customer.id),
      db
        .prepare(
          'UPDATE rewards SET stock = CASE WHEN stock IS NULL THEN NULL ELSE stock - 1 END WHERE id = ? AND is_active = 1'
        )
        .bind(reward.id),
      db
        .prepare(
          `INSERT INTO redemptions (customer_id, reward_id, points_spent, status, note)
           VALUES (?, ?, ?, 'pending', ?)`
        )
        .bind(customer.id, reward.id, reward.cost_points, note || ''),
      db
        .prepare(
          `INSERT INTO points_ledger (customer_id, type, points, reward_id, note, created_by)
           VALUES (?, 'redeem', ?, ?, ?, 'system')`
        )
        .bind(
          customer.id,
          -reward.cost_points,
          reward.id,
          `แลกของรางวัล: ${reward.name}`
        ),
    ]);
  } catch {
    return c.json(
      {
        error: 'ไม่สามารถแลกของรางวัลได้ เนื่องจากแต้มไม่เพียงพอหรือของรางวัลหมดพอดีค่ะ',
      },
      400
    );
  }

  const redemptionId = Number(batchResults[2]?.meta?.last_row_id || 0);
  const updatedCustomer = await db
    .prepare('SELECT points_balance, lifetime_points FROM customers WHERE id = ?')
    .bind(customer.id)
    .first<{ points_balance: number; lifetime_points: number }>();

  const remainingPoints =
    updatedCustomer?.points_balance ?? Math.max(0, customer.points_balance - reward.cost_points);

  const summaryText = buildRedemptionSummaryText({
    redemption_id: redemptionId,
    member_code: customer.member_code,
    display_name: customer.display_name,
    reward_name: reward.name,
    points_spent: reward.cost_points,
    remaining_points: remainingPoints,
    note,
  });

  const lineDeepLink = buildLineDeepLink(rules.contact_line, summaryText);

  return c.json(
    {
      message: `แลกของรางวัล "${reward.name}" สำเร็จแล้วค่ะ! ♡`,
      redemption: {
        id: redemptionId,
        reward_id: reward.id,
        reward_name: reward.name,
        points_spent: reward.cost_points,
        remaining_points: remainingPoints,
        status: 'pending',
        summary_text: summaryText,
        line_id: rules.contact_line,
        line_deep_link: lineDeepLink,
      },
    },
    201
  );
});
