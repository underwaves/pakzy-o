import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
  Download,
  Receipt,
  Gift,
  ExternalLink,
  Search,
  Clock,
  FolderOpen,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import {
  CuteHeart,
  CuteFlower,
  CuteStar,
  CuteSectionDivider,
  CardCornerDoodle,
  PakzyMascotSticker,
} from '../components/ui/Decorations';
import { PromptPayQrCard } from '../components/ui/PromptPayQrCard';
import { drawQokhimsReceiptToCanvas } from '../utils/receiptCanvas';
import { calculateFontPriceInfo } from '../utils/promo';

interface SubmittedOrderResult {
  id?: number;
  order_code: string;
  tracking_token?: string;
  customer_name?: string;
  total_amount: number;
  discount_amount?: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'verified';
  slip_url?: string | null;
  slip_verified?: number;
  slip_trans_ref?: string | null;
  slip_verify_note?: string;
  drive_link?: string | null;
  due_date?: string | null;
  summary_text?: string;
  line_id?: string;
  line_deep_link?: string;
  line_notified?: boolean;
  member_code?: string | null;
  estimated_points?: number;
  created_at?: string;
}

interface OrderedItemSnapshot {
  product_id: number | null;
  product_title: string;
  category_type: 'service' | 'font';
  quantity: number;
  unit_price: number;
  item_note: string;
}

