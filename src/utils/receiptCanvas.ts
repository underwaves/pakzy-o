import { generatePromptPayPayload, createQrMatrix, drawQrToCanvas } from './qr';

export interface ReceiptItem {
  product_title: string;
  category_type?: 'service' | 'font';
  quantity: number;
  unit_price: number;
  item_note?: string;
}

export interface RenderReceiptOptions {
  siteName: string;
  tagline?: string;
  orderCode?: string;
  billDate: string; // e.g. '16 พ.ย. 2569' or '17/11/2569'
  billTime?: string; // e.g. '18:45'
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
    // fallback arc corners
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * วาดเส้นประรอบสี่เหลี่ยมมุมโค้ง (สำหรับตราประทับ)
 */
function drawDashedRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  dash: [number, number] = [4, 3],
  color = '#f298b4',
  fillColor?: string
) {
  ctx.save();
  ctx.beginPath();
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.restore();
}

/**
 * วาดเส้นบาร์โค้ดตกแต่ง (สำหรับกรณีแยกการ์ด QR)
 */
function drawDecorativeBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = '#a68278'
) {
  ctx.save();
  ctx.fillStyle = color;
  const pattern = [2, 1, 3, 1, 1, 2, 4, 1, 2, 2, 1, 3, 1, 1, 4, 2, 1, 3, 2, 1, 1, 3, 2, 2, 1, 4, 1, 2, 3, 1];
  let curX = x;
  const totalUnits = pattern.reduce((a, b) => a + b, 0) + (pattern.length - 1) * 2;
  const unitWidth = w / totalUnits;
  pattern.forEach((barUnits) => {
    const barWidth = Math.max(1, barUnits * unitWidth);
    ctx.fillRect(curX, y, barWidth, h);
    curX += barWidth + 2 * unitWidth;
  });
  ctx.restore();
}

/**
 * วาดรูปหัวใจลายเส้นตรงมุมการ์ด
 */
function drawDoodleHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color = '#e4c4bd'
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const topCurveHeight = size * 0.35;
  ctx.moveTo(cx, cy + topCurveHeight);
  ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + topCurveHeight);
  ctx.bezierCurveTo(cx - size / 2, cy + (size + topCurveHeight) / 2, cx, cy + (size + topCurveHeight) / 2, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + (size + topCurveHeight) / 2, cx + size / 2, cy + (size + topCurveHeight) / 2, cx + size / 2, cy + topCurveHeight);
  ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + topCurveHeight);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * วาดรูปดอกไม้ 5 กลีบลายเส้นตรงมุมการ์ด
 */
function drawDoodleFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color = '#e4c4bd'
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  const numPetals = 5;
  for (let i = 0; i < numPetals; i++) {
    const angle = (i * 2 * Math.PI) / numPetals;
    const px = cx + Math.cos(angle) * (radius * 0.55);
    const py = cy + Math.sin(angle) * (radius * 0.55);
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * ดีไซน์สลิป/ใบเสร็จทางการสไตล์ qokhims
 * - คงรูปแบบการ์ดใบเสร็จดั้งเดิมที่ลูกค้าชื่นชอบ (Official Order Receipt)
 * - มีกล่องชื่อลูกค้าและช่องทางติดต่อคู่กัน
 * - มีหัวตาราง รายการ (ITEM DESCRIPTION) และ ราคา (AMOUNT)
 * - สรุปยอดรวมประเมินทั้งสิ้น พร้อมตราประทับ "ขอบคุณค่ะ ♡"
 * - ด้านล่าง: ใส่ QR Code พร้อมเพย์แทนบาร์โค้ดตามความต้องการของลูกค้า
 */
export function drawQokhimsReceiptToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderReceiptOptions
): void {
  const width = 720;
  const paddingX = 48;
  const contentWidth = width - paddingX * 2; // 624px

  const hasNote = Boolean(options.billNote && options.billNote.trim());
  const includeQr = options.includeQr !== false;

  // คำนวณความสูงตามจำนวนรายการสินค้าจริง
  let calculatedHeight = 500; // ส่วนหัว, กล่องลูกค้า, สรุปยอด, ตราประทับ
  options.items.forEach((it) => {
    calculatedHeight += it.item_note && it.item_note.trim() ? 60 : 50;
  });
  if (options.discountAmount && options.discountAmount > 0) {
    calculatedHeight += 32;
  }
  if (hasNote) {
    calculatedHeight += 70;
  }
  if (includeQr) {
    calculatedHeight += 300; // QR Code พร้อมเพย์ + บัญชีธนาคาร + โซเชียล
  } else {
    calculatedHeight += 110; // บาร์โค้ดตกแต่ง + โซเชียล
  }

  canvas.width = width;
  canvas.height = calculatedHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. พื้นหลังการ์ดสีขาวสะอาดตา พร้อมกรอบการ์ดโค้งมน
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, calculatedHeight);

  // ขอบนอกการ์ดใบเสร็จ
  ctx.strokeStyle = '#e8d8d3';
  ctx.lineWidth = 2;
  drawRoundedBox(ctx, 16, 16, width - 32, calculatedHeight - 32, 24, false, true);

  // ลายเส้นมุมการ์ดน่ารัก (Heart top-right, Flower bottom-left)
  drawDoodleHeart(ctx, width - 42, 34, 16, '#e0cfc8');
  drawDoodleFlower(ctx, 42, calculatedHeight - 44, 12, '#e0cfc8');

  // 2. ป้ายหัวการ์ด "🏷️ OFFICIAL ORDER RECEIPT"
  let curY = 48;
  const badgeText = '🏷️ OFFICIAL ORDER RECEIPT';
  ctx.font = 'bold 12px "Prompt", sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 30;
  const badgeX = (width - badgeW) / 2;

  ctx.fillStyle = '#fcebf0';
  ctx.strokeStyle = '#f8cad7';
  ctx.lineWidth = 1;
  drawRoundedBox(ctx, badgeX, curY - 14, badgeW, 26, 13, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d9537f';
  ctx.fillText(badgeText, width / 2, curY + 4);

  // 3. ชื่อร้านและรหัสใบสั่งซื้อ
  curY += 44;
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 28px "Prompt", sans-serif';
  const siteTitle = `✿ ${options.siteName || 'qokhims'} studio ✿`;
  ctx.fillText(siteTitle, width / 2, curY);

  curY += 24;
  ctx.fillStyle = '#8c6b61';
  ctx.font = '500 13px "Prompt", sans-serif';
  const orderSub = `รหัสใบสั่งซื้อ: ${options.orderCode || 'DRAFT-PREVIEW'} · ${options.billDate}${
    options.billTime ? ` ${options.billTime}` : ''
  }`;
  ctx.fillText(orderSub, width / 2, curY);

  // 4. สองกล่องข้อมูลคู่กัน: ชื่อลูกค้า (CUSTOMER) & ช่องทางติดต่อ (CONTACT)
  curY += 26;
  const boxGap = 16;
  const boxW = (contentWidth - boxGap) / 2;
  const boxH = 68;
  const leftBoxX = paddingX;
  const rightBoxX = paddingX + boxW + boxGap;

  // กล่องซ้าย: ชื่อลูกค้า
  ctx.fillStyle = '#fdf8f5';
  ctx.strokeStyle = '#f2e4dc';
  ctx.lineWidth = 1;
  drawRoundedBox(ctx, leftBoxX, curY, boxW, boxH, 14, true, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#9c7d74';
  ctx.font = '500 11px "Prompt", sans-serif';
  ctx.fillText('ชื่อลูกค้า (CUSTOMER)', leftBoxX + 18, curY + 24);

  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 15px "Prompt", sans-serif';
  const custNameStr = truncateText(ctx, options.customerName || 'ลูกค้า qokhims', boxW - 36);
  ctx.fillText(custNameStr, leftBoxX + 18, curY + 48);

  // กล่องขวา: ช่องทางติดต่อ
  ctx.fillStyle = '#fdf8f5';
  ctx.strokeStyle = '#f2e4dc';
  ctx.lineWidth = 1;
  drawRoundedBox(ctx, rightBoxX, curY, boxW, boxH, 14, true, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#9c7d74';
  ctx.font = '500 11px "Prompt", sans-serif';
  const rightHeaderLabel =
    options.showDueDate && options.dueDate
      ? 'วันส่งงาน (DUE DATE)'
      : 'ช่องทางติดต่อ (CONTACT)';
  ctx.fillText(rightHeaderLabel, rightBoxX + 18, curY + 24);

  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 15px "Prompt", sans-serif';
  const rightValueStr =
    options.showDueDate && options.dueDate
      ? options.dueDate
      : options.customerContact || options.customerEmail || 'LINE / IG';
  ctx.fillText(truncateText(ctx, rightValueStr, boxW - 36), rightBoxX + 18, curY + 48);

  curY += boxH + 28;

  // 5. หัวตารางรายการ (ITEM DESCRIPTION / AMOUNT)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8c6b61';
  ctx.font = 'bold 12px "Prompt", sans-serif';
  ctx.fillText('รายการ (ITEM DESCRIPTION)', paddingX, curY);

  ctx.textAlign = 'right';
  ctx.fillText('ราคา (AMOUNT)', width - paddingX, curY);

  curY += 12;
  drawDashedLine(ctx, paddingX, curY, width - paddingX, curY, [5, 4], '#e8d8d3');

  // 6. รายการสินค้า
  curY += 24;
  options.items.forEach((it, idx) => {
    // บรรทัดชื่อรายการ + xจำนวน
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a3228';
    ctx.font = 'bold 15px "Prompt", sans-serif';
    const itemPrefix = `${idx + 1}. ${it.product_title}`;
    const truncatedTitle = truncateText(ctx, itemPrefix, contentWidth - 160);
    ctx.fillText(truncatedTitle, paddingX, curY);

    // ป้ายจำนวนสีชมพู (เช่น x1)
    const titleWidth = ctx.measureText(truncatedTitle).width;
    ctx.fillStyle = '#ec7a9a';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText(` x${it.quantity}`, paddingX + titleWidth + 6, curY);

    // ราคาด้านขวา
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4a3228';
    ctx.font = 'bold 15px "Prompt", sans-serif';
    const itemAmountStr = `฿${(it.quantity * it.unit_price).toFixed(0)}`;
    ctx.fillText(itemAmountStr, width - paddingX, curY);

    // บรรทัดหมายเหตุย่อย
    curY += 18;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8c6b61';
    ctx.font = '500 12px "Prompt", sans-serif';

    const defaultFontNote =
      it.category_type === 'font' || it.product_title.includes('ฟอนต์')
        ? 'รับไฟล์ฟอนต์ครบชุด (.TTF / .OTF / .WOFF2)'
        : '';
    const noteText = it.item_note && it.item_note.trim() ? it.item_note.trim() : defaultFontNote;

    if (noteText) {
      const noteLine = truncateText(ctx, `หมายเหตุ: ${noteText}`, contentWidth - 40);
      ctx.fillText(noteLine, paddingX, curY);
      curY += 24;
    } else {
      curY += 14;
    }
  });

  // 7. กล่องหมายเหตุพิเศษของบิล (ถ้ามี)
  if (hasNote && options.billNote) {
    curY += 2;
    const noteLines = wrapText(ctx, options.billNote.trim(), contentWidth - 40);
    const noteBoxH = Math.max(42, noteLines.length * 18 + 22);

    ctx.fillStyle = '#fff9fb';
    ctx.strokeStyle = '#f8dbe4';
    ctx.lineWidth = 1;
    drawRoundedBox(ctx, paddingX, curY, contentWidth, noteBoxH, 10, true, true);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#d9537f';
    ctx.font = 'bold 12px "Prompt", sans-serif';
    ctx.fillText('📝 หมายเหตุ:', paddingX + 14, curY + 18);

    ctx.fillStyle = '#6b4c41';
    ctx.font = '500 12px "Prompt", sans-serif';
    noteLines.forEach((line, lIdx) => {
      ctx.fillText(line, paddingX + 90, curY + 18 + lIdx * 18);
    });

    curY += noteBoxH + 14;
  }

  // 8. ส่วนลด (ถ้ามี)
  const discount = Number(options.discountAmount) || 0;
  if (discount > 0) {
    curY += 4;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e05d82';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText(options.discountLabel || 'ส่วนลดพิเศษ (DISCOUNT)', paddingX, curY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 14px "Prompt", sans-serif';
    ctx.fillText(`-฿${discount.toFixed(0)}`, width - paddingX, curY);
    curY += 18;
  }

  // เส้นประคั่นก่อนสรุปยอด
  curY += 6;
  drawDashedLine(ctx, paddingX, curY, width - paddingX, curY, [5, 4], '#e8d8d3');
  curY += 24;

  // 9. ส่วนสรุปยอดรวม (TOTAL) ด้านซ้าย & ตราประทับ "ขอบคุณค่ะ ♡" ด้านขวา
  const totalSectionY = curY;

  // ฝั่งซ้าย: ยอดรวมประเมินทั้งสิ้น
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8c6b61';
  ctx.font = 'bold 13px "Prompt", sans-serif';
  ctx.fillText('ยอดรวมประเมินทั้งสิ้น (TOTAL)', paddingX, totalSectionY + 6);

  // ตัวเลขยอดเงินสีชมพูตัวใหญ่ + บาท
  const totalNumberStr = `฿${options.netTotal.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
  ctx.fillStyle = '#e05d82';
  ctx.font = 'bold 32px "Prompt", sans-serif';
  ctx.fillText(totalNumberStr, paddingX, totalSectionY + 42);

  const numWidth = ctx.measureText(totalNumberStr).width;
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 16px "Prompt", sans-serif';
  ctx.fillText(' บาท', paddingX + numWidth + 4, totalSectionY + 42);

  // ฝั่งขวา: ตราประทับ "ขอบคุณค่ะ ♡ / qokhims"
  const stampW = 142;
  const stampH = 62;
  const stampX = width - paddingX - stampW;
  const stampY = totalSectionY - 6;

  drawDashedRoundedBox(
    ctx,
    stampX,
    stampY,
    stampW,
    stampH,
    14,
    [4, 3],
    '#f298b4',
    '#fff7f9'
  );

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e05d82';
  ctx.font = 'bold 14px "Prompt", sans-serif';
  ctx.fillText('ขอบคุณค่ะ ♡', stampX + stampW / 2, stampY + 26);

  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 12px "Prompt", sans-serif';
  ctx.fillText(options.siteName || 'qokhims', stampX + stampW / 2, stampY + 48);

  curY = totalSectionY + 64;

  // 10. ส่วนท้ายบิล: ใส่ QR Code พร้อมเพย์แทนบาร์โค้ดตามความต้องการของลูกค้า
  if (includeQr) {
    curY += 12;
    // กล่องสำหรับแสดง QR Code และข้อมูลโอนเงิน
    const qrSize = 148;
    const qrX = (width - qrSize) / 2;

    try {
      const ppTarget = options.promptPayNumber || '0812345678';
      const ppPayload = generatePromptPayPayload(ppTarget, options.netTotal);
      const qrMatrix = createQrMatrix(ppPayload);
      drawQrToCanvas(ctx, qrMatrix, qrX, curY, qrSize, '#4a3228', '#ffffff');
    } catch {
      // fallback
    }

    curY += qrSize + 18;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3228';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText('สแกน QR เพื่อชำระเงินผ่านพร้อมเพย์', width / 2, curY);

    curY += 18;
    ctx.fillStyle = '#8c6b61';
    ctx.font = '500 12px "Prompt", sans-serif';
    const bankStr = `${options.bankName || 'ธนาคารกสิกรไทย'} : ${options.bankAccountNumber || '123-4-56789-0'}`;
    ctx.fillText(bankStr, width / 2, curY);

    curY += 17;
    ctx.fillText(`ชื่อบัญชี : ${options.bankAccountName || 'qokhims'}`, width / 2, curY);

    curY += 18;
    ctx.fillStyle = '#8c6b61';
    ctx.font = '500 12px "Prompt", sans-serif';
    ctx.fillText(`♡ LINE Official: @280npxvj · IG: @${options.siteName || 'qokhims'} ✧`, width / 2, curY);

    curY += 18;
    ctx.fillStyle = '#e05d82';
    ctx.font = 'bold 12px "Prompt", sans-serif';
    ctx.fillText('แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡', width / 2, curY);
  } else {
    // กรณีเลือกแยกการ์ด QR: แสดงบาร์โค้ดตกแต่งแบบเดิม
    curY += 14;
    const barcodeW = 230;
    const barcodeH = 34;
    const barcodeX = (width - barcodeW) / 2;
    drawDecorativeBarcode(ctx, barcodeX, curY, barcodeW, barcodeH, '#8c6b61');

    curY += barcodeH + 16;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8c6b61';
    ctx.font = '500 12px "Prompt", sans-serif';
    ctx.fillText(`♡ LINE Official: @280npxvj · IG: @${options.siteName || 'qokhims'} ✧`, width / 2, curY);

    curY += 18;
    ctx.fillStyle = '#e05d82';
    ctx.font = 'bold 12px "Prompt", sans-serif';
    ctx.fillText('แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡', width / 2, curY);
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

  ctx.strokeStyle = '#e8d8d3';
  ctx.lineWidth = 2;
  drawRoundedBox(ctx, 14, 14, width - 28, height - 28, 20, false, true);

  drawDoodleHeart(ctx, width - 36, 30, 14, '#e0cfc8');
  drawDoodleFlower(ctx, 36, height - 36, 10, '#e0cfc8');

  let curY = 46;
  ctx.textAlign = 'center';

  // ป้ายหัวการ์ด
  ctx.fillStyle = '#fcebf0';
  ctx.strokeStyle = '#f8cad7';
  ctx.lineWidth = 1;
  const badgeText = `🌸 ${options.siteName ? options.siteName.toUpperCase() : 'QOKHIMS'} • PROMPTPAY QR`;
  ctx.font = 'bold 12px "Prompt", sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 24;
  drawRoundedBox(ctx, (width - badgeW) / 2, curY - 14, badgeW, 24, 12, true, true);
  ctx.fillStyle = '#d9537f';
  ctx.fillText(badgeText, width / 2, curY + 2);

  // ยอดเงินชำระ
  curY += 38;
  ctx.fillStyle = '#4a3228';
  ctx.font = '600 14px "Prompt", sans-serif';
  ctx.fillText('สแกน QR เพื่อชำระเงิน', width / 2, curY);

  curY += 28;
  ctx.font = 'bold 28px "Prompt", sans-serif';
  ctx.fillStyle = '#e05d82';
  ctx.fillText(
    `฿${options.netTotal.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} บาท`,
    width / 2,
    curY
  );

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

  curY += 20;
  ctx.fillStyle = '#8c6b61';
  ctx.font = '500 11px "Prompt", sans-serif';
  ctx.fillText(`♡ LINE Official: @280npxvj · IG: @${options.siteName || 'qokhims'} ✧`, width / 2, curY);

  curY += 18;
  ctx.fillStyle = '#e05d82';
  ctx.font = 'bold 11px "Prompt", sans-serif';
  ctx.fillText('แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡', width / 2, curY);
}
