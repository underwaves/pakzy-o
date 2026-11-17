import React from 'react';
import { Link } from 'react-router-dom';
import {
  Instagram,
  MessageCircle,
  Facebook,
  Mail,
  Phone,
  Sparkles,
  Lock,
  Globe,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { CuteHeart, CuteFlower, CuteSparkle, BrandWordmark } from '../ui/Decorations';

export const Footer: React.FC = () => {
  const { settings } = useSite();

  const igHandle = (settings.contact_ig || 'pakzy.o').replace(/^@/, '').trim();
  const lineHandle = (settings.contact_line || '@280npxvj').trim();
  const lineUrlHandle = lineHandle.startsWith('@') ? lineHandle : `@${lineHandle}`;

  const facebookValue = settings.contact_facebook?.trim() || '';
  const tiktokValue = settings.contact_tiktok?.trim() || '';
  const emailValue = settings.contact_email?.trim() || '';
  const phoneValue = settings.contact_phone?.trim() || '';

  return (
    <footer className="bg-white border-t border-[var(--color-border)] mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* คอลัมน์ 1: แนะนำร้าน */}
          <div className="md:col-span-5 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <img
                src={
                  settings.logo_url && settings.logo_url !== '/r2/seed/logo-pakzy.svg'
                    ? settings.logo_url
                    : '/pakzy-profile.png'
                }
                alt={settings.site_name || 'pakzy.o'}
                className="w-12 h-12 rounded-full object-cover border-2 border-[var(--color-border)] shadow-xs group-hover:scale-105 transition-transform shrink-0"
              />
              <div>
                <span className="text-2xl font-bold text-[var(--color-secondary)] block leading-tight">
                  <BrandWordmark
                    name={settings.site_name || 'pakzy.o'}
                    dotVariant="dot"
                    dotClassName="w-4 h-4 mx-0.5 -translate-y-0.5"
                  />
                </span>
                <span className="text-xs text-[var(--color-primary)] font-semibold">
                  ตัวอักษรคือตัวเอกของร้าน ♡
                </span>
              </div>
            </Link>
            <p className="text-sm text-[var(--color-secondary-muted)] leading-relaxed max-w-sm">
              {settings.about_text ||
                'สตูดิโอรับออกแบบงานกราฟิกมินิมอล ป้ายบัญชีแม่ค้าออนไลน์ Rich Menu แต่งรูปสินค้า ลายน้ำ และจำหน่ายฟอนต์ลายมือไทยสุดคิวท์ อ่านง่าย สบายตา'}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--color-primary)] font-medium">
              <CuteFlower className="w-4 h-4" />
              <span>Minimal & Cute Design Studio</span>
              <CuteSparkle className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* คอลัมน์ 2: เมนูลัด */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
              <CuteHeart className="w-3.5 h-3.5" />
              เมนูการใช้งาน
            </h3>
            <ul className="space-y-2 text-sm text-[var(--color-secondary-muted)]">
              <li>
                <Link to="/products" className="hover:text-[var(--color-primary)] transition">
                  บริการออกแบบ & ฟอนต์ทั้งหมด
                </Link>
              </li>
              <li>
                <Link to="/font-tester" className="hover:text-[var(--color-primary)] transition">
                  ทดลองพิมพ์ฟอนต์ (เปรียบเทียบ A/B)
                </Link>
              </li>
              <li>
                <Link to="/order" className="hover:text-[var(--color-primary)] transition">
                  สั่งซื้อสินค้า / ส่งบรีฟงาน
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="hover:text-[var(--color-primary)] transition">
                  แกลเลอรีรวมผลงานร้าน
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-[var(--color-primary)] transition">
                  รีวิวความประทับใจจากลูกค้า
                </Link>
              </li>
              {settings.loyalty_enabled !== 'false' && (
                <li>
                  <Link
                    to="/points"
                    className="hover:text-[var(--color-primary)] transition inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)]"
                  >
                    <CuteSparkle className="w-3.5 h-3.5" />
                    บัตรสะสมแต้ม & ของรางวัล
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-primary)] hover:underline transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  เข้าสู่ระบบหลังบ้าน (Admin)
                </Link>
              </li>
            </ul>
          </div>

          {/* คอลัมน์ 3: ช่องทางติดต่อ (ซ่อนไอคอนที่ว่างอัตโนมัติ) */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              ช่องทางติดต่อร้าน
            </h3>
            <div className="space-y-2.5 text-sm">
              {lineHandle && (
                <a
                  href={`https://line.me/R/ti/p/${lineUrlHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--color-primary-light)]/70 hover:bg-[var(--color-primary-light)] text-[var(--color-secondary)] transition font-medium"
                >
                  <MessageCircle className="w-4 h-4 text-[#06C755] shrink-0" />
                  <span>LINE Official: {lineHandle}</span>
                </a>
              )}

              {igHandle && (
                <a
                  href={`https://instagram.com/${igHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--color-primary-light)]/70 hover:bg-[var(--color-primary-light)] text-[var(--color-secondary)] transition font-medium"
                >
                  <Instagram className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span>Instagram: {igHandle}</span>
                </a>
              )}

              {facebookValue && (
                <a
                  href={
                    facebookValue.startsWith('http')
                      ? facebookValue
                      : `https://facebook.com/${facebookValue}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--color-primary-light)]/70 hover:bg-[var(--color-primary-light)] text-[var(--color-secondary)] transition font-medium"
                >
                  <Facebook className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Facebook: {facebookValue}</span>
                </a>
              )}

              {tiktokValue && (
                <a
                  href={
                    tiktokValue.startsWith('http')
                      ? tiktokValue
                      : `https://tiktok.com/@${tiktokValue.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--color-primary-light)]/70 hover:bg-[var(--color-primary-light)] text-[var(--color-secondary)] transition font-medium"
                >
                  <Globe className="w-4 h-4 text-[var(--color-secondary)] shrink-0" />
                  <span>TikTok: {tiktokValue}</span>
                </a>
              )}

              {emailValue && (
                <a
                  href={`mailto:${emailValue}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--color-primary-light)]/70 hover:bg-[var(--color-primary-light)] text-[var(--color-secondary)] transition font-medium"
                >
                  <Mail className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span>อีเมล: {emailValue}</span>
                </a>
              )}

              {phoneValue && (
                <a
                  href={`tel:${phoneValue}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--color-primary-light)]/70 hover:bg-[var(--color-primary-light)] text-[var(--color-secondary)] transition font-medium"
                >
                  <Phone className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span>โทร: {phoneValue}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)]/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-secondary-muted)]">
          <p className="flex items-center gap-1">
            © {new Date().getFullYear()} {settings.site_name || 'pakzy.o'}. สงวนลิขสิทธิ์ผลงานออกแบบและฟอนต์ทั้งหมด{' '}
            <CuteHeart className="w-3.5 h-3.5" />
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-secondary)] font-semibold hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] transition shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>เข้าจัดการหลังบ้าน (Admin)</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};
