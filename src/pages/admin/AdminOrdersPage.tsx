import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Copy,
  Trash2,
  User,
  Phone,
  Mail,
  FileText,
  Gift,
  Link as LinkIcon,
  CheckCircle2,
  Coins,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  Image as ImageIcon,
  Check,
  Eye,
  X,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { OrderRecord } from '../../types';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../../components/ui/States';
import { CuteHeart, CuteSparkle } from '../../components/ui/Decorations';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'รอดำเนินการ', badgeClass: 'bg-amber-100 text-amber-800' },
  { value: 'confirmed', label: 'รับงานแล้ว / แจ้งคิว', badgeClass: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'กำลังออกแบบ', badgeClass: 'bg-purple-100 text-purple-800' },
  { value: 'completed', label: 'ส่งงานเรียบร้อย', badgeClass: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'ยกเลิกคำสั่งซื้อ', badgeClass: 'bg-gray-100 text-gray-600' },
];

export const AdminOrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'web' | 'line_bill'>('all');

  // Modal ผูกรหัสสมาชิกย้อนหลัง
  const [linkingOrder, setLinkingOrder] = useState<OrderRecord | null>(null);
  const [memberCodeInput, setMemberCodeInput] = useState('');
  const [linking, setLinking] = useState(false);

  // Modal ดูรูปสลิป
  const [slipModalUrl, setSlipModalUrl] = useState<string | null>(null);
  const [selectedSlipOrder, setSelectedSlipOrder] = useState<OrderRecord | null>(null);
  const [verifyingSlip, setVerifyingSlip] = useState(false);

  // State สำหรับแก้ไข drive link แต่ละออเดอร์
  const [driveLinks, setDriveLinks] = useState<Record<number, string>>({});
  const [savingDriveId, setSavingDriveId] = useState<number | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const loadedOrders: OrderRecord[] = data.orders || [];
        setOrders(loadedOrders);

        // sync initial drive links
        const linkMap: Record<number, string> = {};
        loadedOrders.forEach((o) => {
          if (o.drive_link) linkMap[o.id] = o.drive_link;
        });
        setDriveLinks(linkMap);

        // update selectedSlipOrder if open
        if (selectedSlipOrder) {
          const fresh = loadedOrders.find((o) => o.id === selectedSlipOrder.id);
          if (fresh) setSelectedSlipOrder(fresh);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySlip = async (orderId: number) => {
    setVerifyingSlip(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/verify-slip`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ตรวจสอบสลิปล้มเหลว');
      }
      showToast(data.message || 'ตรวจสลิปอัตโนมัติสำเร็จแล้วค่ะ ♡', 'success');
      await loadOrders();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสลิป',
        'error'
      );
      await loadOrders();
    } finally {
      setVerifyingSlip(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (order: OrderRecord, nextStatus: string) => {
    if (nextStatus === 'completed' && order.member_code && (order.points_awarded || 0) === 0) {
      const confirmPoints = window.confirm(
        `คำสั่งซื้อนี้ผูกกับสมาชิก ${order.member_code} (${order.member_display_name || order.customer_name})\n\nเมื่อเปลี่ยนเป็น "ส่งงานเรียบร้อย" ระบบจะคำนวณและแจกแต้มสะสม (${order.estimated_points || Math.floor(order.total_amount / 10)} แต้ม) เข้าบัญชีลูกค้าอัตโนมัติ ยืนยันหรือไม่คะ?`
      );
      if (!confirmPoints) return;
    } else if (order.status === 'completed' && nextStatus !== 'completed' && (order.points_awarded || 0) > 0) {
      const confirmRevert = window.confirm(
        `คำสั่งซื้อนี้เคยแจกแต้มไปแล้ว ${order.points_awarded} แต้ม\n\nหากเปลี่ยนสถานะกลับจาก "ส่งงานเรียบร้อย" ระบบจะหักแต้มสะสมคืนจากบัญชีลูกค้าอัตโนมัติ ยืนยันหรือไม่คะ?`
      );
      if (!confirmRevert) return;
    }

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  status: nextStatus as OrderRecord['status'],
                  points_awarded:
                    data.points_awarded !== undefined
                      ? data.points_awarded
                      : nextStatus === 'completed'
                      ? o.estimated_points || o.points_awarded
                      : 0,
                  points_awarded_at: data.points_awarded_at || o.points_awarded_at,
                }
              : o
          )
        );
        showToast(data.message || 'อัปเดตสถานะคำสั่งซื้อเรียบร้อยแล้วค่ะ ♡', 'success');
      } else {
        throw new Error(data.error || 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  const handleSaveDriveLink = async (orderId: number) => {
    const link = driveLinks[orderId]?.trim() || '';
    setSavingDriveId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/drive-link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          drive_link: link,
          status: link ? 'completed' : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกลิงก์ไม่สำเร็จ');

      showToast(data.message || 'บันทึกลิงก์ Google Drive แล้วค่ะ ♡', 'success');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                drive_link: link,
                status: (data.status || (link ? 'completed' : o.status)) as OrderRecord['status'],
                points_awarded: data.points_awarded ?? o.points_awarded,
              }
            : o
        )
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'บันทึกลิงก์ไม่สำเร็จ', 'error');
    } finally {
      setSavingDriveId(null);
    }
  };

  const handleLinkMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingOrder) return;
    const cleanCode = memberCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      showToast('กรุณากรอกรหัสสมาชิก PZ-XXXX', 'error');
      return;
    }

    setLinking(true);
    try {
      const res = await fetch(`/api/admin/orders/${linkingOrder.id}/link-member`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ member_code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ผูกรหัสสมาชิกไม่สำเร็จ');

      showToast(data.message || 'ผูกรหัสสมาชิกเรียบร้อยแล้วค่ะ ♡', 'success');
      setLinkingOrder(null);
      setMemberCodeInput('');
      loadOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ผูกรหัสสมาชิกไม่สำเร็จ', 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleDeleteOrder = async (order: OrderRecord) => {
    if (!window.confirm(`ยืนยันการลบคำสั่งซื้อรหัส ${order.order_code} ใช่หรือไม่คะ?`))
      return;
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        showToast('ลบคำสั่งซื้อเรียบร้อยแล้ว', 'info');
      }
    } catch {
      showToast('ลบคำสั่งซื้อไม่สำเร็จ', 'error');
    }
  };

  const handleCopySummary = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('คัดลอกข้อความสรุปออเดอร์แล้วค่ะ', 'success');
    } catch {
      showToast('ไม่สามารถคัดลอกได้', 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesChannel =
      channelFilter === 'all' ||
      (channelFilter === 'web' && (!o.channel || o.channel === 'web')) ||
      (channelFilter === 'line_bill' && o.channel === 'line_bill');
    return matchesStatus && matchesChannel;
  });

  if (loading) {
    return <LoadingState message="กำลังโหลดรายการคำสั่งซื้อทั้งหมด..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-secondary)]">
            รายการคำสั่งซื้อ ({orders.length})
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
            ตรวจสอบรายละเอียดบรีฟ ตรวจสลิปโอนเงิน ส่งมอบลิงก์ Google Drive และแจกแต้มสะสม
          </p>
        </div>

        {/* ตัวกรองช่องทาง & สถานะ */}
        <div className="flex flex-wrap items-center gap-2">
          {/* กรองช่องทาง */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[var(--color-border)] text-xs">
            <button
              type="button"
              onClick={() => setChannelFilter('all')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                channelFilter === 'all' ? 'bg-[var(--color-secondary)] text-white' : 'text-[var(--color-secondary-muted)]'
              }`}
            >
              ทุกช่องทาง
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('web')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                channelFilter === 'web' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-secondary-muted)]'
              }`}
            >
              🌐 สั่งผ่านเว็บ ({orders.filter((o) => !o.channel || o.channel === 'web').length})
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('line_bill')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                channelFilter === 'line_bill' ? 'bg-purple-600 text-white' : 'text-[var(--color-secondary-muted)]'
              }`}
            >
              💬 บิลส่งไลน์ ({orders.filter((o) => o.channel === 'line_bill').length})
            </button>
          </div>

          {/* กรองสถานะ */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[var(--color-secondary)] text-white'
                  : 'bg-white border border-[var(--color-border)] text-[var(--color-secondary)]'
              }`}
            >
              ทุกสถานะ
            </button>
            {STATUS_OPTIONS.map((st) => (
              <button
                key={st.value}
                onClick={() => setStatusFilter(st.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                  statusFilter === st.value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-white border border-[var(--color-border)] text-[var(--color-secondary)]'
                }`}
              >
                {st.label} ({orders.filter((o) => o.status === st.value).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="ไม่มีคำสั่งซื้อในเงื่อนไขที่เลือก"
          description="เมื่อลูกค้าสั่งซื้อผ่านเว็บ หรือแอดมินออกบิลส่งไลน์ ข้อมูลจะแสดงที่นี่ทันทีค่ะ"
        />
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const currentBadge =
              STATUS_OPTIONS.find((s) => s.value === order.status) || STATUS_OPTIONS[0];
            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-[var(--color-border)] p-5 sm:p-6 shadow-2xs space-y-4"
              >
                {/* แถวหัวออเดอร์ */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold font-mono">
                      {order.order_code}
                    </span>

                    {/* ช่องทาง */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        order.channel === 'line_bill'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {order.channel === 'line_bill' ? '💬 บิลส่งไลน์' : '🌐 สั่งผ่านเว็บ'}
                    </span>

                    {/* สถานะออเดอร์ */}
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-semibold ${currentBadge.badgeClass}`}
                    >
                      {currentBadge.label}
                    </span>

                    {/* สถานะสลิป */}
                    {order.slip_url ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSlipModalUrl(order.slip_url || null);
                          setSelectedSlipOrder(order);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                          order.slip_verified === 1
                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                            : order.slip_verified === -1
                            ? 'bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100'
                            : 'bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100'
                        }`}
                        title="คลิกเพื่อตรวจดูรูปสลิปและผลตรวจอัตโนมัติ"
                      >
                        {order.slip_verified === 1 ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> สลิปตรวจผ่านแล้ว ✓
                          </>
                        ) : order.slip_verified === -1 ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> สลิปไม่ผ่าน
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" /> แนบสลิปแล้ว (ตรวจสลิป)
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-[var(--color-secondary-muted)]">
                        (ยังไม่แนบสลิป)
                      </span>
                    )}

                    <span className="text-xs text-[var(--color-secondary-muted)]">
                      สั่งเมื่อ:{' '}
                      {new Date(order.created_at).toLocaleString('th-TH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>

                    {/* ป้ายแสดงสถานะรหัสสมาชิก & แต้มสะสม */}
                    {order.member_code ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold inline-flex items-center gap-1">
                        <Gift className="w-3 h-3 text-[var(--color-primary)]" />
                        สมาชิก: {order.member_code}
                        {order.member_display_name ? ` (${order.member_display_name})` : ''}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setLinkingOrder(order);
                          setMemberCodeInput('');
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-gray-100 hover:bg-[var(--color-primary-light)] border border-dashed border-gray-300 hover:border-[var(--color-primary)] text-xs text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)] font-medium inline-flex items-center gap-1 transition cursor-pointer"
                        title="ผูกรหัสสมาชิก PZ-XXXX เพื่อรับแต้ม"
                      >
                        <LinkIcon className="w-3 h-3 text-[var(--color-primary)]" />
                        + ผูกรหัสสมาชิก
                      </button>
                    )}
                  </div>

                  {/* เปลี่ยนสถานะ & ปุ่มจัดการ */}
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`เปลี่ยนสถานะออเดอร์ ${order.order_code}`}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)] cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>
                          สถานะ: {st.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleCopySummary(order.summary_text)}
                      className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition cursor-pointer"
                      title="คัดลอกข้อความสรุปออเดอร์"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteOrder(order)}
                      className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="ลบออเดอร์"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ข้อมูลลูกค้าและรายการสินค้า */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-sm">
                  <div className="lg:col-span-5 space-y-2 bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]/70">
                    <div className="font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[var(--color-primary)]" />
                      {order.customer_name}
                    </div>
                    <div className="text-xs text-[var(--color-secondary)] font-medium">
                      💬 ช่องทางติดต่อ: {order.customer_contact}
                    </div>
                    {order.customer_phone && (
                      <div className="text-xs text-[var(--color-secondary-muted)] flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {order.customer_phone}
                      </div>
                    )}
                    {order.customer_email && (
                      <div className="text-xs text-[var(--color-secondary-muted)] flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {order.customer_email}
                      </div>
                    )}
                    {order.due_date && (
                      <div className="text-xs text-[var(--color-primary)] font-bold">
                        📅 วันรับ/ส่งงาน: {order.due_date}
                      </div>
                    )}
                    {order.custom_brief && (
                      <div className="pt-2 border-t border-[var(--color-border)] text-xs">
                        <span className="font-semibold text-[var(--color-primary)] flex items-center gap-1 mb-0.5">
                          <FileText className="w-3.5 h-3.5" /> บรีฟงานเพิ่มเติม:
                        </span>
                        <p className="text-[var(--color-secondary)] whitespace-pre-line">
                          {order.custom_brief}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[var(--color-secondary-muted)] flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        รายการสินค้าในคำสั่งซื้อ:
                      </div>
                      <div className="divide-y divide-[var(--color-border)]/60">
                        {(order.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="py-2 flex items-start justify-between gap-2 text-xs sm:text-sm"
                          >
                            <div>
                              <span className="font-semibold text-[var(--color-secondary)]">
                                {idx + 1}. {item.product_title}
                              </span>{' '}
                              <span className="text-[var(--color-primary)] font-bold">
                                x{item.quantity}
                              </span>
                              {item.item_note && (
                                <p className="text-xs text-[var(--color-secondary-muted)]">
                                  ↳ หมายเหตุ: {item.item_note}
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-[var(--color-secondary)] shrink-0">
                              ฿{(item.quantity * item.unit_price).toLocaleString('th-TH')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                          ยอดรวมทั้งสิ้น:
                        </span>
                        <span className="text-lg font-bold text-[var(--color-primary)]">
                          ฿{Number(order.total_amount).toLocaleString('th-TH')} บาท
                        </span>
                      </div>

                      {order.member_code && (
                        <div className="text-xs">
                          {order.points_awarded && order.points_awarded > 0 ? (
                            <span className="px-2.5 py-1 rounded-xl bg-green-100 text-green-800 font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              แจกแต้มแล้ว: +{order.points_awarded} แต้ม
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold inline-flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-amber-600" />
                              แต้มเมื่อส่งงาน: ~{order.estimated_points || Math.floor(order.total_amount / 10)} แต้ม
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ส่วนส่งมอบไฟล์ Google Drive ให้ลูกค้า */}
                <div className="p-3.5 rounded-2xl bg-[var(--color-primary-light)]/45 border border-[var(--color-border)] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-[var(--color-primary)]" />
                      ส่งมอบไฟล์งานผ่าน Google Drive:
                    </label>
                    {order.drive_link && (
                      <a
                        href={order.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[var(--color-primary)] underline inline-flex items-center gap-1"
                      >
                        เปิดโฟลเดอร์ Google Drive <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={driveLinks[order.id] ?? ''}
                      onChange={(e) =>
                        setDriveLinks((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="ใส่ลิงก์ Google Drive ของออเดอร์นี้ เช่น https://drive.google.com/drive/folders/..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border)] text-xs text-[var(--color-secondary)] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveDriveLink(order.id)}
                      disabled={savingDriveId === order.id}
                      className="px-4 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {savingDriveId === order.id ? 'กำลังบันทึก...' : 'บันทึกลิงก์ & ส่งงาน'}
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--color-secondary-muted)]">
                    เมื่อบันทึกลิงก์ ลูกค้าจะเห็นปุ่มดาวน์โหลดไฟล์ในหน้าติดตามออเดอร์ทันที และสถานะจะเปลี่ยนเป็น "ส่งงานเรียบร้อย" พร้อมแจกแต้มสะสมให้อัตโนมัติค่ะ ♡
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ดูรูปสลิป */}
      {slipModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[var(--color-primary)]" />
                รูปสลิปการโอนเงิน {selectedSlipOrder ? `(${selectedSlipOrder.order_code})` : ''}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSlipModalUrl(null);
                  setSelectedSlipOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* กล่องแสดงสถานะผลการตรวจสลิป */}
            {selectedSlipOrder && (
              selectedSlipOrder.slip_verified === 1 ? (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    สลิปผ่านการตรวจสอบอัตโนมัติแล้ว ✓
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-emerald-700 pt-1">
                    <div>รหัสอ้างอิง (TransRef): <strong className="font-mono">{selectedSlipOrder.slip_trans_ref || '-'}</strong></div>
                    <div>ยอดในออเดอร์: <strong>฿{selectedSlipOrder.total_amount.toLocaleString('th-TH')}</strong></div>
                  </div>
                  {selectedSlipOrder.slip_verify_note && (
                    <p className="text-[11px] text-emerald-600 border-t border-emerald-200/60 pt-1">
                      {selectedSlipOrder.slip_verify_note}
                    </p>
                  )}
                </div>
              ) : selectedSlipOrder.slip_verified === -1 ? (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    การตรวจสอบสลิปอัตโนมัติไม่ผ่าน ⚠️
                  </div>
                  <p className="text-[11px] text-rose-700">
                    สาเหตุ: <strong>{selectedSlipOrder.slip_verify_note || 'ข้อมูลในสลิปไม่ตรงกับยอดคำสั่งซื้อหรือบัญชีร้าน'}</strong>
                  </p>
                  {selectedSlipOrder.slip_trans_ref && (
                    <p className="text-[11px] text-rose-600 font-mono">
                      รหัสอ้างอิง: {selectedSlipOrder.slip_trans_ref}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    ยังไม่ได้ตรวจสลิปอัตโนมัติ (หรือระบบปิดอยู่)
                  </div>
                  <p className="text-[11px] text-amber-700">
                    คุณสามารถกดปุ่ม "ตรวจสลิปอัตโนมัติ" ด้านล่างเพื่อให้ระบบช่วยเช็คยอดเงินและรหัสอ้างอิงธนาคารได้ทันทีค่ะ
                  </p>
                </div>
              )
            )}

            <div className="max-h-[60vh] overflow-auto rounded-2xl border border-[var(--color-border)] p-1 bg-[var(--color-bg)] flex justify-center">
              <img
                src={slipModalUrl}
                alt="รูปสลิปโอนเงิน"
                className="max-w-full h-auto rounded-xl object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
              <a
                href={slipModalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary)] text-xs font-semibold hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                เปิดดูขนาดเต็ม
              </a>

              {selectedSlipOrder && (
                <button
                  type="button"
                  onClick={() => handleVerifySlip(selectedSlipOrder.id)}
                  disabled={verifyingSlip}
                  className="px-5 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifyingSlip ? 'animate-spin' : ''}`} />
                  {verifyingSlip ? 'กำลังตรวจสอบสลิป...' : '⚡ ตรวจสลิปอัตโนมัติ'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal ผูกรหัสสมาชิกย้อนหลัง */}
      {linkingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleLinkMemberSubmit}
            className="bg-white rounded-3xl border border-[var(--color-border)] max-w-md w-full p-6 shadow-xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-[var(--color-primary)]" />
                ผูกรหัสสมาชิก: {linkingOrder.order_code}
              </h3>
              <button
                type="button"
                onClick={() => setLinkingOrder(null)}
                className="text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--color-secondary-muted)]">
              หากลูกค้าลืมใส่รหัสสมาชิกตอนสั่งซื้อ แอดมินสามารถนำรหัส <strong>PZ-XXXX</strong> ของลูกค้ามาผูกย้อนหลังได้ เพื่อให้ลูกค้าได้รับแต้มเมื่อออเดอร์เสร็จสิ้นค่ะ
            </p>

            <div>
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                รหัสสมาชิก PZ-XXXX
              </label>
              <input
                type="text"
                required
                value={memberCodeInput}
                onChange={(e) => setMemberCodeInput(e.target.value.toUpperCase())}
                placeholder="เช่น PZ-7K4M"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-mono tracking-wider font-bold text-[var(--color-secondary)] uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setLinkingOrder(null)}
                className="px-4 py-2 rounded-full border border-[var(--color-border)] text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={linking}
                className="px-5 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 transition cursor-pointer"
              >
                {linking ? 'กำลังผูก...' : 'ยืนยันการผูกรหัส'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
