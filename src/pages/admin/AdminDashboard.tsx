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
  TrendingUp,
  BarChart3,
  Calendar,
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

interface SalesDataPoint {
  period: string;
  order_count: number;
  revenue: number;
}

interface SalesByPeriod {
  day: SalesDataPoint[];
  month: SalesDataPoint[];
  year: SalesDataPoint[];
}

function formatPeriodLabel(period: string, timeframe: 'day' | 'month' | 'year'): string {
  if (!period) return '';
  if (timeframe === 'day') {
    const parts = period.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthNames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${day} ${monthNames[mIdx] || parts[1]}`;
    }
    return period;
  }
  if (timeframe === 'month') {
    const parts = period.split('-');
    if (parts.length === 2) {
      const monthNames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      const mIdx = parseInt(parts[1], 10) - 1;
      const yr = (parseInt(parts[0], 10) + 543) % 100;
      return `${monthNames[mIdx] || parts[1]} '${yr}`;
    }
    return period;
  }
  if (timeframe === 'year') {
    const yr = parseInt(period, 10);
    return isNaN(yr) ? period : `ปี ${yr + 543}`;
  }
  return period;
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
  const [salesByPeriod, setSalesByPeriod] = useState<SalesByPeriod | null>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'month' | 'year'>('day');
  const [hoveredPoint, setHoveredPoint] = useState<SalesDataPoint | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats || null);
        setSalesByPeriod(data.salesByPeriod || null);
        setRecentOrders(data.recentOrders || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="กำลังโหลดข้อมูลภาพรวมหลังบ้าน..." />;
  }

  const currentSalesList = salesByPeriod ? salesByPeriod[timeframe] : [];
  const totalRevenueInPeriod = currentSalesList.reduce(
    (acc, p) => acc + Number(p.revenue || 0),
    0
  );
  const totalOrdersInPeriod = currentSalesList.reduce(
    (acc, p) => acc + Number(p.order_count || 0),
    0
  );
  const avgOrderValue =
    totalOrdersInPeriod > 0 ? totalRevenueInPeriod / totalOrdersInPeriod : 0;
  const maxRevenue = Math.max(
    ...currentSalesList.map((p) => Number(p.revenue || 0)),
    1
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
            ภาพรวมระบบร้าน qokhims <CuteHeart className="w-5 h-5 text-[var(--color-primary)]" />
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

      {/* การ์ดสรุปยอดขายรวม (Total Sales) และกราฟยอดขาย */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-[var(--color-primary)]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-secondary)]">
                  สรุปยอดขายรวม (Total Sales)
                </h2>
                <p className="text-xs text-[var(--color-secondary-muted)]">
                  ยอดขายจากคำสั่งซื้อและบิลทั้งหมดในระบบ (ไม่รวมรายการที่ยกเลิก)
                </p>
              </div>
            </div>
          </div>

          {/* สลับช่วงเวลา: รายวัน / รายเดือน / รายปี */}
          <div className="flex items-center p-1 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] gap-1">
            <button
              type="button"
              onClick={() => {
                setTimeframe('day');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                timeframe === 'day'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
              }`}
            >
              รายวัน (Day)
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeframe('month');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                timeframe === 'month'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
              }`}
            >
              รายเดือน (Month)
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeframe('year');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                timeframe === 'year'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
              }`}
            >
              รายปี (Year)
            </button>
          </div>
        </div>

        {/* ตัวเลขสรุปยอดของช่วงเวลาที่เลือก */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]/80">
            <div className="text-xs text-[var(--color-secondary-muted)] font-medium">
              ยอดขายรวม ({timeframe === 'day' ? 'ล่าสุด 30 วัน' : timeframe === 'month' ? 'ล่าสุด 12 เดือน' : 'ทุกปี'})
            </div>
            <div className="text-2xl font-bold text-[var(--color-primary)] mt-1">
              ฿{totalRevenueInPeriod.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]/80">
            <div className="text-xs text-[var(--color-secondary-muted)] font-medium">
              จำนวนคำสั่งซื้อ
            </div>
            <div className="text-2xl font-bold text-[var(--color-secondary)] mt-1">
              {totalOrdersInPeriod.toLocaleString('th-TH')}{' '}
              <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">รายการ</span>
            </div>
          </div>
          <div className="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]/80">
            <div className="text-xs text-[var(--color-secondary-muted)] font-medium">
              ยอดเฉลี่ยต่อออเดอร์ (AOV)
            </div>
            <div className="text-2xl font-bold text-[var(--color-secondary)] mt-1">
              ฿{avgOrderValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* ข้อมูลจุดที่ชี้อยู่ (Tooltip Banner) */}
        {hoveredPoint && (
          <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-2xl flex items-center justify-between text-xs text-[var(--color-secondary)] animate-fade-in">
            <span className="font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              {formatPeriodLabel(hoveredPoint.period, timeframe)} ({hoveredPoint.period})
            </span>
            <div className="flex items-center gap-3 font-semibold">
              <span className="text-[var(--color-primary)] font-bold">
                ฿{Number(hoveredPoint.revenue).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[var(--color-secondary-muted)]">
                {hoveredPoint.order_count} ออเดอร์
              </span>
            </div>
          </div>
        )}

        {/* กราฟแท่ง Pure CSS / SVG */}
        {currentSalesList.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--color-secondary-muted)] bg-[var(--color-bg)] rounded-2xl">
            ยังไม่มีข้อมูลยอดขายในช่วงเวลานี้
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-56 pt-6 pb-2 px-2 flex items-end gap-2 sm:gap-3 overflow-x-auto border-b border-[var(--color-border)]">
              {currentSalesList.map((point) => {
                const rev = Number(point.revenue || 0);
                const heightPercent = Math.max(6, Math.round((rev / maxRevenue) * 100));
                const isHovered = hoveredPoint?.period === point.period;

                return (
                  <div
                    key={point.period}
                    className="flex-1 min-w-[36px] max-w-[56px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(point)}
                    onClick={() => setHoveredPoint(point)}
                  >
                    {/* Tooltip บอลลูนลอย */}
                    <div
                      className={`absolute -top-10 z-10 px-2 py-1 rounded-lg bg-[var(--color-secondary)] text-white text-[10px] whitespace-nowrap shadow-md pointer-events-none transition-opacity ${
                        isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      }`}
                    >
                      ฿{rev.toLocaleString('th-TH')} ({point.order_count})
                    </div>

                    {/* แท่งกราฟสีชมพูละมุน */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isHovered
                          ? 'bg-gradient-to-t from-[#c93e6c] to-[#e8638b] shadow-xs'
                          : 'bg-gradient-to-t from-[var(--color-primary)] to-[#f9a8be] group-hover:from-[#d9537f] group-hover:to-[#f085a8]'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* แกน X แสดงป้ายช่วงเวลา */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto px-2 pt-1">
              {currentSalesList.map((point) => (
                <div
                  key={point.period}
                  className="flex-1 min-w-[36px] max-w-[56px] text-center"
                >
                  <span
                    className={`text-[10px] sm:text-[11px] font-medium block truncate ${
                      hoveredPoint?.period === point.period
                        ? 'text-[var(--color-primary)] font-bold'
                        : 'text-[var(--color-secondary-muted)]'
                    }`}
                    title={point.period}
                  >
                    {formatPeriodLabel(point.period, timeframe)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
