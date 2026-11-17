import React, { useRef, useEffect } from 'react';
import { Copy, Check, QrCode, Upload, Image as ImageIcon, X } from 'lucide-react';
import { generatePromptPayPayload, createQrMatrix, drawQrToCanvas } from '../../utils/qr';
import { useToast } from '../../context/ToastContext';
import { CuteHeart, CuteFlower, CuteSparkle } from './Decorations';

interface PromptPayQrCardProps {
  amount: number;
  promptPayNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  slipFile: File | null;
  slipPreviewUrl: string | null;
  onSlipSelect: (file: File | null) => void;
  uploadingSlip?: boolean;
}

export const PromptPayQrCard: React.FC<PromptPayQrCardProps> = ({
  amount,
  promptPayNumber = '0812345678',
  bankName = 'ธนาคารกสิกรไทย (KBANK)',
  bankAccountNumber = '123-4-56789-0',
  bankAccountName = 'น.ส. พักตร์ปรียา (qokhims)',
  slipFile,
  slipPreviewUrl,
  onSlipSelect,
  uploadingSlip = false,
}) => {
  const { showToast } = useToast();
  const [copiedBank, setCopiedBank] = React.useState(false);
  const [copiedPp, setCopiedPp] = React.useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cleanPp = promptPayNumber.trim() || '0812345678';

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const payload = generatePromptPayPayload(cleanPp, amount);
      const matrix = createQrMatrix(payload);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawQrToCanvas(ctx, matrix, 0, 0, canvas.width, '#4a3228', '#ffffff');
      }
    } catch (err) {
      console.error('Failed to draw QR:', err);
    }
  }, [cleanPp, amount]);

  const copyToClipboard = (text: string, isBank: boolean) => {
    const clean = text.replace(/[^0-9]/g, '');
    navigator.clipboard.writeText(clean).then(() => {
      if (isBank) {
        setCopiedBank(true);
        setTimeout(() => setCopiedBank(false), 3000);
      } else {
        setCopiedPp(true);
        setTimeout(() => setCopiedPp(false), 3000);
      }
      showToast('คัดลอกเลขบัญชีแล้วค่ะ ♡', 'success');
    }).catch(() => {
      showToast('ไม่สามารถคัดลอกได้ กรุณาคัดลอกด้วยตนเองนะคะ', 'error');
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้นค่ะ (.jpg, .png, .webp)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB ค่ะ', 'error');
      return;
    }
    onSlipSelect(file);
    showToast('เลือกรูปสลิปเรียบร้อยแล้วค่ะ ♡', 'info');
  };

  return (
    <div className="bg-white rounded-[2rem] border-2 border-[var(--color-secondary)]/85 p-6 sm:p-8 space-y-6 shadow-md">
      {/* ส่วนหัวการชำระเงิน */}
      <div className="text-center space-y-1.5 border-b-2 border-dashed border-[var(--color-border)] pb-5">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold border border-[var(--color-border)]">
          <QrCode className="w-3.5 h-3.5" /> PROMPTPAY & BANK TRANSFER
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-secondary)]">
          สแกนจ่ายผ่าน QR Code หรือโอนเงิน
        </h3>
        <p className="text-xs text-[var(--color-secondary-muted)]">
          รองรับทุกแอปธนาคาร ยอดโอนตรงตามระบบ ไม่ต้องรอร้านตอบกลับค่ะ ♡
        </p>
      </div>

      {/* ยอดเงินที่ต้องชำระ */}
      <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/75 border border-[var(--color-primary)]/40 flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
          <CuteFlower className="w-4 h-4" /> ยอดเงินที่ต้องโอนชำระ:
        </span>
        <span className="text-2xl sm:text-3xl font-extrabold text-[var(--color-primary)]">
          ฿{amount.toLocaleString('th-TH')}{' '}
          <span className="text-xs font-bold text-[var(--color-secondary)]">บาท</span>
        </span>
      </div>

      {/* บล็อก QR Code และรายละเอียดบัญชี */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* คอลัมน์ QR Code */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
          <div className="p-2.5 rounded-2xl bg-white border-2 border-[var(--color-secondary)]/30 shadow-2xs">
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              className="w-44 h-44 rounded-xl block"
              aria-label="QR Code พร้อมเพย์สำหรับสแกนชำระเงิน"
            />
          </div>
          <span className="text-xs font-bold text-[var(--color-secondary)] mt-2 flex items-center gap-1">
            <CuteHeart className="w-3.5 h-3.5" /> สแกนเพื่อชำระเงิน
          </span>
          <span className="text-[11px] text-[var(--color-secondary-muted)]">
            PromptPay: {cleanPp}
          </span>
        </div>

        {/* คอลัมน์ข้อมูลบัญชีธนาคาร */}
        <div className="md:col-span-7 space-y-3.5">
          {/* ข้อมูลบัญชีธนาคาร */}
          <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
            <span className="text-xs font-bold text-[var(--color-secondary)] block">
              🏦 โอนผ่านบัญชีธนาคาร:
            </span>
            <div className="space-y-1 text-xs sm:text-sm text-[var(--color-secondary)]">
              <p className="font-semibold text-[var(--color-primary)]">
                {bankName}
              </p>
              <div className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-[var(--color-border)]">
                <span className="font-mono font-bold tracking-wider text-sm sm:text-base">
                  {bankAccountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankAccountNumber, true)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedBank ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBank ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </button>
              </div>
              <p className="text-xs text-[var(--color-secondary-muted)]">
                ชื่อบัญชี: <strong className="text-[var(--color-secondary)]">{bankAccountName}</strong>
              </p>
            </div>
          </div>

          {/* ข้อมูลพร้อมเพย์ (ตัวเลือกสำรอง) */}
          <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-secondary)]">
            <div>
              <span className="text-[11px] text-[var(--color-secondary-muted)] block">
                หรือโอนด้วยเบอร์พร้อมเพย์:
              </span>
              <strong className="font-mono text-sm">{cleanPp}</strong>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(cleanPp, false)}
              className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              {copiedPp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPp ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          </div>
        </div>
      </div>

      {/* ส่วนอัปโหลดสลิปโอนเงิน */}
      <div className="space-y-3 pt-2 border-t-2 border-dashed border-[var(--color-border)]">
        <label className="block text-xs sm:text-sm font-bold text-[var(--color-secondary)]">
          📸 แนบหลักฐานการโอนเงิน (สลิป) <span className="text-red-500">*</span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="slip-upload-input"
        />

        {slipPreviewUrl ? (
          <div className="relative p-4 rounded-2xl bg-[var(--color-bg)] border-2 border-[var(--color-primary)] flex items-center gap-4">
            <img
              src={slipPreviewUrl}
              alt="รูปสลิปที่เลือก"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-[var(--color-border)] shadow-2xs"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-emerald-600 block flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> แนบรูปสลิปเรียบร้อยแล้ว
              </span>
              <p className="text-xs text-[var(--color-secondary-muted)] truncate">
                {slipFile?.name || 'สลิปการโอนเงิน'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 text-xs font-semibold text-[var(--color-primary)] underline hover:text-[var(--color-secondary)] cursor-pointer"
              >
                เปลี่ยนรูปสลิป
              </button>
            </div>
            <button
              type="button"
              onClick={() => onSlipSelect(null)}
              className="p-1.5 rounded-full text-rose-500 hover:bg-rose-50 transition cursor-pointer"
              title="ลบสลิป"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-[var(--color-primary)]/60 bg-[var(--color-primary-light)]/40 hover:bg-[var(--color-primary-light)]/70 transition cursor-pointer text-center space-y-2 group"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[var(--color-secondary)]">
                คลิกเพื่ออัปโหลดรูปภาพสลิปโอนเงิน
              </p>
              <p className="text-[11px] text-[var(--color-secondary-muted)] mt-0.5">
                รองรับไฟล์ภาพ JPG, PNG, WEBP (ขนาดไม่เกิน 5 MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ข้อความกำกับการโอนเงิน */}
      <div className="p-3.5 rounded-xl bg-[#fff8fa] border border-[#fce4ec] text-[11px] text-[var(--color-secondary-muted)] space-y-0.5">
        <p className="font-semibold text-[var(--color-primary)] flex items-center gap-1">
          <CuteSparkle className="w-3.5 h-3.5" /> ข้อแนะนำการสั่งซื้อ:
        </p>
        <p>• เมื่อกดยืนยัน คำสั่งซื้อและสลิปจะถูกบันทึกเข้าระบบทันที</p>
        <p>• ลูกค้าจะได้รับรหัสติดตาม และสามารถดาวน์โหลดไฟล์งานผ่าน Google Drive ได้ทันทีที่ร้านจัดส่ง</p>
      </div>
    </div>
  );
};
