import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Type,
  ShoppingBag,
  Star,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Gift,
  Receipt,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../ui/States';

export const AdminLayout: React.FC = () => {
  const [adminUser, setAdminUser] = useState<{ username: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    fetch('/api/admin/me', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Unauthorized');
        }
        const data = await res.json();
        if (active) {
          setAdminUser(data.admin);
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) {
          setChecking(false);
          navigate('/admin/login', { replace: true });
        }
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    showToast('ออกจากระบบผู้ดูแลเรียบร้อยแล้วค่ะ', 'info');
    navigate('/admin/login', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <LoadingState message="กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ..." />
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  const navItems = [
    { to: '/admin', label: 'ภาพรวมระบบ', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'จัดการคำสั่งซื้อ', icon: ShoppingBag },
    { to: '/admin/bills', label: 'สร้างบิลส่งไลน์', icon: Receipt },
    { to: '/admin/members', label: 'สมาชิก & แต้ม', icon: Gift },
    { to: '/admin/products', label: 'จัดการสินค้า/บริการ', icon: Package },
    { to: '/admin/fonts', label: 'จัดการฟอนต์ (R2)', icon: Type },
    { to: '/admin/reviews', label: 'จัดการรีวิวลูกค้า', icon: Star },
    { to: '/admin/settings', label: 'ตั้งค่าเว็บ & ธีมสี', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#faf5f7] flex flex-col lg:flex-row">
      {/* แถบด้านบนสำหรับมือถือ */}
      <div className="lg:hidden bg-white border-b border-[var(--color-border)] px-4 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img
            src="/pakzy-profile.png"
            alt="pakzy.o"
            className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]"
          />
          <span className="font-bold text-[var(--color-secondary)]">pakzy.o Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen((p) => !p)}
          className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-secondary)]"
          aria-label="สลับเมนูแอดมิน"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-68 bg-white border-r border-[var(--color-border)] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-[var(--color-border)]/70">
          <div className="flex items-center gap-2.5">
            <img
              src="/pakzy-profile.png"
              alt="pakzy.o"
              className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shadow-2xs shrink-0"
            />
            <div>
              <h1 className="font-bold text-lg text-[var(--color-secondary)] leading-tight">
                pakzy.o
              </h1>
              <p className="text-xs text-[var(--color-secondary-muted)]">
                ระบบจัดการหลังบ้าน ({adminUser.username})
              </p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-xs font-semibold'
                    : 'text-[var(--color-secondary-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-secondary)]'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]/70 space-y-2">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-2xl text-xs font-semibold border border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            ดูหน้าบ้าน (เว็บไซต์จริง)
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-2xl text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* พื้นหลังมืดตอนเปิดเมนูบนมือถือ */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/25 z-30 lg:hidden"
        />
      )}

      {/* เนื้อหาหลักของหน้าแอดมิน */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
