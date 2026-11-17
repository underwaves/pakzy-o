import type { Env } from '../types';

export interface SlipVerificationResult {
  ok: boolean;
  transRef?: string;
  amount?: number;
  senderName?: string;
  receiverAccount?: string;
  note?: string;
  error?: string;
  duplicate?: boolean;
  amountMismatch?: boolean;
  receiverMismatch?: boolean;
  rawData?: any;
}

export interface VerifySlipOptions {
  env: Env;
  orderId: number;
  orderCode: string;
  expectedAmount: number;
  slipUrl: string;
  settings: Record<string, string>;
  isManualTrigger?: boolean;
}

/**
 * ตัดอักขระพิเศษเหลือเฉพาะตัวเลขเพื่อเปรียบเทียบเลขที่บัญชีหรือเบอร์พร้อมเพย์
 */
function cleanDigits(value: string | undefined | null): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * ดึง ArrayBuffer และ ContentType ของไฟล์สลิปจาก Cloudflare R2
 */
async function getSlipBufferFromR2(
  bucket: R2Bucket,
  slipUrl: string
): Promise<{ buffer: ArrayBuffer; contentType: string; key: string } | null> {
  let r2Key = slipUrl.trim();
  if (r2Key.startsWith('/r2/')) {
    r2Key = r2Key.slice(4);
  } else if (r2Key.startsWith('http://') || r2Key.startsWith('https://')) {
    try {
      const parsed = new URL(r2Key);
      r2Key = parsed.pathname.replace(/^\/r2\//, '').replace(/^\//, '');
    } catch {
      // fallback
    }
  }

  const obj = await bucket.get(r2Key);
  if (!obj) {
    return null;
  }

  const buffer = await obj.arrayBuffer();
  const contentType = obj.httpMetadata?.contentType || 'image/jpeg';
  return { buffer, contentType, key: r2Key };
}

/**
 * ตรวจสอบสลิปกับ SlipOK API
 * รองรับทั้งแบบส่งไฟล์ FormData ไปยัง https://api.slipok.com/api/line/apikey/{branch_id}
 */
async function verifyWithSlipOK(
  buffer: ArrayBuffer,
  contentType: string,
  apiKey: string,
  branchId: string
): Promise<any> {
  const cleanBranch = branchId.trim() || 'default';
  const url = `https://api.slipok.com/api/line/apikey/${cleanBranch}`;

  const formData = new FormData();
  formData.append(
    'files',
    new Blob([buffer], { type: contentType }),
    `slip-${Date.now()}.jpg`
  );
  formData.append('log', 'true');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-authorization': apiKey.trim(),
    },
    body: formData,
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `SlipOK response parsing error: ${text.slice(0, 200)}` };
  }
}

/**
 * ตรวจสอบสลิปกับ EasySlip API (https://developer.easyslip.com/api/v1/verify)
 */
async function verifyWithEasySlip(
  buffer: ArrayBuffer,
  contentType: string,
  apiKey: string
): Promise<any> {
  const url = 'https://developer.easyslip.com/api/v1/verify';

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([buffer], { type: contentType }),
    `slip-${Date.now()}.jpg`
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: formData,
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: response.status, message: `EasySlip response parsing error: ${text.slice(0, 200)}` };
  }
}

/**
 * ฟังก์ชันหลักในการตรวจสอบสลิปอัตโนมัติ
 * - ป้องกันสลิปซ้ำ (Duplicate TransRef)
 * - ตรวจสอบยอดเงินโอนเทียบกับยอดคำสั่งซื้อ
 * - ตรวจสอบบัญชีผู้รับเงิน (PromptPay หรือเลขบัญชีร้าน)
 * - อัปเดตสถานะคำสั่งซื้อและบันทึกประวัติลง D1
 */
