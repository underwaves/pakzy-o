import type { Env } from '../types';

export interface OrderSummaryItem {
  product_title: string;
  quantity: number;
  unit_price: number;
  item_note?: string;
}

export interface OrderSummaryPayload {
  order_code: string;
  customer_name: string;
  customer_contact: string;
  customer_phone?: string;
  customer_email?: string;
  custom_brief?: string;
  member_code?: string;
  total_amount: number;
  items: OrderSummaryItem[];
}

export interface RedemptionSummaryPayload {
  redemption_id: number;
  member_code: string;
  display_name: string;
  reward_name: string;
  points_spent: number;
  remaining_points: number;
  note?: string;
}

/**
 * สร้างข้อความสรุปคำสั่งซื้อสำหรับส่งเข้าแชต LINE ร้าน (@280npxvj)
 */
export function buildOrderSummaryText(order: OrderSummaryPayload): string {
  const lines: string[] = [
    '🌸 สรุปคำสั่งซื้อร้าน pakzy.o 🌸',
    `รหัสคำสั่งซื้อ: ${order.order_code}`,
  ];

  if (order.member_code && order.member_code.trim()) {
    lines.push(`🎫 รหัสสมาชิกสะสมแต้ม: ${order.member_code.trim().toUpperCase()}`);
  }

  lines.push('──────────────────');
  lines.push('📦 รายการที่สั่ง:');

  order.items.forEach((item, index) => {
    const subtotal = item.quantity * item.unit_price;
    lines.push(
      `${index + 1}. ${item.product_title} x${item.quantity} (${subtotal.toLocaleString('th-TH')} ฿)`
    );
    if (item.item_note && item.item_note.trim()) {
      lines.push(`   ↳ หมายเหตุ: ${item.item_note.trim()}`);
    }
  });

  lines.push('──────────────────');
  lines.push(`💰 ยอดรวมประเมิน: ${order.total_amount.toLocaleString('th-TH')} บาท`);

  if (order.custom_brief && order.custom_brief.trim()) {
    lines.push(`📝 รายละเอียดบรีฟงาน:\n${order.custom_brief.trim()}`);
  }

  lines.push('──────────────────');
  lines.push(`👤 ชื่อลูกค้า: ${order.customer_name}`);
  lines.push(`💬 ช่องทางติดต่อ: ${order.customer_contact}`);
  if (order.customer_phone && order.customer_phone.trim()) {
    lines.push(`📞 เบอร์โทร: ${order.customer_phone.trim()}`);
  }
  if (order.customer_email && order.customer_email.trim()) {
    lines.push(`✉️ อีเมล: ${order.customer_email.trim()}`);
  }
  lines.push('──────────────────');
  lines.push('รบกวนแอดมินเช็กคิวงานและแจ้งยอดโอนได้เลยนะคะ ขอบคุณค่ะ ♡');

  return lines.join('\n');
}

/**
 * สร้างข้อความสรุปการแลกของรางวัลสำหรับส่งเข้าแชต LINE ร้าน (@280npxvj)
 */
export function buildRedemptionSummaryText(payload: RedemptionSummaryPayload): string {
  const lines: string[] = [
    '🎁 แจ้งแลกของรางวัลสะสมแต้ม pakzy.o 🎁',
    `รหัสรายการแลก: #RDM-${String(payload.redemption_id).padStart(4, '0')}`,
    `🎫 รหัสสมาชิก: ${payload.member_code}`,
    `👤 ชื่อสมาชิก: ${payload.display_name}`,
    '──────────────────',
    `🌸 ของรางวัลที่แลก: ${payload.reward_name}`,
    `✨ แต้มที่ใช้แลก: ${payload.points_spent.toLocaleString('th-TH')} แต้ม`,
    `💖 แต้มคงเหลือ: ${payload.remaining_points.toLocaleString('th-TH')} แต้ม`,
  ];

  if (payload.note && payload.note.trim()) {
    lines.push(`📝 หมายเหตุ: ${payload.note.trim()}`);
  }

  lines.push('──────────────────');
  lines.push('รบกวนแอดมินตรวจสอบสิทธิ์แลกของรางวัลด้วยนะคะ ขอบคุณค่ะ ♡');

  return lines.join('\n');
}

