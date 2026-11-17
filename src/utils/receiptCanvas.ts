import { generatePromptPayPayload, createQrMatrix, drawQrToCanvas } from './qr';

export interface ReceiptItem {
  product_title: string;
  quantity: number;
  unit_price: number;
  item_note?: string;
}

export interface RenderReceiptOptions {
  siteName: string;
  tagline?: string;
  orderCode?: string;
  billDate: string; // e.g. '17 พ.ย. 2569' or '17/11/2569'
  billTime: string; // e.g. '18:45'
  customerName: string;
  customerContact?: string;
  customerEmail?: string;
  dueDate?: string; // วันรับ/ส่งงาน
  items: ReceiptItem[];
  discountAmount?: number;
  discountLabel?: string; // e.g. 'ส่วนลด 10% (-฿xx)' or 'ส่วนลดพิเศษ (-฿xx)'
  netTotal: number;
  promptPayNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  showDueDate?: boolean;
  billNote?: string; // หมายเหตุเพิ่มเติม (แสดงเฉพาะเมื่อกรอก)
  includeQr?: boolean; // รวม QR ในบิลหรือไม่ (ค่าเริ่มต้น: true)
}

export interface RenderQrCardOptions {
  siteName: string;
  orderCode?: string;
  customerName?: string;
  netTotal: number;
  promptPayNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

/**
 * ตัดทอนข้อความให้พอดีกับความกว้าง Canvas (ป้องกันข้อความล้นขอบ)
 */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * ตัดบรรทัดข้อความแบบหลายบรรทัด
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

/**
 * วาดเส้นประ (Dashed Line) สไตล์น่ารัก
 */
function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: [number, number] = [6, 5],
  color = '#e8d8d3'
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/**
 * วาดสี่เหลี่ยมมุมโค้งแบบ Cross-browser
 */
function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill = true,
  stroke = false
) {
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * ดีไซน์บิลใหม่สำหรับร้าน qokhims
 * - ลายเส้นสะอาด มินิมอล โทนชมพู/น้ำตาลเข้ม
 * - เว้นระยะขอบกว้าง 56px ป้องกันตัวหนังสือตกขอบทั้งบน iPad และมือถือ
 * - เพิ่มช่องหมายเหตุ (แสดงเฉพาะเมื่อกรอก)
 * - เลือกรวมหรือแยก QR Code ได้
 */
export function drawQokhimsReceiptToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderReceiptOptions
): void {
  const width = 760;
  const paddingX = 56;
  const contentWidth = width - paddingX * 2; // 648px

  const hasNote = Boolean(options.billNote && options.billNote.trim());
  const includeQr = options.includeQr !== false;

  // คำนวณความสูงตามส่วนประกอบจริง
  let calculatedHeight = 560; // ส่วนหัว, กล่องข้อมูลลูกค้า, สรุปยอด, บัญชี
  options.items.forEach((it) => {
    calculatedHeight += it.item_note && it.item_note.trim() ? 64 : 48;
  });
  if (options.discountAmount && options.discountAmount > 0) {
    calculatedHeight += 32;
  }
  if (hasNote) {
    calculatedHeight += 84;
  }
  if (includeQr) {
    calculatedHeight += 280;
  } else {
    calculatedHeight += 80;
  }

  canvas.width = width;
  canvas.height = calculatedHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. พื้นหลังสีขาวนวลสะอาดตา พร้อมกรอบการ์ดเส้นคู่สีชมพูอ่อน
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, calculatedHeight);

  // ขอบนอกการ์ดใบเสร็จ
  ctx.strokeStyle = '#f3d9e2';
  ctx.lineWidth = 3;
  drawRoundedBox(ctx, 16, 16, width - 32, calculatedHeight - 32, 24, false, true);

  // 2. ส่วนหัวใบเสร็จ (Header)
  let curY = 54;

  // ป้ายแถบหัวบิลน่ารัก
  const badgeText = `🌸 ${options.siteName ? options.siteName.toUpperCase() : 'QOKHIMS'} STUDIO • OFFICIAL BILL`;
  ctx.font = 'bold 12px "Prompt", sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 28;
  const badgeX = (width - badgeWidth) / 2;
  ctx.fillStyle = '#fcebf0';
  drawRoundedBox(ctx, badgeX, curY - 14, badgeWidth, 26, 13, true, false);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d9537f';
  ctx.fillText(badgeText, width / 2, curY + 4);

  // ชื่อร้านตัวใหญ่
  curY += 46;
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 32px "Prompt", sans-serif';
  ctx.fillText(options.siteName || 'qokhims', width / 2, curY);

  // คำโปรยร้าน
  curY += 26;
  ctx.fillStyle = '#8c6b61';
  ctx.font = '500 13px "Prompt", sans-serif';
  const tagline = options.tagline || 'Graphic Design & Hand-drawn Font Studio ♡';
  ctx.fillText(tagline, width / 2, curY);

  // เส้นประคั่นส่วนหัว
  curY += 22;
  drawDashedLine(ctx, paddingX, curY, width - paddingX, curY, [5, 4], '#f0ded8');

  // 3. กล่องข้อมูลคำสั่งซื้อและลูกค้า (Meta Box)
  curY += 20;
  const metaBoxY = curY;
  const metaBoxHeight = 88;
  ctx.fillStyle = '#fdf8f5';
  ctx.strokeStyle = '#f5e4dd';
  ctx.lineWidth = 1;
  drawRoundedBox(ctx, paddingX, metaBoxY, contentWidth, metaBoxHeight, 14, true, true);

  // แถวที่ 1 ใน Meta Box: วันที่ & เวลา / รหัสบิล
  const innerLeftX = paddingX + 20;
  const innerRightX = width - paddingX - 20;
  let metaLineY = metaBoxY + 30;

  ctx.font = '600 13px "Prompt", sans-serif';
  ctx.fillStyle = '#4a3228';
  ctx.textAlign = 'left';
  ctx.fillText(`วันที่ : ${options.billDate} (${options.billTime})`, innerLeftX, metaLineY);

  ctx.textAlign = 'right';
  const orderCodeStr = options.orderCode ? `#${options.orderCode}` : 'ใบเสร็จคำสั่งซื้อ';
  ctx.font = 'bold 13px "Prompt", sans-serif';
  ctx.fillStyle = '#ec7a9a';
  ctx.fillText(orderCodeStr, innerRightX, metaLineY);

  // แถวที่ 2 ใน Meta Box: ชื่อลูกค้า / วันรับงาน
  metaLineY += 32;
  ctx.textAlign = 'left';
  ctx.font = '600 14px "Prompt", sans-serif';
  ctx.fillStyle = '#4a3228';
  const custNameDisplay = truncateText(ctx, `ลูกค้า : ${options.customerName || '-'}`, contentWidth * 0.55);
  ctx.fillText(custNameDisplay, innerLeftX, metaLineY);

  ctx.textAlign = 'right';
  if (options.showDueDate && options.dueDate) {
    ctx.font = '600 13px "Prompt", sans-serif';
    ctx.fillStyle = '#d9537f';
    ctx.fillText(`วันส่งงาน : ${options.dueDate}`, innerRightX, metaLineY);
  } else if (options.customerEmail) {
    ctx.font = '500 12px "Prompt", sans-serif';
    ctx.fillStyle = '#8c6b61';
    ctx.fillText(truncateText(ctx, options.customerEmail, contentWidth * 0.4), innerRightX, metaLineY);
  }

  curY = metaBoxY + metaBoxHeight + 24;

  // 4. หัวตารางรายการสินค้า
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8c6b61';
  ctx.font = 'bold 12px "Prompt", sans-serif';
  ctx.fillText('รายการสินค้า / บริการ', paddingX, curY);

  ctx.textAlign = 'right';
  ctx.fillText('จำนวน & ยอดรวม (฿)', width - paddingX, curY);

  curY += 12;
  ctx.strokeStyle = '#fae4ec';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(paddingX, curY);
  ctx.lineTo(width - paddingX, curY);
  ctx.stroke();

  // 5. วนแสดงรายการสินค้า
  curY += 24;
  options.items.forEach((it, idx) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a3228';
    ctx.font = 'bold 15px "Prompt", sans-serif';
    const itemTitle = truncateText(ctx, `${idx + 1}. ${it.product_title}`, contentWidth - 170);
    ctx.fillText(itemTitle, paddingX, curY);

    // ยอดรวมรายการ
    ctx.textAlign = 'right';
    ctx.font = 'bold 15px "Prompt", sans-serif';
    ctx.fillStyle = '#4a3228';
    const itemTotalStr = (it.quantity * it.unit_price).toFixed(2);
    ctx.fillText(itemTotalStr, width - paddingX, curY);

    // รายละเอียดย่อยด้านล่างชื่อรายการ
    curY += 18;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8c6b61';
    ctx.font = '500 12px "Prompt", sans-serif';
    const priceDetail = `@${it.unit_price.toFixed(2)} x ${it.quantity} ชิ้น`;
    ctx.fillText(priceDetail, paddingX + 16, curY);

    if (it.item_note && it.item_note.trim()) {
      curY += 16;
      ctx.fillStyle = '#a68278';
      ctx.font = 'italic 11px "Prompt", sans-serif';
      const noteLine = truncateText(ctx, `↳ ${it.item_note.trim()}`, contentWidth - 100);
      ctx.fillText(noteLine, paddingX + 24, curY);
    }

    curY += 26;
  });

  // 6. กล่องหมายเหตุเพิ่มเติม (แสดงเฉพาะเมื่อกรอกข้อความ)
  if (hasNote && options.billNote) {
    curY += 4;
    const noteLines = wrapText(ctx, options.billNote.trim(), contentWidth - 40);
    const noteBoxH = Math.max(46, noteLines.length * 20 + 26);

    ctx.fillStyle = '#fff9fb';
    ctx.strokeStyle = '#f8dbe4';
    ctx.lineWidth = 1;
    drawRoundedBox(ctx, paddingX, curY, contentWidth, noteBoxH, 10, true, true);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#d9537f';
    ctx.font = 'bold 12px "Prompt", sans-serif';
    ctx.fillText('📝 หมายเหตุ:', paddingX + 14, curY + 20);

    ctx.fillStyle = '#6b4c41';
    ctx.font = '500 12px "Prompt", sans-serif';
    noteLines.forEach((line, lIdx) => {
      ctx.fillText(line, paddingX + 90, curY + 20 + lIdx * 20);
    });

    curY += noteBoxH + 18;
  }

  // เส้นคั่นก่อนสรุปยอด
  curY += 4;
  drawDashedLine(ctx, paddingX, curY, width - paddingX, curY, [5, 4], '#f0ded8');
  curY += 22;

  // 7. ส่วนลด (ถ้ามี)
  const discount = Number(options.discountAmount) || 0;
  if (discount > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e05d82';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText(options.discountLabel || 'ส่วนลดพิเศษ', paddingX, curY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 14px "Prompt", sans-serif';
    ctx.fillText(`-฿${discount.toFixed(2)}`, width - paddingX, curY);
    curY += 24;
  }

  // ยอดรวมก่อนหักส่วนลด (ถ้ามีส่วนลด)
  if (discount > 0) {
    const rawSubtotal = options.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8c6b61';
    ctx.font = '500 13px "Prompt", sans-serif';
    ctx.fillText(`ยอดรวมก่อนลด (${options.items.length} รายการ)`, paddingX, curY);

    ctx.textAlign = 'right';
    ctx.fillText(`฿${rawSubtotal.toFixed(2)}`, width - paddingX, curY);
    curY += 24;
  }

  // 8. กล่องเด่น "ยอดชำระสุทธิ"
  const grandBoxY = curY;
  const grandBoxH = 58;
  ctx.fillStyle = '#fcebf0';
  ctx.strokeStyle = '#f5c2d2';
  ctx.lineWidth = 1.5;
  drawRoundedBox(ctx, paddingX, grandBoxY, contentWidth, grandBoxH, 14, true, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 18px "Prompt", sans-serif';
  ctx.fillText('ยอดชำระสุทธิ', paddingX + 22, grandBoxY + 36);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#d9537f';
  ctx.font = 'bold 24px "Prompt", sans-serif';
  ctx.fillText(`฿${options.netTotal.toFixed(2)}`, width - paddingX - 22, grandBoxY + 37);

  curY = grandBoxY + grandBoxH + 20;

  // 9. ข้อมูลบัญชีธนาคารสำหรับโอนเงิน
  const bankBoxY = curY;
  const bankBoxH = 52;
  ctx.fillStyle = '#fdf8f5';
  ctx.strokeStyle = '#f2e2dc';
  ctx.lineWidth = 1;
  drawRoundedBox(ctx, paddingX, bankBoxY, contentWidth, bankBoxH, 12, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 13px "Prompt", sans-serif';
  ctx.fillText(
    `${options.bankName || 'กสิกรไทย'} : ${options.bankAccountNumber || '123-4-56789-0'}`,
    width / 2,
    bankBoxY + 22
  );

  ctx.font = '500 12px "Prompt", sans-serif';
  ctx.fillStyle = '#8c6b61';
  ctx.fillText(
    `ชื่อบัญชี : ${options.bankAccountName || 'qokhims'}`,
    width / 2,
    bankBoxY + 40
  );

  curY = bankBoxY + bankBoxH + 22;

  // 10. ส่วน QR Code หรือข้อความท้ายบิล
  if (includeQr) {
    const qrSize = 154;
    const qrX = (width - qrSize) / 2;
    try {
      const ppTarget = options.promptPayNumber || '0812345678';
      const ppPayload = generatePromptPayPayload(ppTarget, options.netTotal);
      const qrMatrix = createQrMatrix(ppPayload);
      drawQrToCanvas(ctx, qrMatrix, qrX, curY, qrSize, '#4a3228', '#ffffff');
    } catch {
      // fallback
    }

    curY += qrSize + 20;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3228';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText('สแกนเพื่อชำระเงินผ่านพร้อมเพย์', width / 2, curY);

    curY += 20;
    ctx.fillStyle = '#e05d82';
    ctx.font = 'bold 12px "Prompt", sans-serif';
    ctx.fillText('แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡', width / 2, curY);

    curY += 18;
    ctx.fillStyle = '#8c6b61';
    ctx.font = '500 11px "Prompt", sans-serif';
    ctx.fillText('โอนชำระภายใน 1 ชั่วโมงเพื่อล็อคคิวงานน้า', width / 2, curY);

    curY += 24;
    ctx.fillStyle = '#a68278';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText('- THANK YOU -', width / 2, curY);
  } else {
    // กรณีแยก QR Code: แสดงข้อความปิดท้ายบิลแบบกะทัดรัด
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e05d82';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText('แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡', width / 2, curY + 6);

    ctx.fillStyle = '#8c6b61';
    ctx.font = '500 11px "Prompt", sans-serif';
    ctx.fillText('โอนชำระภายใน 1 ชั่วโมงเพื่อล็อคคิวงานน้า', width / 2, curY + 26);

    ctx.fillStyle = '#a68278';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText('- THANK YOU -', width / 2, curY + 48);
  }
}

/**
 * ฟังก์ชันวาดการ์ด QR Code พร้อมเพย์แบบแยกไฟล์ (สำหรับการส่งคู่กับบิล)
 */
export function drawQokhimsQrCardToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderQrCardOptions
): void {
  const width = 520;
  const height = 560;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // พื้นหลังสีขาว พร้อมขอบชมพูน่ารัก
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#f3d9e2';
  ctx.lineWidth = 3;
  drawRoundedBox(ctx, 14, 14, width - 28, height - 28, 20, false, true);

  let curY = 46;
  ctx.textAlign = 'center';

  // ป้ายหัวการ์ด
  ctx.fillStyle = '#fcebf0';
  const badgeText = `🌸 ${options.siteName || 'QOKHIMS'} • PROMPTPAY QR`;
  ctx.font = 'bold 12px "Prompt", sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 24;
  drawRoundedBox(ctx, (width - badgeW) / 2, curY - 14, badgeW, 24, 12, true, false);
  ctx.fillStyle = '#d9537f';
  ctx.fillText(badgeText, width / 2, curY + 2);

  // ยอดเงินชำระ
  curY += 40;
  ctx.fillStyle = '#4a3228';
  ctx.font = '600 14px "Prompt", sans-serif';
  ctx.fillText('สแกน QR เพื่อชำระเงิน', width / 2, curY);

  curY += 28;
  ctx.font = 'bold 28px "Prompt", sans-serif';
  ctx.fillStyle = '#d9537f';
  ctx.fillText(`฿${options.netTotal.toFixed(2)} บาท`, width / 2, curY);

  if (options.orderCode) {
    curY += 18;
    ctx.font = '500 12px "Prompt", sans-serif';
    ctx.fillStyle = '#8c6b61';
    ctx.fillText(`รหัสคำสั่งซื้อ: #${options.orderCode}`, width / 2, curY);
  }

  // QR Code ขนาดใหญ่ คมชัด
  curY += 18;
  const qrSize = 190;
  const qrX = (width - qrSize) / 2;
  try {
    const ppPayload = generatePromptPayPayload(options.promptPayNumber || '0812345678', options.netTotal);
    const qrMatrix = createQrMatrix(ppPayload);
    drawQrToCanvas(ctx, qrMatrix, qrX, curY, qrSize, '#4a3228', '#ffffff');
  } catch {
    // fallback
  }

  curY += qrSize + 24;
  // ข้อมูลบัญชีธนาคารสำรอง
  ctx.font = 'bold 12px "Prompt", sans-serif';
  ctx.fillStyle = '#4a3228';
  ctx.fillText(
    `${options.bankName || 'กสิกรไทย'} : ${options.bankAccountNumber || '123-4-56789-0'}`,
    width / 2,
    curY
  );

  curY += 18;
  ctx.font = '500 11px "Prompt", sans-serif';
  ctx.fillStyle = '#8c6b61';
  ctx.fillText(`ชื่อบัญชี : ${options.bankAccountName || 'qokhims'}`, width / 2, curY);

  curY += 22;
  ctx.fillStyle = '#e05d82';
  ctx.font = 'bold 11px "Prompt", sans-serif';
  ctx.fillText('แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡', width / 2, curY);
}