export async function verifyOrderSlip({
  env,
  orderId,
  orderCode,
  expectedAmount,
  slipUrl,
  settings,
  isManualTrigger = false,
}: VerifySlipOptions): Promise<SlipVerificationResult> {
  const provider = (settings.slip_verify_provider || 'slipok').toLowerCase();
  const apiKey =
    settings.slip_verify_api_key?.trim() ||
    env.SLIPOK_API_KEY?.trim() ||
    '';
  const branchId =
    settings.slip_verify_branch_id?.trim() ||
    env.SLIPOK_BRANCH_ID?.trim() ||
    '';
  const checkReceiver = settings.slip_verify_check_receiver !== 'false';
  const autoConfirm = settings.slip_verify_auto_confirm !== 'false';

  // 1. ตรวจสอบว่าเปิดระบบหรือมี API Key หรือไม่
  const isEnabled = settings.slip_verify_enabled === 'true';
  const isMock =
    provider === 'mock' ||
    apiKey.toLowerCase().startsWith('mock') ||
    apiKey.toLowerCase().startsWith('test');

  if (!isManualTrigger && !isEnabled) {
    return {
      ok: false,
      error: 'ระบบตรวจสอบสลิปอัตโนมัติยังไม่ได้เปิดใช้งาน',
    };
  }

  if (!isMock && !apiKey) {
    return {
      ok: false,
      error: 'ยังไม่ได้ระบุ API Key สำหรับผู้ให้บริการตรวจสลิปในหน้าตั้งค่าหลังบ้าน',
    };
  }

  // 2. ดึงไฟล์สลิปจาก Cloudflare R2
  const slipFile = await getSlipBufferFromR2(env.BUCKET, slipUrl);
  if (!slipFile && !isMock) {
    const errorMsg = 'ไม่พบไฟล์สลิปในที่เก็บข้อมูล R2';
    await env.DB.prepare(
      'UPDATE orders SET slip_verified = -1, slip_verify_note = ? WHERE id = ?'
    )
      .bind(errorMsg, orderId)
      .run();
    return { ok: false, error: errorMsg };
  }

  // 3. เรียก API ตรวจสลิป
  let rawData: any = null;
  let transRef = '';
  let slipAmount = 0;
  let senderName = '';
  let receiverAccount = '';
  let receiverName = '';

  if (isMock) {
    // โหมดจำลองสำหรับทดสอบระบบโดยไม่ต้องตัดเครดิต API จริง
    transRef = `MOCK-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 9000 + 1000)}`;
    slipAmount = expectedAmount;
    senderName = 'ลูกค้าทดสอบระบบ (Sandbox)';
    receiverAccount = settings.promptpay_number || settings.bank_account_number || '0812345678';
    receiverName = settings.bank_account_name || 'qokhims';
    rawData = {
      mock: true,
      transRef,
      amount: slipAmount,
      sender: { name: senderName },
      receiver: { account: receiverAccount, name: receiverName },
    };
  } else if (provider === 'easyslip') {
    rawData = await verifyWithEasySlip(slipFile!.buffer, slipFile!.contentType, apiKey);
    if (!rawData || (rawData.status !== 200 && rawData.status !== 'success')) {
      const err =
        rawData?.message ||
        rawData?.error ||
        'ไม่พบข้อมูล QR Code ในสลิป หรือสลิปไม่สามารถอ่านได้';
      await env.DB.prepare(
        'UPDATE orders SET slip_verified = -1, slip_verify_note = ? WHERE id = ?'
      )
        .bind(`EasySlip: ${err}`, orderId)
        .run();
      return { ok: false, error: err, rawData };
    }
    const data = rawData.data || {};
    transRef = data.transRef || data.payload || '';
    slipAmount = Number(data.amount?.amount ?? data.amount ?? 0);
    senderName = data.sender?.account?.name || data.sender?.name || '';
    receiverAccount = data.receiver?.account?.value || data.receiver?.account?.proxy?.value || '';
    receiverName = data.receiver?.account?.name || '';
  } else {
    // Default: SlipOK
    rawData = await verifyWithSlipOK(slipFile!.buffer, slipFile!.contentType, apiKey, branchId);
    if (!rawData || (rawData.success !== true && rawData.data?.success !== true)) {
      const err =
        rawData?.message ||
        rawData?.data?.message ||
        'ไม่สามารถอ่าน QR Code หรือข้อมูลสลิปได้จากรูปภาพ';
      await env.DB.prepare(
        'UPDATE orders SET slip_verified = -1, slip_verify_note = ? WHERE id = ?'
      )
        .bind(`SlipOK: ${err}`, orderId)
        .run();
      return { ok: false, error: err, rawData };
    }
    const data = rawData.data?.data || rawData.data || {};
    transRef = data.transRef || '';
    slipAmount = Number(data.amount ?? 0);
    senderName =
      data.sender?.account?.name?.th ||
      data.sender?.account?.name?.en ||
      data.sender?.displayName ||
      '';
    receiverAccount =
      data.receiver?.account?.proxy?.value ||
      data.receiver?.account?.value ||
      '';
    receiverName =
      data.receiver?.account?.name?.th ||
      data.receiver?.account?.name?.en ||
      data.receiver?.displayName ||
      '';
  }

  // 4. ตรวจสอบการนำสลิปเดิมมาใช้ซ้ำ (Anti-Fraud / Duplicate Slip Check)
  if (transRef) {
    const existingSlip = await env.DB.prepare(
      `SELECT id, order_id FROM slip_verifications WHERE trans_ref = ? AND order_id != ?
       UNION
       SELECT id, id as order_id FROM orders WHERE slip_trans_ref = ? AND id != ?`
    )
      .bind(transRef, orderId, transRef, orderId)
      .first<{ id: number; order_id: number }>();

    if (existingSlip) {
      const duplicateMsg = `สลิปนี้เคยถูกใช้งานในระบบแล้ว (รหัสอ้างอิง: ${transRef}) ไม่อนุญาตให้ใช้สลิปซ้ำ`;
      await env.DB.prepare(
        'UPDATE orders SET slip_trans_ref = ?, slip_verified = -1, slip_verify_note = ? WHERE id = ?'
      )
        .bind(transRef, duplicateMsg, orderId)
        .run();

      return {
        ok: false,
        duplicate: true,
        transRef,
        amount: slipAmount,
        error: duplicateMsg,
        rawData,
      };
    }
  }

  // 5. ตรวจสอบยอดเงินในสลิปเทียบกับยอดคำสั่งซื้อ
  const diff = Math.abs(slipAmount - expectedAmount);
  if (diff > 0.05) {
    const mismatchMsg = `ยอดเงินในสลิป (${slipAmount.toLocaleString()} บาท) ไม่ตรงกับยอดคำสั่งซื้อ (${expectedAmount.toLocaleString()} บาท)`;
    await env.DB.prepare(
      'UPDATE orders SET slip_trans_ref = ?, slip_verified = -1, slip_verify_note = ? WHERE id = ?'
    )
      .bind(transRef || null, mismatchMsg, orderId)
      .run();

    return {
      ok: false,
      amountMismatch: true,
      transRef,
      amount: slipAmount,
      error: mismatchMsg,
      rawData,
    };
  }

  // 6. ตรวจสอบเลขบัญชีหรือเบอร์พร้อมเพย์ผู้รับ (ถ้าเปิดใช้งาน)
  if (checkReceiver && receiverAccount) {
    const shopPromptPay = cleanDigits(settings.promptpay_number);
    const shopBankAccount = cleanDigits(settings.bank_account_number);
    const slipReceiverDigits = cleanDigits(receiverAccount);

    let isMatch = true;
    if (shopPromptPay && shopBankAccount) {
      isMatch =
        slipReceiverDigits.includes(shopPromptPay) ||
        slipReceiverDigits.includes(shopBankAccount) ||
        shopPromptPay.includes(slipReceiverDigits) ||
        shopBankAccount.includes(slipReceiverDigits);
    } else if (shopPromptPay) {
      isMatch =
        slipReceiverDigits.includes(shopPromptPay) ||
        shopPromptPay.includes(slipReceiverDigits);
    } else if (shopBankAccount) {
      isMatch =
        slipReceiverDigits.includes(shopBankAccount) ||
        shopBankAccount.includes(slipReceiverDigits);
    }

    if (!isMatch) {
      const receiverMismatchMsg = `บัญชีผู้รับในสลิป (${receiverAccount}${receiverName ? ` - ${receiverName}` : ''}) ไม่ตรงกับบัญชีของร้าน`;
      await env.DB.prepare(
        'UPDATE orders SET slip_trans_ref = ?, slip_verified = -1, slip_verify_note = ? WHERE id = ?'
      )
        .bind(transRef || null, receiverMismatchMsg, orderId)
        .run();

      return {
        ok: false,
        receiverMismatch: true,
        transRef,
        amount: slipAmount,
        receiverAccount,
        error: receiverMismatchMsg,
        rawData,
      };
    }
  }

  // 7. สลิปผ่านการตรวจสอบทั้งหมด! บันทึกประวัติและอัปเดตสถานะออเดอร์
  const successNote = `ตรวจสลิปอัตโนมัติสำเร็จ (${provider.toUpperCase()}) ยอด ${slipAmount} บาท (รหัส: ${transRef || '-'})`;

  await env.DB.batch([
    // บันทึกลงตาราง orders
    env.DB.prepare(
      `UPDATE orders
       SET slip_trans_ref = ?,
           slip_verified = 1,
           slip_verified_at = datetime('now'),
           slip_verify_note = ?,
           payment_status = 'verified',
           status = CASE WHEN ? = 1 AND status = 'pending' THEN 'confirmed' ELSE status END,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(transRef || null, successNote, autoConfirm ? 1 : 0, orderId),

    // บันทึกลงตาราง slip_verifications ป้องกันสลิปซ้ำ
    env.DB.prepare(
      `INSERT INTO slip_verifications (
         order_id, trans_ref, amount, receiver_account, sender_name, provider, status, raw_payload
       ) VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)
       ON CONFLICT(trans_ref) DO UPDATE SET status = 'verified'`
    ).bind(
      orderId,
      transRef || `ORDER-${orderId}-${Date.now()}`,
      slipAmount,
      receiverAccount || settings.promptpay_number || '',
      senderName || '',
      provider,
      JSON.stringify(rawData)
    ),
  ]);

  return {
    ok: true,
    transRef,
    amount: slipAmount,
    senderName,
    receiverAccount,
    note: successNote,
    rawData,
  };
}

/**
 * ฟังก์ชันสำหรับทดสอบการเชื่อมต่อ API ของ Slip Provider จากหน้าตั้งค่าหลังบ้าน
 */
export async function testSlipProviderConnection(
  provider: string,
  apiKey: string,
  branchId: string
): Promise<{ ok: boolean; message: string; quota?: any }> {
  const cleanKey = apiKey.trim();
  const cleanBranch = branchId.trim() || 'default';

  if (!cleanKey) {
    return { ok: false, message: 'กรุณากรอก API Key ก่อนทดสอบค่ะ' };
  }

  if (cleanKey.toLowerCase().startsWith('mock') || cleanKey.toLowerCase().startsWith('test') || provider === 'mock') {
    return {
      ok: true,
      message: 'เชื่อมต่อโหมดจำลอง (Mock/Sandbox Mode) สำเร็จ พร้อมใช้งานทดสอบระบบค่ะ ♡',
    };
  }

  try {
    if (provider === 'easyslip') {
      // ทดสอบเรียก EasySlip Check Quota
      const res = await fetch('https://developer.easyslip.com/api/v1/user/quota', {
        headers: { Authorization: `Bearer ${cleanKey}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        return {
          ok: true,
          message: `เชื่อมต่อ EasySlip API สำเร็จ! คงเหลือ: ${data.data?.remaining ?? 'พร้อมใช้งาน'} เครดิต`,
          quota: data.data,
        };
      }
      return {
        ok: false,
        message: data?.message || `การเชื่อมต่อ EasySlip ล้มเหลว (HTTP ${res.status})`,
      };
    } else {
      // SlipOK: ทดสอบเรียกโควต้าหรือตรวจสอบ API Key
      // SlipOK quota check endpoint: GET /api/line/quota/{branch_id}
      const quotaUrl = `https://api.slipok.com/api/line/quota/${cleanBranch}`;
      const res = await fetch(quotaUrl, {
        headers: { 'x-authorization': cleanKey },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && (data?.success || data?.quota !== undefined || data?.data !== undefined)) {
        const remaining = data.quota ?? data.data?.quota ?? 'พร้อมใช้งาน';
        return {
          ok: true,
          message: `เชื่อมต่อ SlipOK API สำเร็จ! สาขา: ${cleanBranch} | โควต้าคงเหลือ: ${remaining} ครั้ง`,
          quota: remaining,
        };
      }
      return {
        ok: false,
        message: data?.message || `การเชื่อมต่อ SlipOK ล้มเหลว (HTTP ${res.status}) กรุณาตรวจสอบ Branch ID และ API Key`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      message: `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ผู้ให้บริการได้: ${err?.message || 'Network error'}`,
    };
  }
}
