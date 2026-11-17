import React, { useRef, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { CardCornerDoodle } from './Decorations';
import { generatePromptPayPayload, createQrMatrix, drawQrToCanvas } from '../../utils/qr';

export interface ReceiptItemDisplay {
  product_title: string;
  category_type?: 'font' | 'service';
  quantity: number;
  unit_price: number;
  item_note?: string;
}

export interface OfficialOrderReceiptCardProps {
  siteName: string;
  orderCode?: string;
  billDate?: string;
  customerName: string;
  customerContact: string;
  items: ReceiptItemDisplay[];
  totalAmount: number;
  promptPayNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  onEditContact?: () => void;
}

export const OfficialOrderReceiptCard: React.FC<OfficialOrderReceiptCardProps> = ({
  siteName,
  orderCode,
  billDate,
  customerName,
  customerContact,
  items,
  totalAmount,
  promptPayNumber,
  bankName,
  bankAccountNumber,
  bankAccountName,
  onEditContact,
}) => {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const displayDate =
    billDate ||
    new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const displayOrderCode = orderCode || 'DRAFT-PREVIEW';
  const cleanPp = (promptPayNumber || '0812345678').trim();

  useEffect(() => {
    if (!qrCanvasRef.current) return;
    try {
      const payload = generatePromptPayPayload(cleanPp, totalAmount);
      const matrix = createQrMatrix(payload);
      const canvas = qrCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawQrToCanvas(ctx, matrix, 0, 0, canvas.width, '#4a3228', '#ffffff');
      }
    } catch (err) {
      console.error('Failed to draw QR matrix:', err);
    }
  }, [cleanPp, totalAmount]);

  return (
    <div className="relative bg-white rounded-[2rem] border-2 border-[#e8d8d3] p-6 sm:p-9 shadow-md text-left space-y-6 overflow-hidden">
      {/* ลายเส้นมุมการ์ดน่ารัก (Heart บนขวา, Flower ล่างซ้าย) */}
      <CardCornerDoodle corner="top-right" variant="heart" />
      <CardCornerDoodle corner="bottom-left" variant="flower" />

      {/* 1. ป้ายหัวการ์ด 🏷️ OFFICIAL ORDER RECEIPT */}
      <div className="flex justify-center">
        <span className="px-4 py-1 rounded-full bg-[#fcebf0] border border-[#f8cad7] text-xs font-bold text-[#d9537f] inline-flex items-center gap-1.5 shadow-2xs">
          <Receipt className="w-3.5 h-3.5" />
          OFFICIAL ORDER RECEIPT
        </span>
      </div>

      {/* 2. หัวข้อร้าน & รหัสใบสั่งซื้อ */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#4a3228] tracking-tight">
          ✿ {siteName || 'qokhims'} studio ✿
        </h2>
        <p className="text-xs sm:text-sm font-medium text-[#8c6b61]">
          รหัสใบสั่งซื้อ: <span className="font-mono font-bold">{displayOrderCode}</span> · {displayDate}
        </p>
      </div>

      {/* 3. กล่องข้อมูลลูกค้า 2 ช่องคู่กัน */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* กล่องซ้าย: ชื่อลูกค้า (CUSTOMER) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#fdf8f5] border border-[#f2e4dc] space-y-1">
          <span className="text-[11px] font-semibold text-[#9c7d74] block">
            ชื่อลูกค้า (CUSTOMER)
          </span>
          <div className="text-sm sm:text-base font-bold text-[#4a3228] truncate">
            {customerName.trim() || 'ลูกค้า qokhims'}
          </div>
        </div>

        {/* กล่องขวา: ช่องทางติดต่อ (CONTACT) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#fdf8f5] border border-[#f2e4dc] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#9c7d74] block">
              ช่องทางติดต่อ (CONTACT)
            </span>
            {onEditContact && (
              <button
                type="button"
                onClick={onEditContact}
                className="text-[11px] text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                แก้ไข
              </button>
            )}
          </div>
          <div className="text-sm sm:text-base font-bold text-[#4a3228] truncate">
            {customerContact.trim() || 'LINE / IG'}
          </div>
        </div>
      </div>

      {/* 4. หัวตาราง รายการ (ITEM DESCRIPTION) / ราคา (AMOUNT) */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center text-xs font-bold text-[#8c6b61] px-0.5">
          <span>รายการ (ITEM DESCRIPTION)</span>
          <span>ราคา (AMOUNT)</span>
        </div>
        <div className="border-t border-dashed border-[#e8d8d3]" />
      </div>

      {/* 5. รายการสินค้า */}
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between items-baseline gap-2">
              <div className="font-bold text-[#4a3228]">
                <span>{idx + 1}. {item.product_title}</span>
                <span className="text-[#ec7a9a] font-bold ml-1.5">x{item.quantity}</span>
              </div>
              <div className="font-bold text-[#4a3228] shrink-0 text-sm sm:text-base">
                ฿{(item.quantity * item.unit_price).toLocaleString('th-TH')}
              </div>
            </div>
            <div className="text-[#8c6b61] text-[11px] sm:text-xs">
              หมายเหตุ: {item.item_note || (item.category_type === 'font' || item.product_title.includes('ฟอนต์') ? 'รับไฟล์ฟอนต์ครบชุด (.TTF / .OTF / .WOFF2)' : 'งานออกแบบตามบรีฟ')}
            </div>
          </div>
        ))}
      </div>

      {/* เส้นคั่นประ */}
      <div className="border-t border-dashed border-[#e8d8d3]" />

      {/* 6. สรุปยอดรวม (TOTAL) & ตราประทับ ขอบคุณค่ะ ♡ */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-[#8c6b61] block">
            ยอดรวมประเมินทั้งสิ้น (TOTAL)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-4xl font-extrabold text-[#ec7a9a]">
              ฿{totalAmount.toLocaleString('th-TH')}
            </span>
            <span className="text-sm sm:text-base font-bold text-[#4a3228]">
              บาท
            </span>
          </div>
        </div>

        {/* ตราประทับ ขอบคุณค่ะ ♡ / qokhims */}
        <div className="px-4 py-2.5 rounded-2xl border-2 border-dashed border-[#f3a6be] bg-[#fff6f8] text-center shadow-2xs shrink-0">
          <div className="text-xs sm:text-sm font-bold text-[#e05d82]">
            ขอบคุณค่ะ ♡
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-[#4a3228]">
            {siteName || 'qokhims'}
          </div>
        </div>
      </div>

      {/* 7. ส่วนล่างของการ์ด (กรอบสีแดงในภาพเดิม): PromptPay QR Code + ข้อมูลบัญชี */}
      <div className="pt-5 border-t border-dashed border-[#e8d8d3] text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-white border-2 border-[#e8d8d3] shadow-xs inline-block">
            <canvas
              ref={qrCanvasRef}
              width={180}
              height={180}
              className="w-40 h-40 sm:w-44 sm:h-44 rounded-xl block"
              aria-label="PromptPay QR Code"
            />
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <p className="font-bold text-[#4a3228] text-xs sm:text-sm">
            สแกน QR เพื่อชำระเงินผ่านพร้อมเพย์ (฿{totalAmount.toLocaleString('th-TH')} บาท)
          </p>
          <p className="text-[#8c6b61]">
            {bankName || 'ธนาคารกสิกรไทย (KBANK)'} :{' '}
            <span className="font-mono font-bold text-[#4a3228]">
              {bankAccountNumber || '123-4-56789-0'}
            </span>
          </p>
          <p className="text-[#8c6b61]">
            ชื่อบัญชี :{' '}
            <span className="font-semibold text-[#4a3228]">
              {bankAccountName || 'น.ส. พักตร์ปรียา (qokhims)'}
            </span>
          </p>
          <p className="text-[#8c6b61]">
            ♡ LINE Official: @280npxvj · IG: @{siteName || 'qokhims'} ✧
          </p>
          <p className="font-bold text-[#e05d82]">
            แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡
          </p>
        </div>
      </div>
    </div>
  );
};