export const OrderPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const trackParam = searchParams.get('track');
  const tokenParam = searchParams.get('token');

  const {
    products,
    fonts,
    cartItems,
    addToOrderCart,
    updateOrderCartItem,
    removeFromOrderCart,
    clearOrderCart,
    settings,
  } = useSite();
  const { showToast } = useToast();

  const [selectedFontIdToAdd, setSelectedFontIdToAdd] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [memberCode, setMemberCode] = useState<string>(() => {
    try {
      return localStorage.getItem('pakzy_member_code') || '';
    } catch {
      return '';
    }
  });

  // สลิปโอนเงิน
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);

  const isLoyaltyEnabled =
    settings.loyalty_enabled !== 'false' && settings.loyalty_enabled !== '0';
  const bahtPerPoint = Math.max(1, Number(settings.baht_per_point) || 10);

  // ขั้นตอน: 'cart' (ตะกร้าและข้อมูลลูกค้า) -> 'payment' (QR ชำระเงินและแนบสลิป) -> 'completed' (ติดตามสถานะและรับไฟล์)
  const [step, setStep] = useState<'cart' | 'payment' | 'completed'>('cart');
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrderResult | null>(null);
  const [submittedItemsSnapshot, setSubmittedItemsSnapshot] = useState<OrderedItemSnapshot[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedTrackingLink, setCopiedTrackingLink] = useState(false);

  // ระบบค้นหาและติดตามสถานะออเดอร์
  const [trackSearchCode, setTrackSearchCode] = useState('');
  const [trackSearchToken, setTrackSearchToken] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // ตรวจสอบ query param ?track=PKZ-...&token=trk_... เมื่อเปิดหน้า
  useEffect(() => {
    if (trackParam && tokenParam) {
      setTrackSearchCode(trackParam.trim().toUpperCase());
      setTrackSearchToken(tokenParam.trim());
      loadTrackOrder(trackParam.trim(), tokenParam.trim());
    } else if (trackParam && !tokenParam) {
      setTrackSearchCode(trackParam.trim().toUpperCase());
      showToast('กรุณากรอก Tracking Token เพื่อเข้าดูสถานะออเดอร์ค่ะ', 'info');
    }
  }, [trackParam, tokenParam]);

  const loadTrackOrder = async (code: string, tokenToUse?: string) => {
    const cleanCode = (code || trackSearchCode).trim().toUpperCase();
    const cleanToken = (tokenToUse !== undefined ? tokenToUse : trackSearchToken).trim();

    if (!cleanCode) {
      showToast('กรุณากรอกรหัสคำสั่งซื้อ เช่น PKZ-261116-1234 ค่ะ', 'error');
      return;
    }
    if (!cleanToken) {
      showToast('กรุณากรอก Tracking Token (รหัสลับติดตามออเดอร์) ด้วยนะคะ', 'error');
      return;
    }

    setTrackingLoading(true);
    try {
      const res = await fetch(
        `/api/orders/track/${encodeURIComponent(cleanCode)}?token=${encodeURIComponent(cleanToken)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่พบข้อมูลคำสั่งซื้อ หรือข้อมูลการเข้าถึงไม่ถูกต้องค่ะ');
      }
      setSubmittedOrder({
        ...data.order,
        tracking_token: cleanToken,
      });
      setSubmittedItemsSnapshot(data.items || []);
      setCustomerName(data.order.customer_name || '');
      setStep('completed');
      setSearchParams({ track: cleanCode, token: cleanToken });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ไม่พบคำสั่งซื้อค่ะ', 'error');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handlePasteOrChangeTrackCode = (rawVal: string) => {
    if (rawVal.includes('track=') || rawVal.includes('token=')) {
      try {
        const dummy = rawVal.startsWith('http') ? rawVal : `https://dummy.local/${rawVal.replace(/^\/?/, '')}`;
        const parsedUrl = new URL(dummy);
        const t = parsedUrl.searchParams.get('track');
        const tok = parsedUrl.searchParams.get('token');
        if (t) setTrackSearchCode(t.trim().toUpperCase());
        if (tok) setTrackSearchToken(tok.trim());
        return;
      } catch {
        // Fallback
      }
    }
    setTrackSearchCode(rawVal.toUpperCase());
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const handleAddSelectedFont = (e: React.MouseEvent<HTMLButtonElement>) => {
    const font = fonts.find((f) => String(f.id) === selectedFontIdToAdd);
    if (!font) {
      showToast('กรุณาเลือกฟอนต์ลายมือจากรายการก่อนนะคะ', 'error');
      return;
    }
    const promo = calculateFontPriceInfo(font);
    addToOrderCart(
      {
        product_id: font.product_id,
        product_title: `ฟอนต์ ${font.name}`,
        category_type: 'font',
        quantity: 1,
        unit_price: promo.effectivePrice,
        item_note: promo.hasPromo
          ? `โปรโมชัน: ลดเหลือ ฿${promo.effectivePrice} (ปกติ ฿${promo.originalPrice}) • ไฟล์ .TTF 3 น้ำหนัก`
          : 'ไฟล์ฟอนต์ .TTF มี 3 น้ำหนัก (บาง / ปกติ / หนา)',
      },
      { clientX: e.clientX, clientY: e.clientY }
    );
    setSelectedFontIdToAdd('');
    showToast(`เพิ่มฟอนต์ "${font.name}" ลงในตะกร้าแล้วค่ะ ♡`, 'info');
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showToast('กรุณาเลือกฟอนต์อย่างน้อย 1 รายการค่ะ', 'error');
      return;
    }
    if (customerName.trim().length < 2) {
      showToast('กรุณากรอกชื่อหรือชื่อเล่นของคุณลูกค้าด้วยนะคะ', 'error');
      return;
    }
    if (customerContact.trim().length < 2) {
      showToast('กรุณากรอกช่องทางติดต่อหลัก เช่น LINE ID หรือ IG ค่ะ', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail.trim() || !emailRegex.test(customerEmail.trim())) {
      showToast(
        'กรุณากรอกอีเมลที่ถูกต้อง (เช่น yourname@gmail.com) เพื่อใช้ส่งลิงก์ไฟล์ฟอนต์ค่ะ',
        'error'
      );
      return;
    }
    setStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSlipSelect = (file: File | null) => {
    setSlipFile(file);
    if (file) {
      setSlipPreviewUrl(URL.createObjectURL(file));
    } else {
      setSlipPreviewUrl(null);
    }
  };

  const handleConfirmOrderAndPayment = async () => {
    setSubmitting(true);
    let uploadedSlipUrl: string | null = null;

    // 1. ถ้ามีไฟล์สลิป ให้อัปโหลดขึ้น R2 ก่อน
    if (slipFile) {
      setUploadingSlip(true);
      try {
        const formData = new FormData();
        formData.append('file', slipFile);
        const uploadRes = await fetch('/api/upload-slip', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ');
        }
        uploadedSlipUrl = uploadData.url;
      } catch (err) {
        setSubmitting(false);
        setUploadingSlip(false);
        showToast(
          err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลดสลิป',
          'error'
        );
        return;
      } finally {
        setUploadingSlip(false);
      }
    }

    const snapshot: OrderedItemSnapshot[] = cartItems.map((i) => ({
      product_id: i.product_id,
      product_title: i.product_title,
      category_type: i.category_type,
      quantity: i.quantity,
      unit_price: i.unit_price,
      item_note: i.item_note,
    }));

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_contact: customerContact.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim(),
          custom_brief: '',
          member_code: isLoyaltyEnabled ? memberCode.trim().toUpperCase() : '',
          slip_url: uploadedSlipUrl || '',
          payment_status: uploadedSlipUrl ? 'paid' : 'pending',
          items: snapshot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถบันทึกคำสั่งซื้อได้');
      }

      setSubmittedItemsSnapshot(snapshot);
      setSubmittedOrder(data.order);
      setTrackSearchCode(data.order.order_code);
      if (data.order.tracking_token) {
        setTrackSearchToken(data.order.tracking_token);
        setSearchParams({ track: data.order.order_code, token: data.order.tracking_token });
      }
      clearOrderCart();
      setStep('completed');

      if (data.order?.summary_text && navigator.clipboard) {
        navigator.clipboard.writeText(data.order.summary_text).catch(() => {});
      }

      showToast(
        uploadedSlipUrl
          ? 'แนบสลิปและสั่งซื้อเรียบร้อยแล้วค่ะ ร้านจะรีบตรวจสอบและจัดส่งไฟล์ให้นะคะ ♡'
          : 'บันทึกคำสั่งซื้อเรียบร้อยแล้วค่ะ ♡',
        'success'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งคำสั่งซื้อ',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const rawLine = (submittedOrder?.line_id || settings.contact_line || '@280npxvj').trim();
  const cleanLineHandle = rawLine.startsWith('@') ? rawLine : `@${rawLine}`;
  const lineOaUrl = /^https?:\/\//i.test(rawLine)
    ? rawLine
    : `https://line.me/R/ti/p/${cleanLineHandle}`;

  const handleCopySummary = async () => {
    if (!submittedOrder) return;
    const textToCopy =
      submittedOrder.summary_text ||
      `คำสั่งซื้อ ${submittedOrder.order_code}\nยอดชำระ: ฿${submittedOrder.total_amount}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      showToast('คัดลอกข้อความสรุปคำสั่งซื้อแล้วค่ะ ♡', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast('กรุณากดค้างที่กล่องข้อความเพื่อคัดลอก', 'info');
    }
  };

  // สร้างและดาวน์โหลดรูปใบเสร็จ (.PNG) ด้วย HTML5 Canvas สไตล์ qokhims
  const handleDownloadReceiptImage = () => {
    const activeItems: OrderedItemSnapshot[] =
      step === 'completed' && submittedItemsSnapshot.length > 0
        ? submittedItemsSnapshot
        : cartItems;
    const orderCode = submittedOrder?.order_code || 'PREVIEW-DRAFT';
    const orderTotal =
      step === 'completed' && submittedOrder
        ? submittedOrder.total_amount
        : totalAmount;
    const now = new Date();
    const billDate = now.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const billTime = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const canvas = document.createElement('canvas');
    drawQokhimsReceiptToCanvas(canvas, {
      siteName: settings.site_name || 'pakzy.o',
      tagline: settings.site_tagline || 'Font by pakzy 🌸 รับออกแบบงานต่างๆ',
      orderCode,
      billDate,
      billTime,
      customerName: customerName || 'ลูกค้า pakzy.o',
      customerContact: customerContact,
      customerEmail: customerEmail,
      items: activeItems.map((it) => ({
        product_title: it.product_title,
        quantity: it.quantity,
        unit_price: it.unit_price,
        item_note: it.item_note,
      })),
      discountAmount: submittedOrder?.discount_amount || 0,
      netTotal: orderTotal,
      promptPayNumber: settings.promptpay_number || '0812345678',
      bankName: settings.bank_name || 'ธนาคารกสิกรไทย (KBANK)',
      bankAccountNumber: settings.bank_account_number || '123-4-56789-0',
      bankAccountName: settings.bank_account_name || 'น.ส. พักตร์ปรียา (pakzy.o)',
    });

    const link = document.createElement('a');
    link.download = `pakzy-receipt-${orderCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('บันทึกรูปใบเสร็จเรียบร้อยแล้วค่ะ ♡', 'success');
  };

  const getStatusBadge = (
    status: string,
    paymentStatus?: string,
    slipVerified?: number
  ) => {
    if (status === 'completed') {
      return { label: 'ส่งมอบไฟล์แล้ว ♡', className: 'bg-emerald-100 text-emerald-800' };
    }
    if (status === 'in_progress') {
      return { label: 'กำลังจัดเตรียมไฟล์งาน', className: 'bg-blue-100 text-blue-800' };
    }
    if (slipVerified === 1 || paymentStatus === 'verified' || status === 'confirmed') {
      return { label: 'สลิปผ่านการตรวจแล้ว ✓ / ยืนยันออเดอร์', className: 'bg-emerald-100 text-emerald-800' };
    }
    if (slipVerified === -1) {
      return { label: 'รอร้านตรวจสลิปเพิ่มเติม', className: 'bg-amber-100 text-amber-800' };
    }
    if (paymentStatus === 'paid' || status === 'pending') {
      return { label: 'รอตรวจสอบสลิป', className: 'bg-amber-100 text-amber-800' };
    }
    return { label: 'รอการชำระเงิน', className: 'bg-rose-100 text-rose-800' };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      {/* หัวข้อหน้าสั่งซื้อ & ตรวจสอบสถานะ */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-border)]">
          <CuteFlower className="w-3.5 h-3.5" /> Web Order & Instant Checkout
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-secondary)]">
          {step === 'completed' ? 'ติดตามสถานะคำสั่งซื้อ & รับไฟล์' : 'สั่งซื้อและชำระเงินผ่านเว็บ'}
        </h1>
        <CuteSectionDivider />

        {/* แถบแสดงขั้นตอน 3 สเต็ป */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 pt-3 text-xs sm:text-sm font-semibold">
          <span
            className={`px-3.5 py-1.5 rounded-full ${
              step === 'cart'
                ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                : 'bg-[var(--color-primary-light)] text-[var(--color-secondary)]'
            }`}
          >
            1. ตะกร้า & ข้อมูลสั่งซื้อ
          </span>
          <span className="text-[var(--color-border)]">──</span>
          <span
            className={`px-3.5 py-1.5 rounded-full ${
              step === 'payment'
                ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                : 'bg-[var(--color-primary-light)] text-[var(--color-secondary)]'
            }`}
          >
            2. ชำระเงิน & แนบสลิป
          </span>
          <span className="text-[var(--color-border)]">──</span>
          <span
            className={`px-3.5 py-1.5 rounded-full ${
              step === 'completed'
                ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                : 'bg-[var(--color-primary-light)] text-[var(--color-secondary)]'
            }`}
          >
            3. สถานะ & รับไฟล์
          </span>
        </div>
      </div>

      {/* กล่องค้นหาคำสั่งซื้อด้วยรหัสออเดอร์และ Tracking Token */}
      {step !== 'completed' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[var(--color-border)] shadow-2xs space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-secondary)]">
            <Search className="w-4 h-4 text-[var(--color-primary)]" />
            <span>เช็กสถานะออเดอร์เดิม / รับไฟล์ Google Drive:</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={trackSearchCode}
              onChange={(e) => handlePasteOrChangeTrackCode(e.target.value)}
              placeholder="รหัสออเดอร์ (เช่น PKZ-261116-1234 หรือวางลิงก์)"
              className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] uppercase font-mono font-bold"
            />
            <input
              type="text"
              value={trackSearchToken}
              onChange={(e) => setTrackSearchToken(e.target.value.trim())}
              placeholder="Tracking Token (เช่น trk_...)"
              className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] font-mono font-medium"
            />
            <button
              type="button"
              onClick={() => loadTrackOrder(trackSearchCode, trackSearchToken)}
              disabled={trackingLoading || !trackSearchCode.trim() || !trackSearchToken.trim()}
              className="px-5 py-2 rounded-xl bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {trackingLoading ? 'กำลังค้นหา...' : 'ตรวจสอบสถานะ'}
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-secondary-muted)]">
            💡 เพื่อความเป็นส่วนตัว ระบบใช้ Tracking Token ควบคู่กับรหัสออเดอร์ในการเข้าดูข้อมูลและไฟล์งานค่ะ
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ขั้นตอนที่ 1: ตะกร้าสินค้า และ ข้อมูลติดต่อ */}
      {/* ========================================================================= */}
      {step === 'cart' && (
        <form onSubmit={handleProceedToPayment} className="space-y-8 animate-fade-in">
          {/* ส่วนที่ 1: ตะกร้าสินค้า */}
          <div className="relative bg-white rounded-[2rem] border-2 border-[var(--color-border)] p-5 sm:p-7 shadow-xs space-y-5 overflow-hidden">
            <CardCornerDoodle corner="top-right" variant="flower" />
            <h2 className="text-lg font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
              1. รายการสินค้าในตะกร้า ({cartItems.length} รายการ)
            </h2>

            {/* ตัวเลือกเพิ่มฟอนต์จากร้าน */}
            <div className="flex flex-col sm:flex-row gap-2.5 p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <select
                aria-label="เลือกฟอนต์ลายมือเพื่อใส่ตะกร้า"
                value={selectedFontIdToAdd}
                onChange={(e) => setSelectedFontIdToAdd(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="">+ เลือกเพิ่มฟอนต์ลายมือจากรายการร้าน...</option>
                {fonts
                  .filter((f) => f.is_active !== 0)
                  .map((f) => {
                    const promo = calculateFontPriceInfo(f);
                    return (
                      <option key={f.id} value={f.id}>
                        ฟอนต์ {f.name} — ฿{promo.effectivePrice}
                        {promo.hasPromo ? ` (ลดจาก ฿${promo.originalPrice})` : ''}
                      </option>
                    );
                  })}
              </select>
              <button
                type="button"
                onClick={handleAddSelectedFont}
                className="pkz-order-btn px-5 py-2.5 rounded-xl bg-[var(--color-secondary)] text-white text-xs sm:text-sm font-semibold hover:bg-[var(--color-primary)] transition inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                เพิ่มลงตะกร้า
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-secondary-muted)] space-y-3">
                <PakzyMascotSticker mood="empty" className="w-16 h-16 mx-auto" />
                <p>ตะกร้าของคุณยังว่างอยู่เลยค่ะ แวะไปลองพิมพ์ฟอนต์ก่อนได้น้า ♡</p>
                <Link
                  to="/font-tester"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition"
                >
                  ไปหน้าทดลองพิมพ์ฟอนต์ →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                          {item.category_type === 'font' ? '✿ ฟอนต์ลายมือ' : '♥ บริการออกแบบ'}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[var(--color-secondary)]">
                          {item.product_title}
                        </h3>
                        <p className="text-xs text-[var(--color-secondary-muted)]">
                          ราคา: ฿{item.unit_price.toLocaleString('th-TH')}
                        </p>
                      </div>

                      {/* ปรับจำนวน */}
                      <div className="flex items-center gap-2 bg-white border border-[var(--color-border)] rounded-full px-2.5 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateOrderCartItem(idx, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                          aria-label="ลดจำนวน"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateOrderCartItem(idx, {
                              quantity: Math.min(99, item.quantity + 1),
                            })
                          }
                          className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                          aria-label="เพิ่มจำนวน"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <span className="text-sm sm:text-base font-bold text-[var(--color-primary)]">
                          ฿{(item.quantity * item.unit_price).toLocaleString('th-TH')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromOrderCart(idx)}
                        className="p-2 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        aria-label="ลบรายการนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.item_note}
                        onChange={(e) =>
                          updateOrderCartItem(idx, { item_note: e.target.value })
                        }
                        placeholder="หมายเหตุสำหรับรายการนี้ (เช่น ชื่อที่ต้องการให้ระบุในสิทธิ์)..."
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-[var(--color-border)] text-xs text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-3 flex items-center justify-between border-t border-[var(--color-border)]">
                  <span className="text-sm font-bold text-[var(--color-secondary)]">
                    ยอดรวมสุทธิ:
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-[var(--color-primary)]">
                    ฿{totalAmount.toLocaleString('th-TH')} บาท
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ส่วนที่ 2: ข้อมูลติดต่อลูกค้า */}
          <div className="relative bg-white rounded-[2rem] border-2 border-[var(--color-border)] p-5 sm:p-7 shadow-xs space-y-5 overflow-hidden">
            <CardCornerDoodle corner="top-right" variant="heart" />
            <h2 className="text-lg font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
              2. ข้อมูลติดต่อลูกค้า
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[var(--color-secondary)] mb-1.5">
                  ชื่อ - นามสกุล หรือชื่อเล่น <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="เช่น คุณแพรวา"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[var(--color-secondary)] mb-1.5">
                  ช่องทางติดต่อหลัก (LINE ID หรือ IG) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  placeholder="เช่น LINE: praewaa หรือ IG: @sweetbake"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[var(--color-secondary)] mb-1.5">
                  อีเมลสำหรับรับลิงก์ไฟล์ฟอนต์ (Google Drive) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                  ร้านจะจัดส่งลิงก์ดาวน์โหลดไฟล์ฟอนต์ .TTF ครบทั้ง 3 น้ำหนักไปยังอีเมลนี้ค่ะ
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[var(--color-secondary)] mb-1.5">
                  เบอร์โทรศัพท์ (ถ้ามี — ไม่บังคับ)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* ช่องกรอกรหัสสมาชิกสะสมแต้ม */}
            {isLoyaltyEnabled && (
              <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/55 border border-[var(--color-border)] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-[var(--color-primary)]" />
                    รหัสสมาชิกสะสมแต้ม (ถ้ามี — ไม่บังคับ)
                  </label>
                  <Link
                    to="/points"
                    className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    เปิดบัตรสะสมแต้มฟรี →
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <input
                    type="text"
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                    placeholder="เช่น PZ-4K9M"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-sm font-bold uppercase tracking-wider text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  {totalAmount > 0 && (
                    <span className="text-xs font-semibold text-[var(--color-primary)] px-3 py-2 rounded-xl bg-white border border-[var(--color-border)] shrink-0">
                      ✨ ออเดอร์นี้จะได้ประมาณ{' '}
                      <strong>{Math.floor(totalAmount / bahtPerPoint)} แต้ม</strong> เมื่องานเสร็จสิ้น
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={cartItems.length === 0}
                className="pkz-order-btn w-full sm:w-auto px-8 py-3.5 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm sm:text-base hover:opacity-95 transition shadow-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>ดำเนินการชำระเงิน (Next)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* ขั้นตอนที่ 2: โอนเงินผ่าน PromptPay QR / บัญชีธนาคาร + แนบสลิป */}
      {/* ========================================================================= */}
      {step === 'payment' && (
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
          <PromptPayQrCard
            amount={totalAmount}
            promptPayNumber={settings.promptpay_number || '0812345678'}
            bankName={settings.bank_name || 'ธนาคารกสิกรไทย (KBANK)'}
            bankAccountNumber={settings.bank_account_number || '123-4-56789-0'}
            bankAccountName={settings.bank_account_name || 'น.ส. พักตร์ปรียา (pakzy.o)'}
            slipFile={slipFile}
            slipPreviewUrl={slipPreviewUrl}
            onSlipSelect={handleSlipSelect}
            uploadingSlip={uploadingSlip}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('cart')}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary)] text-sm font-semibold hover:bg-[var(--color-primary-light)] transition inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปแก้ไขรายการ
            </button>

            <button
              type="button"
              onClick={handleConfirmOrderAndPayment}
              disabled={submitting}
              className="pkz-order-btn w-full sm:w-auto px-8 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm sm:text-base font-semibold hover:opacity-95 transition shadow-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              {submitting
                ? uploadingSlip
                  ? 'กำลังอัปโหลดสลิป...'
                  : 'กำลังบันทึกคำสั่งซื้อ...'
                : 'ยืนยันการชำระเงิน & สั่งซื้อ'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ขั้นตอนที่ 3: หน้าสรุปผล ติดตามสถานะคำสั่งซื้อ & รับไฟล์ Google Drive */}
      {/* ========================================================================= */}
      {step === 'completed' && submittedOrder && (
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
          {/* การ์ดสถานะคำสั่งซื้อ */}
          <div className="bg-white rounded-[2rem] border-2 border-[var(--color-secondary)]/80 p-6 sm:p-8 space-y-5 shadow-md text-center relative overflow-hidden">
            <CardCornerDoodle corner="top-right" variant="flower" />
            <CardCornerDoodle corner="bottom-left" variant="heart" />

            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs text-[var(--color-secondary-muted)] font-semibold">
                รหัสคำสั่งซื้อของคุณ
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-primary)] font-mono tracking-wider mt-0.5">
                {submittedOrder.order_code}
              </h2>
            </div>

            {/* ป้ายแสดงสถานะ */}
            {(() => {
              const badge = getStatusBadge(
                submittedOrder.status,
                submittedOrder.payment_status,
                submittedOrder.slip_verified
              );
              return (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold border border-[var(--color-border)] shadow-2xs">
                  <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>สถานะคำสั่งซื้อ:</span>
                  <span className={`px-2.5 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })()}

            {/* กล่องแสดงลิงก์ติดตามออเดอร์ส่วนตัว (Private Tracking Link) */}
            {submittedOrder.tracking_token && (
              <div className="p-4 rounded-2xl bg-[#fff8f9] border border-[var(--color-primary)]/30 text-left space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                    ลิงก์ติดตามออเดอร์ส่วนตัว (Private Tracking Link)
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const fullUrl = `${window.location.origin}/order?track=${submittedOrder.order_code}&token=${submittedOrder.tracking_token}`;
                      try {
                        await navigator.clipboard.writeText(fullUrl);
                        setCopiedTrackingLink(true);
                        showToast('คัดลอกลิงก์ติดตามออเดอร์ส่วนตัวแล้วค่ะ ♡', 'success');
                        setTimeout(() => setCopiedTrackingLink(false), 3000);
                      } catch {
                        showToast('กรุณากดค้างที่ลิงก์เพื่อคัดลอกค่ะ', 'info');
                      }
                    }}
                    className="px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 transition inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedTrackingLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedTrackingLink ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[var(--color-border)] font-mono text-[11px] text-[var(--color-secondary)] break-all select-all">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/order?track=${submittedOrder.order_code}&token=${submittedOrder.tracking_token}`
                    : `/order?track=${submittedOrder.order_code}&token=${submittedOrder.tracking_token}`}
                </div>
                <p className="text-[11px] text-[var(--color-secondary-muted)] leading-relaxed">
                  🔒 ลิงก์นี้ผูกกับรหัสลับ Tracking Token เฉพาะคุณเท่านั้น กรุณาบันทึกหรือบุ๊กมาร์กไว้สำหรับเปิดเช็กสถานะและดาวน์โหลดไฟล์ฟอนต์ในภายหลังค่ะ
                </p>
              </div>
            )}

            {/* กล่องแจ้งเตือนผลการตรวจสลิปอัตโนมัติ */}
            {submittedOrder.slip_url && (
              submittedOrder.slip_verified === 1 ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1 text-left">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <Check className="w-4 h-4 text-emerald-600" />
                    สลิปผ่านการตรวจสอบอัตโนมัติแล้วเรียบร้อยค่ะ ♡
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    รหัสอ้างอิง:{' '}
                    <span className="font-mono font-semibold">
                      {submittedOrder.slip_trans_ref || '-'}
                    </span>{' '}
                    | ยอดโอนถูกต้อง ทางร้านกำลังจัดเตรียมไฟล์ให้นะคะ
                  </p>
                </div>
              ) : submittedOrder.slip_verified === -1 ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1 text-left">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600" />
                    ระบบรับสลิปแล้ว กำลังรอร้านตรวจทานเพิ่มเติมค่ะ
                  </div>
                  <p className="text-[11px] text-amber-700">
                    {submittedOrder.slip_verify_note ||
                      'แอดมินกำลังตรวจสอบความถูกต้องของยอดโอน กรุณารอสักครู่นะคะ'}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1 text-left">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600" />
                    แนบสลิปเรียบร้อยแล้ว อยู่ระหว่างรอร้านตรวจสอบยอดเงินค่ะ
                  </div>
                </div>
              )
            )}

            {/* แสดงปุ่มดาวน์โหลดไฟล์ Google Drive เมื่อทางร้านส่งมอบงานแล้ว */}
            {submittedOrder.drive_link ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#fceef2] via-white to-[#fff2f6] border-2 border-[var(--color-primary)] space-y-3 shadow-xs">
                <span className="text-xs font-bold text-[var(--color-primary)] flex items-center justify-center gap-1.5">
                  <FolderOpen className="w-4 h-4" /> ร้านส่งมอบไฟล์เรียบร้อยแล้วค่ะ ♡
                </span>
                <p className="text-xs sm:text-sm text-[var(--color-secondary)]">
                  คุณลูกค้าสามารถคลิกปุ่มด้านล่างเพื่อเปิดโฟลเดอร์และดาวน์โหลดไฟล์ฟอนต์/ไฟล์งานได้ทันที:
                </p>
                <a
                  href={submittedOrder.drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pkz-order-btn w-full sm:w-auto px-8 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm sm:text-base font-bold hover:opacity-95 transition inline-flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  เปิดโฟลเดอร์ดาวน์โหลดไฟล์ใน Google Drive
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-secondary-muted)] space-y-1">
                <p className="font-semibold text-[var(--color-secondary)]">
                  📁 ลิงก์ดาวน์โหลดไฟล์ (Google Drive):
                </p>
                <p>
                  เมื่อแอดมินตรวจสอบยอดเงินและจัดเตรียมไฟล์เรียบร้อยแล้ว ปุ่มดาวน์โหลด Google Drive จะปรากฏในหน้านี้ทันทีค่ะ (สามารถเก็บรหัสออเดอร์นี้ไว้เช็กสถานะได้ตลอดเวลา)
                </p>
              </div>
            )}

            {/* ข้อมูลสรุปรายการ */}
            <div className="border-t border-dashed border-[var(--color-border)] pt-4 text-left space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-[var(--color-secondary-muted)]">
                <span>ลูกค้า:</span>
                <strong className="text-[var(--color-secondary)]">{customerName || 'ลูกค้า pakzy.o'}</strong>
              </div>
              {customerContact ? (
                <div className="flex justify-between text-[var(--color-secondary-muted)]">
                  <span>ติดต่อ:</span>
                  <strong className="text-[var(--color-secondary)]">{customerContact}</strong>
                </div>
              ) : null}
              <div className="flex justify-between text-[var(--color-secondary-muted)]">
                <span>ยอดชำระ:</span>
                <strong className="text-[var(--color-primary)] font-bold text-base">
                  ฿{submittedOrder.total_amount.toLocaleString('th-TH')} บาท
                </strong>
              </div>
              {submittedOrder.slip_url && (
                <div className="flex justify-between text-[var(--color-secondary-muted)] pt-1">
                  <span>สลิปที่แนบ:</span>
                  <a
                    href={submittedOrder.slip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-primary)] underline font-semibold flex items-center gap-1"
                  >
                    ดูรูปสลิป <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* ปุ่มคัดลอกสรุปและบันทึกใบเสร็จ */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={handleDownloadReceiptImage}
                className="px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                บันทึกรูปใบเสร็จ (.PNG)
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความสรุป'}
              </button>

              <a
                href={lineOaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 rounded-full bg-[#06C755] text-white text-xs font-bold hover:opacity-95 transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                ทักแชต LINE ร้าน ({cleanLineHandle})
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
