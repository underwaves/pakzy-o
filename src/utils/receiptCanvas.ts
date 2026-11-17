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
  billDate: string; // e.g. '16 พ.ย. 2569' or '16/11/2569'
  billTime: string; // e.g. '18:45'
  customerName: string;
  customerContact?: string;
  customerEmail?: string;
  dueDate?: string; // วันรับ/ส่งงาน
  items: ReceiptItem[];
  discountAmount?: number;
  netTotal: number;
  promptPayNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  showDueDate?: boolean;
}

/**
 * ฟังก์ชันวาดรูปใบเสร็จ / บิล ตามดีไซน์ qokhims (สไตล์เดียวกับใน mockup ของลูกค้า)
 * ใช้ร่วมกันระหว่าง หน้าสั่งซื้อฝั่งลูกค้า (/order) และ หน้าสร้างบิลหลังบ้าน (/admin/bills)
 */
export function drawQokhimsReceiptToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderReceiptOptions
): void {
  const width = 680;
  const baseHeight = 720;
  const itemRowsHeight = options.items.length * 56;
  const height = baseHeight + itemRowsHeight;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. พื้นหลังสีขาวสะอาด
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. ส่วนหัวร้าน (Header)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 30px "Prompt", sans-serif';
  ctx.fillText(options.siteName || 'pakzy.o', width / 2, 70);

  ctx.fillStyle = '#8c6b61';
  ctx.font = '500 14px "Prompt", sans-serif';
  ctx.fillText(options.tagline || 'Font by pakzy 🌸 รับออกแบบงานต่างๆ', width / 2, 98);

  // 3. ข้อมูลคำสั่งซื้อ (Meta Info Grid)
  let curY = 145;
  ctx.fillStyle = '#4a3228';
  ctx.font = '600 14px "Prompt", sans-serif';

  // วันที่ & เวลา
  ctx.textAlign = 'left';
  ctx.fillText(`วันที่ : ${options.billDate}`, 48, curY);
  ctx.textAlign = 'right';
  ctx.fillText(`เวลา : ${options.billTime}`, width - 48, curY);

  curY += 28;
  ctx.textAlign = 'left';
  ctx.fillText(`ลูกค้า : ${options.customerName || '-'}`, 48, curY);
  if (options.customerEmail && options.customerEmail.trim()) {
    ctx.textAlign = 'right';
    ctx.font = '500 13px "Prompt", sans-serif';
    ctx.fillStyle = '#8c6b61';
    ctx.fillText(`อีเมล : ${options.customerEmail.trim()}`, width - 48, curY);
    ctx.font = '600 14px "Prompt", sans-serif';
    ctx.fillStyle = '#4a3228';
  }

  if (options.showDueDate || options.dueDate) {
    curY += 28;
    ctx.textAlign = 'left';
    ctx.fillText(`วันรับ/ส่งงาน :`, 48, curY);
    ctx.textAlign = 'right';
    ctx.fillText(`${options.dueDate || '-'}`, width - 48, curY);
  } else if (options.orderCode) {
    curY += 28;
    ctx.textAlign = 'left';
    ctx.fillText(`รหัสออเดอร์ :`, 48, curY);
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px "Prompt", sans-serif';
    ctx.fillStyle = '#ec7a9a';
    ctx.fillText(`${options.orderCode}`, width - 48, curY);
    ctx.fillStyle = '#4a3228';
  }

  // 4. เส้นคั่นบาง
  curY += 24;
  ctx.strokeStyle = '#e8d8d3';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, curY);
  ctx.lineTo(width - 48, curY);
  ctx.stroke();

  // 5. รายการสินค้า (Items)
  curY += 34;
  options.items.forEach((it) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a3228';
    ctx.font = 'bold 15px "Prompt", sans-serif';
    ctx.fillText(`${it.product_title}`, 48, curY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 15px "Prompt", sans-serif';
    ctx.fillText((it.quantity * it.unit_price).toFixed(2), width - 48, curY);

    curY += 20;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9c7d74';
    ctx.font = '13px "Prompt", sans-serif';
    ctx.fillText(`@${it.unit_price.toFixed(2)} x ${it.quantity}`, 48, curY);

    curY += 32;
  });

  // 6. ส่วนลด (ถ้ามี)
  const discount = Number(options.discountAmount) || 0;
  if (discount > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ec7a9a';
    ctx.font = 'bold 14px "Prompt", sans-serif';
    ctx.fillText(`ส่วนลดพิเศษ (Discount)`, 48, curY);

    ctx.textAlign = 'right';
    ctx.fillText(`-${discount.toFixed(2)}`, width - 48, curY);
    curY += 28;
  }

  // เส้นคั่นก่อนยอดรวม
  ctx.strokeStyle = '#e8d8d3';
  ctx.beginPath();
  ctx.moveTo(48, curY);
  ctx.lineTo(width - 48, curY);
  ctx.stroke();

  // 7. ยอดรวม N รายการ
  curY += 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 14px "Prompt", sans-serif';
  ctx.fillText(`ยอดรวม ${options.items.length} รายการ`, 48, curY);

  ctx.textAlign = 'right';
  ctx.fillText(`${options.netTotal.toFixed(2)}`, width - 48, curY);

  // 8. กล่องชมพูไฮไลต์ "รวมทั้งสิ้น"
  curY += 20;
  const boxX = 48;
  const boxW = width - 96;
  const boxH = 54;
  ctx.fillStyle = '#fcebf0';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(boxX, curY, boxW, boxH, 12);
  } else {
    ctx.rect(boxX, curY, boxW, boxH);
  }
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 18px "Prompt", sans-serif';
  ctx.fillText('รวมทั้งสิ้น', boxX + 24, curY + 34);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 22px "Prompt", sans-serif';
  ctx.fillText(`${options.netTotal.toFixed(2)}`, boxX + boxW - 24, curY + 35);

  // 9. ข้อมูลเลขบัญชีธนาคาร
  curY += boxH + 24;
  const bankBoxX = 48;
  const bankBoxW = width - 96;
  const bankBoxH = 50;
  ctx.fillStyle = '#fdf4f7';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(bankBoxX, curY, bankBoxW, bankBoxH, 10);
  } else {
    ctx.rect(bankBoxX, curY, bankBoxW, bankBoxH);
  }
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 14px "Prompt", sans-serif';
  ctx.fillText(
    `${options.bankName || 'กสิกรไทย'} : ${options.bankAccountNumber || '123-4-56789-0'}`,
    width / 2,
    curY + 22
  );
  ctx.font = '12px "Prompt", sans-serif';
  ctx.fillStyle = '#8c6b61';
  ctx.fillText(
    `ชื่อบัญชี : ${options.bankAccountName || 'pakzy.o'}`,
    width / 2,
    curY + 40
  );

  // 10. QR Code PromptPay ตรงกลาง
  curY += bankBoxH + 22;
  const qrSize = 150;
  const qrX = (width - qrSize) / 2;
  try {
    const ppTarget = options.promptPayNumber || '0812345678';
    const ppPayload = generatePromptPayPayload(ppTarget, options.netTotal);
    const qrMatrix = createQrMatrix(ppPayload);
    drawQrToCanvas(ctx, qrMatrix, qrX, curY, qrSize, '#4a3228', '#ffffff');
  } catch {
    // fallback
  }

  // 11. ข้อความสแกนและเงื่อนไขท้ายบิล
  curY += qrSize + 22;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 13px "Prompt", sans-serif';
  ctx.fillText('สแกนเพื่อชำระเงิน', width / 2, curY);

  curY += 20;
  ctx.fillStyle = '#e05d82';
  ctx.font = '11px "Prompt", sans-serif';
  ctx.fillText('แจ้งหลักฐานการชำระเงินทุกครั้ง ♡', width / 2, curY);

  curY += 16;
  ctx.fillStyle = '#8c6b61';
  ctx.font = '10px "Prompt", sans-serif';
  ctx.fillText('ไม่ชำระเงินใน 1 ชั่วโมง สอบถามคิวอีกรอบนะคะ', width / 2, curY);

  curY += 24;
  ctx.fillStyle = '#4a3228';
  ctx.font = 'bold 13px "Prompt", sans-serif';
  ctx.fillText('- THANK YOU -', width / 2, curY);
}