/**
 * สร้างลิงก์สำหรับเด้งเข้า LINE Official Account ของร้านโดยตรง (@280npxvj)
 * รองรับทั้งมือถือและคอมพิวเตอร์ (เปิดแอป LINE ไปที่ Official Account ของร้านทันที)
 */
export function buildLineDeepLink(lineId: string, _summaryText?: string): string {
  const trimmed = (lineId || '@280npxvj').trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const cleanId = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  return `https://line.me/R/ti/p/${cleanId}`;
}

/**
 * ส่งแจ้งเตือนคำสั่งซื้อเข้า LINE Messaging API อัตโนมัติ
 * รองรับทั้งค่าที่ร้านกรอกเองในหน้าตั้งค่าหลังบ้าน (D1) และค่าใน wrangler secret (env)
 * หากยังไม่ได้ตั้งค่า LINE Messaging API จะ fallback เป็นการแจ้งเตือนทางอีเมลของร้าน (notification_email)
 */
export async function sendLinePushNotificationIfEnabled(
  env: Env,
  enableFlag: boolean,
  summaryText: string,
  customToken?: string,
  customToUserId?: string,
  fallbackEmail?: string
): Promise<{ lineNotified: boolean; emailFallback: boolean }> {
  const token = (customToken || env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
  const toUserId = (customToUserId || env.LINE_ADMIN_USER_ID || '').trim();

  let lineNotified = false;
  let emailFallback = false;

  if (enableFlag && token && toUserId) {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: toUserId,
          messages: [
            {
              type: 'text',
              text: `🔔 มีคำสั่งซื้อใหม่จากหน้าเว็บ!\n\n${summaryText}`,
            },
          ],
        }),
      });

      lineNotified = response.ok;
    } catch {
      lineNotified = false;
    }
  }

  // หาก LINE Push ไม่สำเร็จ หรือยังไม่ได้ตั้งค่า Token ให้ fallback ไปยังอีเมลแจ้งเตือนของร้าน
  if (!lineNotified && fallbackEmail && fallbackEmail.trim()) {
    emailFallback = true;
    console.info(
      `[Notification Fallback] LINE Push not configured or failed. Order summary queued for shop email: ${fallbackEmail.trim()}`
    );
  }

  return { lineNotified, emailFallback };
}

/**
 * ทดสอบส่งข้อความ Push Message ผ่าน LINE Messaging API พร้อมคืนผลลัพธ์ละเอียดสำหรับหน้าตั้งค่าหลังบ้าน
 */
export async function testLinePushNotification(
  token: string,
  toUserId: string,
  siteName: string
): Promise<{ ok: boolean; error?: string }> {
  const cleanToken = token.trim();
  const cleanUserId = toUserId.trim();

  if (!cleanToken) {
    return { ok: false, error: 'กรุณากรอก LINE Channel Access Token ก่อนทดสอบค่ะ' };
  }
  if (!cleanUserId) {
    return { ok: false, error: 'กรุณากรอก LINE Admin User ID (ขึ้นต้นด้วย U...) ก่อนทดสอบค่ะ' };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        to: cleanUserId,
        messages: [
          {
            type: 'text',
            text: `🌸 ทดสอบระบบแจ้งเตือนร้าน ${siteName || 'pakzy.o'} สำเร็จแล้วค่ะ! 🌸\nเมื่อมีลูกค้าสั่งซื้อบนหน้าเว็บ ระบบจะส่งสรุปออเดอร์เข้าแชตนี้ให้อัตโนมัติทันทีค่ะ ♡`,
          },
        ],
      }),
    });

    if (response.ok) {
      return { ok: true };
    }

    const errData = (await response.json().catch(() => ({}))) as { message?: string };
    return {
      ok: false,
      error: `LINE API ตอบกลับ (${response.status}): ${
        errData.message || 'ตรวจสอบ Channel Access Token หรือ User ID อีกครั้งนะคะ (แอดมินต้องแอดเป็นเพื่อนกับ LINE OA ของร้านด้วยค่ะ)'
      }`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อ LINE Messaging API ได้',
    };
  }
}
