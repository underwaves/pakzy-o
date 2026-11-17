import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  ShoppingBag,
  Type,
  Sparkles,
  Image as ImageIcon,
  Star,
  MessageCircleHeart,
  Home,
  Settings,
  Gift,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { CuteHeart, CuteFlower, CuteSparkle, BrandWordmark } from '../ui/Decorations';

export const Navbar: React.FC = () => {
  const { settings, cartItems, isDarkMode, toggleDarkMode } = useSite();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const navLinks = [
    { to: '/', label: 'หน้าแรก', icon: Home },
    { to: '/products', label: 'บริการ & ฟอนต์', icon: Sparkles },
    { to: '/font-tester', label: 'ทดลองฟอนต์', icon: Type },
    { to: '/portfolio', label: 'ผลงาน', icon: ImageIcon },
    { to: '/reviews', label: 'รีวิว', icon: Star },
    ...(settings.loyalty_enabled !== 'false'
      ? [{ to: '/points', label: 'สะสมแต้ม', icon: Gift }]
      : []),
    { to: '/contact', label: 'ติดต่อ', icon: MessageCircleHeart },
  ];

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[var(--color-border)]">
      {/* แถบประกาศด้านบนสุดแบบมินิมอล */}
      <div className="bg-[var(--color-primary-light)] text-[var(--color-secondary)] text-xs py-1.5 px-4 text-center font-medium border-b border-[var(--color-border)]/60">
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
          <CuteFlower className="w-3.5 h-3.5" />
          <span>
            {settings.site_name || 'qokhims'} — รับออกแบบป้ายและจำหน่ายฟอนต์ลายมือน่ารัก
          </span>
          <CuteHeart className="w-3.5 h-3.5" />
          <a
            href={`https://line.me/R/ti/p/${
              (settings.contact_line || '@280npxvj').startsWith('@')
                ? settings.contact_line || '@280npxvj'
                : '@' + (settings.contact_line || '280npxvj')
            }`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[var(--color-primary)] hover:text-[var(--color-primary)] font-semibold ml-1"
          >
            LINE: {settings.contact_line || '@280npxvj'}
          </a>
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* โลโก้และชื่อร้าน */}
        <Link to="/" className="flex items-center gap-1.5 group shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-1.5 sm:px-2 py-1 pr-2.5 sm:pr-3.5 rounded-full bg-[var(--color-primary-light)]/85 border border-[var(--color-secondary)]/30 group-hover:border-[var(--color-primary)] transition shadow-2xs">
            <img
              src={
                settings.logo_url && !settings.logo_url.includes('seed/logo-')
                  ? settings.logo_url
                  : '/qokhims-profile.png'
              }
              alt={settings.site_name || 'qokhims'}
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-[#624136]/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0"
            />
            <span className="text-sm sm:text-lg font-bold tracking-tight text-[var(--color-secondary)]">
              <BrandWordmark
                name={settings.site_name || 'qokhims'}
                dotVariant="dot"
                dotClassName="w-3 h-3 sm:w-3.5 sm:h-3.5 mx-0.5 -translate-y-0.5"
              />
            </span>
          </div>
        </Link>

        {/* เมนูสำหรับหน้าจอ Desktop */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-2.5 xl:px-3.5 py-2 rounded-full text-xs xl:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-secondary)] font-bold border-[var(--color-primary)]/50 shadow-xs'
                    : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)]/50 border-transparent'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[var(--color-primary)] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ปุ่มสลับโหมดมืด (ดวงจันทร์/ดาว), ปุ่มหลังบ้าน, ปุ่มสั่งซื้อ & ปุ่มเปิดเมนูมือถือ */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* ปุ่มสลับโหมดสว่าง / โหมดมืดน้ำตาลเข้ม */}
          <button
            type="button"
            onClick={toggleDarkMode}
            title={
              isDarkMode
                ? 'สลับเป็นโหมดสว่างครีมชมพู'
                : 'สลับเป็นโหมดมืดโทนน้ำตาลเข้ม (Choco Night)'
            }
            aria-label="สลับโหมดสีมืดและสว่าง"
            className="p-1.5 sm:p-2.5 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)] transition cursor-pointer flex items-center justify-center shrink-0"
          >
            {isDarkMode ? (
              <CuteSparkle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            ) : (
              /* ไอคอนพระจันทร์เสี้ยวคู่ดาวแบบวาดมือ */
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                aria-hidden="true"
              >
                <path
                  d="M20.2 14.5A8.2 8.2 0 0 1 9.5 3.8a8.2 8.2 0 1 0 10.7 10.7Z"
                  fill="#f8c8d8"
                  stroke="#4a3228"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17.5 4.5L18.2 6.5L20.2 7.2L18.2 7.9L17.5 9.9L16.8 7.9L14.8 7.2L16.8 6.5L17.5 4.5Z"
                  fill="#fceef2"
                  stroke="#4a3228"
                  strokeWidth="1.2"
                />
              </svg>
            )}
          </button>

          <Link
            to="/admin"
            title="เข้าจัดการระบบหลังบ้าน (Admin)"
            className="group inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-secondary)] text-[11px] sm:text-xs xl:text-sm font-semibold hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] transition shadow-2xs whitespace-nowrap shrink-0"
          >
            <Settings className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[var(--color-primary)] group-hover:text-white transition-colors shrink-0" />
            <span>หลังบ้าน</span>
          </Link>

          <Link
            id="pkz-navbar-cart-btn"
            to="/order"
            title="เปิดตะกร้าสินค้าและชำระเงิน"
            className="pkz-order-btn relative inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 xl:px-4 xl:py-2.5 rounded-full bg-[var(--color-secondary)] text-[var(--color-bg)] text-[11px] sm:text-xs xl:text-sm font-semibold hover:bg-[var(--color-primary)] hover:text-white transition shadow-xs whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
            <span className="hidden sm:inline">ตะกร้าสินค้า</span>
            <span className="sm:hidden">ตะกร้า</span>
            {totalItems > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-[var(--color-primary)] text-white leading-none">
                {totalItems}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition shrink-0"
            aria-label="เปิดเมนูนำทาง"
          >
            {mobileOpen ? <X className="w-4.5 h-4.5 sm:w-5 sm:h-5" /> : <Menu className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* เมนูสำหรับมือถือ (Mobile-first Drawer) */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-[var(--color-border)] px-4 pt-2 pb-5 space-y-1.5 animate-fade-in">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition border ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-secondary)] font-bold border-[var(--color-primary)]/50 shadow-xs'
                    : 'text-[var(--color-secondary-muted)] hover:bg-[var(--color-primary-light)]/40 border-transparent'
                }`
              }
            >
              <item.icon className="w-4 h-4 text-[var(--color-primary)]" />
              {item.label}
            </NavLink>
          ))}
          <div className="pt-2 mt-2 border-t border-[var(--color-border)]/60">
            <NavLink
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold bg-[var(--color-primary-light)]/70 text-[var(--color-secondary)] hover:bg-[var(--color-primary)] hover:text-white transition"
            >
              <Settings className="w-4 h-4 text-[var(--color-primary)]" />
              เข้าสู่ระบบหลังบ้าน (Admin)
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
};
