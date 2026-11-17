import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Minus,
  Trash2,
  Download,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  Tag,
  CheckCircle2,
  Send,
  Share2,
  QrCode,
  Image as ImageIcon,
  X,
  Percent,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useSite } from '../../context/SiteContext';
import {
  CuteHeart,
  CuteFlower,
  CuteSparkle,
} from '../../components/ui/Decorations';
import {
  drawQokhimsReceiptToCanvas,
  drawQokhimsQrCardToCanvas,
} from '../../utils/receiptCanvas';
import type { ProductItem } from '../../types';

interface BillItem {
  product_id?: number | null;
  product_title: string;
  category_type: 'service' | 'font';
  quantity: number;
  unit_price: number;
  item_note?: string;
}

export const AdminBillPage: React.FC = () => {
  const { showToast } = useToast();
  const { settings, refreshSiteData } = useSite();

  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ข้อมูลในบิล
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('LINE');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  });
  const [billDate, setBillDate] = useState(() => {
    return new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });
  const [billTime, setBillTime] = useState(() => {
    return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  });
  const [memberCode, setMemberCode] = useState('');
  const [billNote, setBillNote] = useState(''); // ช่องหมายเหตุเพิ่มเติม

  // รูปแบบ QR Code: รวมในบิล หรือ แยกการ์ด QR
  const [includeQrInBill, setIncludeQrInBill] = useState(true);

  // รายการในบิล
  const [items, setItems] = useState<BillItem[]>([
    {
      product_id: null,
      product_title: 'ออกแบบป้าย 1 รายการ (งานตามสั่ง)',
      category_type: 'service',
      quantity: 1,
      unit_price: 109,
      item_note: '',
    },
  ]);

  // ส่วนลด: เลือกได้ว่าเป็น บาท หรือ %
  const [discountType, setDiscountType] = useState<'baht' | 'percent'>('baht');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // ฟอร์มเพิ่มรายการจากสินค้าที่มี
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // ฟอร์มเพิ่มรายการเอง
  const [customTitle, setCustomTitle] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(109);

  // State การทำงาน
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<{ id: number; order_code: string } | null>(null);

  // Modal พรีวิวภาพสำหรับ iPad/Safari ให้แตะค้างบันทึกภาพได้ 100%
  const [previewModal, setPreviewModal] = useState<{
    url: string;
    title: string;
    filename: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // โหลดสินค้าทั้งหมดรวมรายการที่ซ่อนอยู่ (is_active = 0)
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const res = await fetch('/api/admin/products', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          setAllProducts(data.products || []);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchAllProducts();
  }, []);

  // คำนวณยอดรวมและส่วนลด
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);

  let discountAmount = 0;
  let discountLabel = 'ส่วนลดพิเศษ';

  if (discountType === 'percent') {
    const clampedPct = Math.max(0, Math.min(100, Number(discountValue) || 0));
    discountAmount = Math.min(subtotal, Math.round((subtotal * clampedPct) / 100));
    discountLabel = `ส่วนลด ${clampedPct}% (-฿${discountAmount.toLocaleString()})`;
  } else {
    const clampedBaht = Math.max(0, Math.min(subtotal, Number(discountValue) || 0));
    discountAmount = clampedBaht;
    discountLabel = `ส่วนลดพิเศษ (-฿${discountAmount.toLocaleString()})`;
  }

  const netTotal = Math.max(0, subtotal - discountAmount);

  // เพิ่มสินค้าจากรายการร้าน
  const handleAddProductFromList = () => {
    const prod = allProducts.find((p) => String(p.id) === selectedProductId);
    if (!prod) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        product_title: prod.title,
        category_type: prod.category_type === 'font' ? 'font' : 'service',
        quantity: 1,
        unit_price: prod.price,
        item_note: '',
      },
    ]);
    setSelectedProductId('');
    showToast(`เพิ่ม "${prod.title}" ลงในบิลแล้วค่ะ`, 'info');
  };

  // เพิ่มรายการตามสั่งเอง
  const handleAddCustomItem = () => {
    if (!customTitle.trim()) {
      showToast('กรุณาระบุชื่อรายการงานออกแบบก่อนนะคะ', 'error');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        product_id: null,
        product_title: customTitle.trim(),
        category_type: 'service',
        quantity: 1,
        unit_price: Math.max(0, customPrice || 0),
        item_note: '',
      },
    ]);
    setCustomTitle('');
    setCustomPrice(109);
    showToast('เพิ่มรายการตามสั่งแล้วค่ะ ♡', 'info');
  };

  // ลบรายการ
  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // อัปเดตรายการ
  const handleUpdateItem = (idx: number, patch: Partial<BillItem>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  };

  // วาดบิลลงบน Canvas ตามดีไซน์ใหม่ qokhims
  const drawBillCanvas = (): HTMLCanvasElement | null => {
    const canvas = canvasRef.current || document.createElement('canvas');
    drawQokhimsReceiptToCanvas(canvas, {
      siteName: settings.site_name || 'qokhims',
      tagline: settings.site_tagline || 'Graphic Design & Hand-drawn Font Studio ♡',
      orderCode: lastCreatedOrder?.order_code,
      billDate,
      billTime,
      customerName: customerName || '-',
      dueDate,
      showDueDate: true,
      items: items.map((it) => ({
        product_title: it.product_title,
        quantity: it.quantity,
        unit_price: it.unit_price,
        item_note: it.item_note,
      })),
      discountAmount,
      discountLabel,
      netTotal,
      billNote: billNote.trim(),
      includeQr: includeQrInBill,
      promptPayNumber: settings.promptpay_number || '0812345678',
      bankName: settings.bank_name || 'ธนาคารกสิกรไทย (KBANK)',
      bankAccountNumber: settings.bank_account_number || '123-4-56789-0',
      bankAccountName: settings.bank_account_name || 'น.ส. พักตร์ปรียา (qokhims)',
    });
    return canvas;
  };

  // วาดการ์ด QR Code แยก (กรณีเลือกแยก QR)
  const drawQrCanvas = (): HTMLCanvasElement | null => {
    if (includeQrInBill) return null;
    const canvas = qrCanvasRef.current || document.createElement('canvas');
    drawQokhimsQrCardToCanvas(canvas, {
      siteName: settings.site_name || 'qokhims',
      orderCode: lastCreatedOrder?.order_code,
      customerName: customerName || '-',
      netTotal,
      promptPayNumber: settings.promptpay_number || '0812345678',
      bankName: settings.bank_name || 'ธนาคารกสิกรไทย (KBANK)',
      bankAccountNumber: settings.bank_account_number || '123-4-56789-0',
      bankAccountName: settings.bank_account_name || 'น.ส. พักตร์ปรียา (qokhims)',
    });
    return canvas;
  };

  // วาดพรีวิวทุกครั้งที่ข้อมูลเปลี่ยน
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        drawBillCanvas();
        drawQrCanvas();
      });
    } else {
      drawBillCanvas();
      drawQrCanvas();
    }
  }, [
    items,
    customerName,
    dueDate,
    billDate,
    billTime,
    discountAmount,
    discountLabel,
    netTotal,
    billNote,
    includeQrInBill,
    settings,
  ]);

  const [sendingLine, setSendingLine] = useState(false);

  // สร้างข้อความสรุปบิลสำหรับส่งไลน์
  const buildSummaryMessage = (orderCode?: string) => {
    const code = orderCode || lastCreatedOrder?.order_code || 'QOK-DRAFT';
    const itemLines = items
      .map((it, idx) => `${idx + 1}. ${it.product_title} x${it.quantity} (${it.unit_price} ฿)`)
      .join('\n');

    const notePart = billNote.trim() ? `\n📝 หมายเหตุ: ${billNote.trim()}\n` : '';
    const discountPart = discountAmount > 0 ? `🎟️ ${discountLabel}\n` : '';

    return `🌸 สรุปบิลสั่งซื้อร้าน ${settings.site_name || 'qokhims'} 🌸
รหัสบิล: ${code}
วันที่: ${billDate} เวลา: ${billTime}
👤 ลูกค้า: ${customerName || '-'}
📅 วันรับ/ส่งงาน: ${dueDate || '-'}
---------------------------------
📦 รายการ:
${itemLines}
${discountPart}${notePart}💰 รวมทั้งสิ้น: ${netTotal.toFixed(2)} บาท
---------------------------------
🏦 ธนาคาร: ${settings.bank_name || 'กสิกรไทย'}
เลขที่บัญชี: ${settings.bank_account_number || '123-4-56789-0'}
ชื่อบัญชี: ${settings.bank_account_name || 'qokhims'}
PromptPay: ${settings.promptpay_number || '081-234-5678'}

แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡
โอนชำระภายใน 1 ชั่วโมงเพื่อล็อคคิวงานน้า
✨ THANK YOU ✨`;
  };

  // บันทึกบิลลง D1
  const ensureOrderSaved = async (): Promise<string> => {
    if (lastCreatedOrder?.order_code) {
      return lastCreatedOrder.order_code;
    }
    const summaryText = buildSummaryMessage();
    const res = await fetch('/api/admin/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim() || 'LINE',
        items,
        discount_amount: Number(discountAmount) || 0,
        due_date: dueDate.trim(),
        member_code: memberCode.trim().toUpperCase(),
        summary_text: summaryText,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'บันทึกบิลไม่สำเร็จ');
    setLastCreatedOrder(data.order);
    await refreshSiteData();
    return data.order.order_code;
  };

  // บันทึกรูปภาพบิล (เปิด Modal สำหรับ iPad/Safari และทริกเกอร์ดาวน์โหลดบน Desktop)
  const handleSaveBillImage = async () => {
    if (!customerName.trim()) {
      showToast('กรุณาระบุชื่อลูกค้าก่อนบันทึกบิลนะคะ', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('กรุณาระบุรายการสินค้าในบิลอย่างน้อย 1 รายการค่ะ', 'error');
      return;
    }

    setSaving(true);
    try {
      const orderCode = await ensureOrderSaved();
      const canvas = drawBillCanvas();
      if (!canvas) throw new Error('ไม่สามารถวาดรูปบิลได้');

      const dataUrl = canvas.toDataURL('image/png');
      const filename = `qokhims-bill-${orderCode}.png`;

      // ดาวน์โหลดอัตโนมัติบน Desktop
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      // เปิด Modal พรีวิวภาพสำหรับ iPad / Safari / มือถือ
      setPreviewModal({
        url: dataUrl,
        title: `บิลคำสั่งซื้อ #${orderCode}`,
        filename,
      });

      // คัดลอกข้อความสรุปด้วยเพื่อความสะดวก
      if (navigator.clipboard) {
        navigator.clipboard.writeText(buildSummaryMessage(orderCode)).catch(() => {});
      }

      showToast(`บันทึกบิล #${orderCode} เรียบร้อยแล้วค่ะ ♡`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกบิล', 'error');
    } finally {
      setSaving(false);
    }
  };

  // บันทึกรูปการ์ด QR Code แยก
  const handleSaveQrCardImage = async () => {
    const canvas = drawQrCanvas();
    if (!canvas) return;
    const orderCode = lastCreatedOrder?.order_code || 'QR';
    const dataUrl = canvas.toDataURL('image/png');
    const filename = `qokhims-qr-${orderCode}.png`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();

    setPreviewModal({
      url: dataUrl,
      title: `การ์ด QR พร้อมเพย์ #${orderCode}`,
      filename,
    });
    showToast('สร้างรูปการ์ด QR Code พร้อมเพย์แล้วค่ะ ♡', 'success');
  };

  // แชร์บิลผ่าน Web Share API
  const handleWebShare = async () => {
    if (!customerName.trim()) {
      showToast('กรุณาระบุชื่อลูกค้าก่อนแชร์บิลนะคะ', 'error');
      return;
    }
    const canvas = canvasRef.current || drawBillCanvas();
    if (!canvas) return;

    try {
      const orderCode = lastCreatedOrder?.order_code || 'BILL';
      const summaryText = buildSummaryMessage(orderCode);

      if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `qokhims-bill-${orderCode}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `บิลสั่งซื้อร้าน ${settings.site_name || 'qokhims'}`,
              text: summaryText,
              files: [file],
            });
            showToast('แชร์รูปบิลเรียบร้อยแล้วค่ะ ♡', 'success');
          } else {
            // กรณีส่งไฟล์ผ่าน Web Share ไม่ได้บนอุปกรณ์นี้ ให้แชร์ข้อความและเปิดหน้าบันทึกรูป
            await navigator.share({
              title: `บิลสั่งซื้อร้าน ${settings.site_name || 'qokhims'}`,
              text: summaryText,
            });
            setPreviewModal({
              url: canvas.toDataURL('image/png'),
              title: `บิลคำสั่งซื้อ #${orderCode}`,
              filename: `qokhims-bill-${orderCode}.png`,
            });
          }
        }, 'image/png');
      } else {
        // Fallback หากเบราว์เซอร์ไม่รองรับ Web Share
        setPreviewModal({
          url: canvas.toDataURL('image/png'),
          title: `บิลคำสั่งซื้อ #${orderCode}`,
          filename: `qokhims-bill-${orderCode}.png`,
        });
        showToast('เปิดรูปบิลแล้วค่ะ แตะค้างเพื่อบันทึกหรือคัดลอกรูปภาพได้เลยค่ะ', 'info');
      }
    } catch {
      // ผู้ใช้กดยกเลิกการแชร์
    }
  };

  // ส่งรูปบิลเข้าแชต LINE ของร้านผ่าน LINE Messaging API
  const handleSendBillToLine = async () => {
    if (!customerName.trim()) {
      showToast('กรุณาระบุชื่อลูกค้าก่อนส่งบิลนะคะ', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('กรุณาระบุรายการสินค้าในบิลอย่างน้อย 1 รายการค่ะ', 'error');
      return;
    }

    setSendingLine(true);
    try {
      const orderCode = await ensureOrderSaved();
      const canvas = canvasRef.current || drawBillCanvas();
      if (!canvas) throw new Error('ไม่พบรูปภาพบิล');

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('ไม่สามารถแปลงรูปภาพบิลได้');

      const fd = new FormData();
      fd.append('file', blob, `bill-${orderCode}.png`);
      fd.append('order_code', orderCode);
      fd.append('customer_name', customerName.trim());
      fd.append('total_amount', String(netTotal));

      const lineRes = await fetch('/api/admin/bills/send-line', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const lineData = await lineRes.json();

      if (!lineRes.ok || !lineData.ok) {
        if (lineData.not_configured) {
          showToast(
            'ยังไม่ได้ตั้งค่า LINE Messaging API ในเมนูตั้งค่า สามารถกดปุ่มแชร์ส่งให้ลูกค้าแทนได้ค่ะ',
            'info'
          );
        } else {
          showToast(lineData.error || 'ไม่สามารถส่งเข้า LINE ร้านได้', 'error');
        }
        return;
      }

      showToast(
        'ส่งรูปบิลเข้า LINE ของร้านเรียบร้อยแล้วค่ะ ♡ (เปิดแอป LINE ส่งต่อให้ลูกค้าได้เลยนะคะ)',
        'success'
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งรูปบิลเข้า LINE',
        'error'
      );
    } finally {
      setSendingLine(false);
    }
  };

  // คัดลอกข้อความสรุป
  const handleCopySummary = async () => {
    const text = buildSummaryMessage();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('คัดลอกข้อความสรุปบิลแล้วค่ะ ♡', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast('ไม่สามารถคัดลอกได้ กรุณาลองใหม่อีกครั้งค่ะ', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* ส่วนหัวหน้า */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div>
          <span className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1">
            <CuteFlower className="w-3.5 h-3.5" /> LINE Bill & Receipt Generator
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)] tracking-tight">
            ระบบออกบิลส่งไลน์ (ร้านเดี่ยว)
          </h1>
          <p className="text-xs text-[var(--color-secondary-muted)] mt-0.5">
            สร้างบิลรูปภาพสไตล์ qokhims สำหรับส่งลูกค้าทาง LINE เชื่อมต่อรายการสินค้าและบันทึกยอดขายเข้าระบบร้านอัตโนมัติ
          </p>
        </div>

        {lastCreatedOrder && (
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              บิลล่าสุด: <strong>{lastCreatedOrder.order_code}</strong> (บันทึกเข้าระบบแล้ว)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* คอลัมน์ซ้าย: ฟอร์มกรอกและเลือกรายการสินค้า */}
        <div className="lg:col-span-6 space-y-5">
          {/* ข้อมูลลูกค้าและวันส่งงาน */}
          <div className="bg-white rounded-3xl border border-[var(--color-border)] p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--color-primary)]" />
              1. ข้อมูลลูกค้า & กำหนดส่งงาน
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--color-secondary)] mb-1">
                  ชื่อลูกค้า <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="เช่น คุณแพรวา (ร้าน Sweet Bake)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] font-medium focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-secondary)] mb-1">
                  วันรับ/ส่งงาน (Delivery Date)
                </label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="เช่น 19 พ.ย. 2569 หรือ 1-2 วัน"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] font-medium focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-secondary)] mb-1">
                  วันที่สั่งซื้อ
                </label>
                <input
                  type="text"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] font-mono focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-secondary)] mb-1">
                  เวลาสั่งซื้อ
                </label>
                <input
                  type="text"
                  value={billTime}
                  onChange={(e) => setBillTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] font-mono focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-[var(--color-secondary)] mb-1">
                  รหัสสมาชิกสะสมแต้ม (ถ้ามี — สะสมแต้มให้อัตโนมัติเมื่อส่งงาน)
                </label>
                <input
                  type="text"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                  placeholder="เช่น PZ-4K9M"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs uppercase font-bold tracking-wider text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* ช่องหมายเหตุเพิ่มเติม (แสดงบนบิลเฉพาะเมื่อกรอก) */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[var(--color-secondary)] mb-1">
                  หมายเหตุเพิ่มเติม (แสดงบนบิลเฉพาะเมื่อกรอกข้อความ)
                </label>
                <textarea
                  rows={2}
                  value={billNote}
                  onChange={(e) => setBillNote(e.target.value)}
                  placeholder="เช่น แก้ไขงานได้ 2 ครั้ง / ส่งมอบไฟล์ผ่าน Google Drive (หากไม่กรอกจะซ่อนบล็อกนี้ในบิลอัตโนมัติ)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] font-medium focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* รายการสินค้าในบิล */}
          <div className="bg-white rounded-3xl border border-[var(--color-border)] p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[var(--color-primary)]" />
              2. รายการสินค้า & บริการในบิล ({items.length} รายการ)
            </h2>

            {/* เพิ่มจากรายการร้าน (รวมสินค้าที่ซ่อนอยู่บนเว็บ) */}
            <div className="space-y-2 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs">
              <span className="font-semibold text-[var(--color-secondary)] block">
                เลือกสินค้าจากระบบร้าน (รวมรายการที่ซ่อนจากเว็บ):
              </span>
              <div className="flex gap-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border)] text-xs text-[var(--color-secondary)] cursor-pointer"
                >
                  <option value="">-- เลือกสินค้า/บริการ/ฟอนต์ --</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.is_active === 0 ? '🔒 [ซ่อนจากเว็บ] ' : '🌐 '}
                      {p.title} — ฿{p.price}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddProductFromList}
                  disabled={!selectedProductId}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition disabled:opacity-50 cursor-pointer"
                >
                  เพิ่ม
                </button>
              </div>
            </div>

            {/* เพิ่มรายการเอง (+ เพิ่มรายการเอง เช่น ป้าย 109.-) */}
            <div className="space-y-2 p-3 rounded-2xl bg-[#fff8fa] border border-[#fce4ec] text-xs">
              <span className="font-semibold text-[var(--color-primary)] block">
                + เพิ่มรายการออกแบบตามสั่งเอง:
              </span>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="เช่น ป้าย 1 (ป้ายบัญชีโทนชมพู)"
                  className="col-span-7 px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border)] text-xs"
                />
                <input
                  type="number"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  placeholder="ราคา"
                  className="col-span-3 px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border)] text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="col-span-2 px-2 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer"
                >
                  เพิ่ม
                </button>
              </div>
            </div>

            {/* ตารางรายการปัจจุบัน */}
            <div className="space-y-2.5 divide-y divide-dashed divide-[var(--color-border)]">
              {items.map((it, idx) => (
                <div key={idx} className="pt-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={it.product_title}
                      onChange={(e) => handleUpdateItem(idx, { product_title: e.target.value })}
                      className="flex-1 font-bold text-[var(--color-secondary)] bg-transparent border-b border-transparent focus:border-[var(--color-primary)] focus:outline-none"
                    />

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-[var(--color-bg)] rounded-lg p-0.5 border border-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, { quantity: Math.max(1, it.quantity - 1) })}
                          className="px-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, { quantity: it.quantity + 1 })}
                          className="px-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-md text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={it.item_note || ''}
                      onChange={(e) => handleUpdateItem(idx, { item_note: e.target.value })}
                      placeholder="โน้ตย่อย (เช่น โทนพาสเทล, ฟอนต์ Baitoey)"
                      className="flex-1 text-[11px] text-[var(--color-secondary-muted)] bg-transparent border-b border-transparent focus:border-[var(--color-primary)] focus:outline-none italic"
                    />
                    <div className="text-[11px] text-[var(--color-secondary-muted)] shrink-0">
                      <span>@{it.unit_price} ฿</span>
                      <span className="mx-1">•</span>
                      <span>รวม: <strong className="text-[var(--color-secondary)]">฿{(it.quantity * it.unit_price).toFixed(2)}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ส่วนลดและยอดรวม (สลับ บาท / %) */}
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-secondary-muted)]">ยอดรวมก่อนลด:</span>
                <span className="font-semibold text-[var(--color-secondary)]">฿{subtotal.toFixed(2)}</span>
              </div>

              {/* ช่องกรอกส่วนลด พร้อมตัวเลือกสลับ บาท / % */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--color-primary)]">
                  <Tag className="w-3.5 h-3.5" />
                  <span>ส่วนลดพิเศษ:</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* ปุ่มสลับ บาท / % */}
                  <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5 bg-white text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDiscountType('baht')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        discountType === 'baht'
                          ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                          : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
                      }`}
                    >
                      ฿ บาท
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        discountType === 'percent'
                          ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                          : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
                      }`}
                    >
                      % เปอร์เซ็นต์
                    </button>
                  </div>

                  {/* ช่องกรอกจำนวน */}
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? 100 : subtotal}
                      value={discountValue}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        if (discountType === 'percent') {
                          setDiscountValue(Math.min(100, val));
                        } else {
                          setDiscountValue(Math.min(subtotal, val));
                        }
                      }}
                      className="w-24 px-2 py-1 rounded-lg bg-white border border-[var(--color-border)] text-right font-bold text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 px-1 font-semibold">
                  <span>คำนวณส่วนลด:</span>
                  <span>{discountLabel}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-2 border-t border-dashed border-[var(--color-border)]">
                <span className="font-bold text-[var(--color-secondary)]">ยอดสุทธิทั้งสิ้น:</span>
                <span className="text-xl font-extrabold text-[var(--color-primary)]">
                  ฿{netTotal.toFixed(2)} บาท
                </span>
              </div>
            </div>
          </div>

          {/* ตัวเลือกรูปแบบบิล: รวม QR ในบิล หรือ แยกการ์ด QR */}
          <div className="bg-white rounded-3xl border border-[var(--color-border)] p-4 shadow-xs space-y-2">
            <span className="text-xs font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[var(--color-primary)]" />
              การแสดงผล QR Code ชำระเงิน:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIncludeQrInBill(true)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  includeQrInBill
                    ? 'bg-[var(--color-primary-light)]/70 border-[var(--color-primary)] text-[var(--color-secondary)] font-bold'
                    : 'bg-white border-[var(--color-border)] text-[var(--color-secondary-muted)] hover:bg-[var(--color-bg)]'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <span>📄 บิลรวม QR Code</span>
                </div>
                <span className="text-[11px] font-normal block opacity-80 mt-0.5">
                  จบในภาพเดียว มี QR ท้ายบิล
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeQrInBill(false)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  !includeQrInBill
                    ? 'bg-[var(--color-primary-light)]/70 border-[var(--color-primary)] text-[var(--color-secondary)] font-bold'
                    : 'bg-white border-[var(--color-border)] text-[var(--color-secondary-muted)] hover:bg-[var(--color-bg)]'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <span>📑 แยกบิล + การ์ด QR</span>
                </div>
                <span className="text-[11px] font-normal block opacity-80 mt-0.5">
                  แยกเป็น 2 ภาพ (บิลกะทัดรัด + การ์ด QR)
                </span>
              </button>
            </div>
          </div>

          {/* ปุ่มควบคุมการส่งบิล (LINE Push, บันทึกรูปบิล, แชร์บิล, คัดลอกสรุป) */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleSendBillToLine}
              disabled={sendingLine || saving}
              className="w-full px-6 py-3.5 rounded-full bg-[#06C755] text-white text-sm font-bold hover:opacity-95 transition shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {sendingLine ? 'กำลังส่งรูปบิลเข้า LINE ร้าน...' : 'ส่งบิลเข้าไลน์ร้าน (LINE Messaging API)'}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSaveBillImage}
                disabled={saving}
                className="pkz-order-btn px-4 py-3 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 transition shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึกรูปบิล'}
              </button>

              <button
                type="button"
                onClick={handleWebShare}
                className="px-4 py-3 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary)] text-xs font-semibold hover:bg-[var(--color-primary-light)] transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Share2 className="w-4 h-4 text-[var(--color-primary)]" />
                แชร์บิล (Share)
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-4 py-3 rounded-full bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'คัดลอกแล้ว!' : 'คัดลอกสรุป'}
              </button>
            </div>

            {/* ปุ่มเพิ่มเติมกรณีเลือกแยกการ์ด QR Code */}
            {!includeQrInBill && (
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveQrCardImage}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-bold hover:bg-[var(--color-primary-light)] transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  บันทึกการ์ด QR Code แยก
                </button>
              </div>
            )}
          </div>
        </div>

        {/* คอลัมน์ขวา: พรีวิวบิลแบบรูปภาพสไตล์ qokhims */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              ตัวอย่างบิลรูปภาพสไตล์ qokhims (Live Preview)
            </span>
            <span className="text-[11px] text-[var(--color-secondary-muted)]">
              ความกว้าง 760px
            </span>
          </div>

          <div className="p-3 sm:p-5 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)] shadow-xs flex flex-col items-center gap-4 overflow-x-auto">
            {/* Canvas บิลหลัก */}
            <canvas
              ref={canvasRef}
              width={760}
              height={800}
              className="max-w-full h-auto rounded-2xl shadow-md border border-[var(--color-border)]/70 bg-white"
            />

            {/* Canvas การ์ด QR แยก (กรณีเลือกแยก) */}
            {!includeQrInBill && (
              <div className="w-full pt-2 border-t border-dashed border-[var(--color-border)] space-y-2 text-center">
                <span className="text-xs font-bold text-[var(--color-primary)] inline-flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" /> ตัวอย่างการ์ด QR ชำระเงิน (แยกไฟล์):
                </span>
                <canvas
                  ref={qrCanvasRef}
                  width={520}
                  height={560}
                  className="max-w-[85%] mx-auto h-auto rounded-2xl shadow-md border border-[var(--color-border)]/70 bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal พรีวิวภาพสำหรับ iPad/Safari & มือถือ (แตะค้างเพื่อบันทึกลงแอปรูปภาพได้ทันที) */}
      {previewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-xl border-2 border-[var(--color-border)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <span className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[var(--color-primary)]" />
                {previewModal.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="p-1 rounded-full text-[var(--color-secondary-muted)] hover:bg-[var(--color-bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1">
                💡 สำหรับ iPad และ iPhone (Safari):
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                กรุณา <strong>แตะค้างที่รูปภาพด้านล่าง</strong> แล้วเลือกเมนู <strong>"บันทึกลงในแอปรูปภาพ" (Save to Photos)</strong> เพื่อจัดเก็บรูปภาพเข้าเครื่องได้ทันทีค่ะ
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs bg-[#fdf8f5]">
              <img
                src={previewModal.url}
                alt={previewModal.title}
                className="w-full h-auto object-contain max-h-[60vh] select-auto"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <a
                href={previewModal.url}
                download={previewModal.filename}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลดไฟล์รูปภาพ
              </a>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="px-4 py-2.5 rounded-full bg-[var(--color-bg)] text-[var(--color-secondary)] text-xs font-semibold hover:bg-[var(--color-primary-light)] transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
