import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Package,
  Type,
  Star,
  ArrowRight,
  Clock,
  Settings,
  Users,
  Gift,
  Coins,
  Award,
} from 'lucide-react';
import type { OrderRecord } from '../../types';
import { LoadingState } from '../../components/ui/States';
import { CuteHeart, CuteSparkle } from '../../components/ui/Decorations';

interface DashboardStats {
  total_products: number;
  total_fonts: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  total_reviews: number;
  avg_rating: number;
  total_members?: number;
  total_points_issued?: number;
  total_points_redeemed?: number;
  pending_redemptions?: number;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'รอดำเนินการ', className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'รับงานแล้ว', className: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'กำลังออกแบบ', className: 'bg-purple-100 text-purple-800' },
  completed: { label: 'ส่งงานเรียบร้อย', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ยกเลิก', className: 'bg-gray-100 text-gray-600' },
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats || null);
        setRecentOrders(data.recentOrders || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="กำลังโหลดข้อมูลภาพรวมหลังบ้าน..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
            ภาพรวมระบบร้าน pakzy.o <CuteHeart className="w-5 h-5 text-[var(--color-primary)]" />
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
            จัดการสินค้า บริการ ฟอนต์ คำสั่งซื้อ รีวิว สมาชิกสะสมแต้ม และการตั้งค่าเว็บไซต์ในที่เดียว
          </p>
        </div>

        <Link
          to="/admin/settings"
          className="px-4 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1.5 shadow-2xs"
        >
          <Settings className="w-4 h-4 text-[var(--color-primary)]" />
          ตั้งค่าชื่อร้าน & ธีมสี
        </Link>
      </div>

      {/* การ์ดสถิติหลัก */}
      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/orders"
              className="bg-white p-5 rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  คำสั่งซื้อทั้งหมด
                </span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-secondary)]">
                {stats.total_orders} รายการ
              </div>
              <div className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                รอดำเนินการ {stats.pending_orders} รายการ
              </div>
            </Link>

            <Link
              to="/admin/products"
              className="bg-white p-5 rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  สินค้าและบริการ
                </span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)]">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-secondary)]">
                {stats.total_products} รายการ
              </div>
              <div className="text-xs text-[var(--color-primary)] font-medium">
                คลิกเพื่อเพิ่ม/แก้ไขบริการ →
              </div>
            </Link>

            <Link
              to="/admin/fonts"
              className="bg-white p-5 rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  ฟอนต์ในระบบทดลองพิมพ์
                </span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)]">
                  <Type className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-secondary)]">
                {stats.total_fonts} ฟอนต์
              </div>
              <div className="text-xs text-[var(--color-primary)] font-medium">
                อัปโหลด .ttf / .otf / .woff2 →
              </div>
            </Link>

            <Link
              to="/admin/reviews"
              className="bg-white p-5 rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  รีวิวและคะแนนเฉลี่ย
                </span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-secondary)]">
                {stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '5.0'} ★
              </div>
              <div className="text-xs text-[var(--color-secondary-muted)]">
                ทั้งหมด {stats.total_reviews} รีวิว
              </div>
            </Link>
          </div>

          {/* สถิติระบบสะสมแต้ม Loyalty Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/members"
              className="bg-white p-5 rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  สมาชิกสะสมแต้ม
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-secondary)]">
                {(stats.total_members || 0).toLocaleString('th-TH')} ท่าน
              </div>
              <div className="text-xs text-[var(--color-primary)] font-medium">
                จัดการรหัสสมาชิก & ปรับแต้ม →
              </div>
            </Link>

            <Link
              to="/admin/members"
              className="bg-white p-5 rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  แต้มที่แจกแล้วทั้งหมด
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {(stats.total_points_issued || 0).toLocaleString('th-TH')}{' '}
                <span className="text-xs font-semibold text-[var(--color-secondary)]">แต้ม</span>
              </div>
              <div className="text-xs text-[var(--color-secondary-muted)]">
                จากออเดอร์ที่ส่งงานเรียบร้อย
              </div>
            </Link>

            <Link
              to="/admin/members"
              className="bg-white p-5 rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  แต้มที่ถูกแลกแล้ว
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Gift className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {(stats.total_points_redeemed || 0).toLocaleString('th-TH')}{' '}
                <span className="text-xs font-semibold text-[var(--color-secondary)]">แต้ม</span>
              </div>
              <div className="text-xs text-[var(--color-secondary-muted)]">
                แลกเป็นส่วนลดและของรางวัล
              </div>
            </Link>

            <Link
              to="/admin/members"
              className="bg-white p-5 rounded-3xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  คำขอแลกรางวัลรอดำเนินการ
                </span>
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-secondary)]">
                {(stats.pending_redemptions || 0).toLocaleString('th-TH')} รายการ
              </div>
              <div className="text-xs font-semibold text-green-600">
                {stats.pending_redemptions ? 'มีรายการรอจัดส่ง →' : 'จัดส่งครบถ้วนแล้ว ✓'}
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* รายการคำสั่งซื้อล่าสุด */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-secondary)]">
            คำสั่งซื้อล่าสุด
          </h2>
          <Link
            to="/admin/orders"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
          >
            ดูคำสั่งซื้อทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-[var(--color-secondary-muted)] py-6 text-center">
            ยังไม่มีคำสั่งซื้อในระบบ
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-secondary-muted)]">
                  <th className="py-3 px-3">รหัสออเดอร์</th>
                  <th className="py-3 px-3">ลูกค้า / สมาชิก</th>
                  <th className="py-3 px-3">ช่องทางติดต่อ</th>
                  <th className="py-3 px-3">ยอดรวมประเมิน</th>
                  <th className="py-3 px-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60">
                {recentOrders.map((order) => {
                  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
                  return (
                    <tr key={order.id} className="hover:bg-[var(--color-bg)]/60">
                      <td className="py-3 px-3 font-bold text-[var(--color-secondary)]">
                        {order.order_code}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[var(--color-secondary)]">
                          {order.customer_name}
                        </div>
                        {order.member_code && (
                          <span className="text-[11px] font-bold text-[var(--color-primary)]">
                            สมาชิก: {order.member_code}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-[var(--color-secondary-muted)]">
                        {order.customer_contact}
                      </td>
                      <td className="py-3 px-3 font-bold text-[var(--color-primary)]">
                        ฿{Number(order.total_amount).toLocaleString('th-TH')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
