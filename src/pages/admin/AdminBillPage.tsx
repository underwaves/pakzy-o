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
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useSite } from '../../context/SiteContext';
import {
  CuteHeart,
  CuteFlower,
  CuteSparkle,
  BrandWordmark,
} from '../../components/ui/Decorations';
import { drawQokhimsReceiptToCanvas } from '../../utils/receiptCanvas';
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

  // ส่วนลด (บาท)
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // ฟอร์มเพิ่มรายการจากสินค้าที่มี
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // ฟอร์มเพิ่มรายการเอง
  const [customTitle, setCustomTitle] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(109);

  // State การทำงาน
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<{ id: number; order_code: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const netTotal = Math.max(0, subtotal - (Number(discountAmount) || 0));

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

  // วาดบิลลงบน Canvas ตามดีไซน์ร่วมกัน (สไตล์ qokhims)
  const drawBillCanvas = (): HTMLCanvasElement | null => {
    const canvas = canvasRef.current || document.createElement('canvas');
    drawQokhimsReceiptToCanvas(canvas, {
      siteName: settings.site_name || 'pakzy.o',
      tagline: settings.site_tagline || 'Font by pakzy 🌸 รับออกแบบงานต่างๆ',
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
      netTotal,
      promptPayNumber: settings.promptpay_number || '0812345678',
      bankName: settings.bank_name || 'ธนาคารกสิกรไทย (KBANK)',
      bankAccountNumber: settings.bank_account_number || '123-4-56789-0',
      bankAccountName: settings.bank_account_name || 'น.ส. พักตร์ปรียา (pakzy.o)',
    });
    return canvas;
  };

  const [sendingLine, setSendingLine] = useState(false);

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
      // 1. ตรวจสอบว่าบันทึกบิลลงระบบแล้วหรือยัง ถ้ายังให้บันทึกก่อน
      let orderCode = lastCreatedOrder?.order_code;
      if (!orderCode) {
        const summaryText = buildSummaryMessage();
        const res = await fetch('/api/admin/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            customer_name: customerName.trim(),
            customer_contact: 'LINE',
            due_date: dueDate.trim(),
            discount_amount: Number(discountAmount) || 0,
            summary_text: summaryText,
            items: items.map((it) => ({
              product_id: it.product_id,
              product_title: it.product_title,
              category_type: it.category_type,
              quantity: it.quantity,
              unit_price: it.unit_price,
              item_note: it.item_note,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'บันทึกบิลไม่สำเร็จ');
        setLastCreatedOrder(data.order);
        orderCode = data.order.order_code;
        await refreshSiteData();
      }

      // 2. ดึงรูป PNG จาก Canvas
      const canvas = canvasRef.current || drawBillCanvas();
      if (!canvas) throw new Error('ไม่พบรูปภาพบิล');

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('ไม่สามารถแปลงรูปภาพบิลได้');

      // 3. ยิงไปที่ /api/admin/bills/send-line
      const fd = new FormData();
      fd.append('file', blob, `bill-${orderCode || 'BILL'}.png`);
      fd.append('order_code', orderCode || 'BILL');
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
            'ยังไม่ได้ตั้งค่า LINE Messaging API ในเมนูตั้งค่าหลังบ้าน สามารถดาวน์โหลด PNG หรือกดปุ่มแชร์ส่งให้ลูกค้าแทนได้ค่ะ',
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

  // แชร์บิลผ่าน Web Share API
  const handleWebShare = async () => {
    const canvas = canvasRef.current || drawBillCanvas();
    if (!canvas) return;

    try {
      if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `pakzy-bill-${billDate}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `บิลสั่งซื้อร้าน ${settings.site_name || 'pakzy.o'}`,
              text: buildSummaryMessage(),
              files: [file],
            });
            showToast('แชร์รูปบิลเรียบร้อยแล้วค่ะ ♡', 'success');
          } else {
            await navigator.share({
              title: `บิลสั่งซื้อร้าน ${settings.site_name || 'pakzy.o'}`,
              text: buildSummaryMessage(),
            });
          }
        }, 'image/png');
      } else {
        showToast('เบราว์เซอร์นี้ไม่รองรับ Web Share สามารถกดดาวน์โหลดรูป PNG แทนได้เลยค่ะ', 'info');
      }
    } catch {
      // ยกเลิกการแชร์
    }
  };

  // วาดพรีวิวทุกครั้งที่ข้อมูลเปลี่ยน
  useEffect(() => {
    drawBillCanvas();
  }, [items, customerName, dueDate, billDate, billTime, discountAmount, netTotal, settings]);

  // สร้างข้อความสรุปบิลสำหรับส่งไลน์
  const buildSummaryMessage = (orderCode?: string) => {
    const code = orderCode || lastCreatedOrder?.order_code || 'PKZ-DRAFT';
    const itemLines = items
      .map((it, idx) => `${idx + 1}. ${it.product_title} x${it.quantity} (${it.unit_price} ฿)`)
      .join('\n');

    return `🌸 สรุปบิลสั่งซื้อร้าน ${settings.site_name || 'pakzy.o'} 🌸
รหัสบิล: ${code}
วันที่: ${billDate} เวลา: ${billTime}
👤 ลูกค้า: ${customerName || '-'}
📅 วันรับ/ส่งงาน: ${dueDate || '-'}
---------------------------------
📦 รายการ:
${itemLines}
${discountAmount > 0 ? `🎟️ ส่วนลด: -${discountAmount} บาท\n` : ''}💰 รวมทั้งสิ้น: ${netTotal.toFixed(2)} บาท
---------------------------------
🏦 ธนาคาร: ${settings.bank_name || 'กสิกรไทย'}
เลขที่บัญชี: ${settings.bank_account_number || '123-4-56789-0'}
ชื่อบัญชี: ${settings.bank_account_name || 'pakzy.o'}
PromptPay: ${settings.promptpay_number || '081-234-5678'}

แจ้งหลักฐานการชำระเงินทุกครั้งนะคะ ♡
ไม่ชำระเงินใน 1 ชม. สอบถามคิวอีกรอบน้า
✨ THANK YOU ✨`;
  };

  // คัดลอกข้อความสรุป
  const handleCopySummary = async () => {
    const text = buildSummaryMessage();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('คัดลอกข้อความสรุปบิลส่งไลน์แล้วค่ะ ♡', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast('ไม่สามารถคัดลอกได้ กรุณาลองใหม่อีกครั้งค่ะ', 'error');
    }
  };

  // บันทึกบิลลง D1 (orders channel = 'line_bill') และดาวน์โหลดรูป PNG
  const handleSaveBillAndDownloadPng = async () => {
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
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถบันทึกบิลได้');
      }

      setLastCreatedOrder(data.order);

      // สร้างและดาวน์โหลดรูป PNG จาก Canvas
      const canvas = drawBillCanvas();
      if (canvas) {
        const link = document.createElement('a');
        link.download = `pakzy-bill-${data.order.order_code}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }

      // คัดลอกข้อความสรุปด้วยเพื่อความสะดวก
      if (navigator.clipboard) {
        navigator.clipboard.writeText(buildSummaryMessage(data.order.order_code)).catch(() => {});
      }

      showToast(
        `บันทึกบิล ${data.order.order_code} เข้าระบบและดาวน์โหลดรูป PNG เรียบร้อยแล้วค่ะ ♡`,
        'success'
      );
      refreshSiteData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกบิล', 'error');
    } finally {
      setSaving(false);
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
                  placeholder="เช่น 11 พ.ย. 2569 หรือ 1-2 วัน"
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
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border)] text-xs text-[var(--color-secondary)]"
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
            <div className="space-y-2 divide-y divide-dashed divide-[var(--color-border)]">
              {items.map((it, idx) => (
                <div key={idx} className="pt-2 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={it.product_title}
                      onChange={(e) => handleUpdateItem(idx, { product_title: e.target.value })}
                      className="w-full font-bold text-[var(--color-secondary)] bg-transparent border-b border-transparent focus:border-[var(--color-primary)] focus:outline-none"
                    />
                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-secondary-muted)] mt-0.5">
                      <span>฿{it.unit_price} ต่อหน่วย</span>
                      <span>•</span>
                      <span>รวม: <strong>฿{(it.quantity * it.unit_price).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--color-bg)] rounded-lg p-0.5 border border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, { quantity: Math.max(1, it.quantity - 1) })}
                        className="px-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-xs">{it.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, { quantity: it.quantity + 1 })}
                        className="px-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 rounded-md text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ส่วนลดและยอดรวม */}
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-secondary-muted)]">ยอดรวมก่อนลด:</span>
                <span className="font-semibold text-[var(--color-secondary)]">฿{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-primary)] font-semibold flex items-center gap-1">
                  <Tag className="w-3 h-3" /> ส่วนลดพิเศษ (บาท):
                </span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-right font-bold text-xs text-[var(--color-primary)]"
                />
              </div>
              <div className="flex items-center justify-between text-sm pt-1 border-t border-dashed border-[var(--color-border)]">
                <span className="font-bold text-[var(--color-secondary)]">ยอดสุทธิทั้งสิ้น:</span>
                <span className="text-lg font-extrabold text-[var(--color-primary)]">
                  ฿{netTotal.toFixed(2)} บาท
                </span>
              </div>
            </div>
          </div>

          {/* ปุ่มควบคุมการส่งบิล (LINE Push, ดาวน์โหลด PNG, Web Share, คัดลอกสรุป) */}
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
                onClick={handleSaveBillAndDownloadPng}
                disabled={saving}
                className="pkz-order-btn px-4 py-3 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 transition shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {saving ? 'กำลังโหลด...' : 'ดาวน์โหลด PNG'}
              </button>

              <button
                type="button"
                onClick={handleWebShare}
                className="px-4 py-3 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary)] text-xs font-semibold hover:bg-[var(--color-primary-light)] transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[var(--color-primary)]" />
                แชร์บิล (Share)
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-4 py-3 rounded-full bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'คัดลอกแล้ว!' : 'คัดลอกสรุป'}
              </button>
            </div>
          </div>
        </div>

        {/* คอลัมน์ขวา: พรีวิวบิลแบบรูปภาพสไตล์ qokhims */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              ตัวอย่างบิลรูปภาพที่จะส่งให้ลูกค้า (Live Canvas Preview)
            </span>
            <span className="text-[11px] text-[var(--color-secondary-muted)]">
              ความกว้าง 680px
            </span>
          </div>

          <div className="p-3 sm:p-5 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)] shadow-xs flex justify-center overflow-x-auto">
            <canvas
              ref={canvasRef}
              width={680}
              height={780}
              className="max-w-full h-auto rounded-2xl shadow-md border border-[var(--color-border)]/60 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
