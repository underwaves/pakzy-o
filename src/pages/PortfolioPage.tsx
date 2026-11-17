import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Instagram,
  MessageCircle,
  Facebook,
  Globe,
  Type,
  ShoppingBag,
  Sparkles,
  X,
  ZoomIn,
} from 'lucide-react';
import type { PortfolioItem } from '../types';
import { useSite } from '../context/SiteContext';
import {
  CuteHeart,
  CuteFlower,
  CuteSectionDivider,
  BrandWordmark,
} from '../components/ui/Decorations';
import { FontSpecimenArtwork } from '../components/ui/ProductCard';
import { BeforeAfterSlider } from '../components/ui/BeforeAfterSlider';

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  {
    id: 1,
    title: 'ป้ายบัญชีโทนชมพูพาสเทล',
    category: 'ป้ายแม่ค้า',
    image_url: '/r2/seed/product-banner.svg',
    description: 'ดีไซน์สะอาดตา อ่านเลขบัญชีง่าย พร้อม QR Code',
  },
  {
    id: 2,
    title: 'Rich Menu ร้านคาเฟ่ & เบเกอรี',
    category: 'Rich Menu',
    image_url: '/r2/seed/product-richmenu.svg',
    description: 'แบ่งหมวดหมู่ชัดเจน กดสั่งซื้อสะดวก',
  },
  {
    id: 3,
    title: 'แต่งรูปสกินแคร์มินิมอล',
    category: 'แต่งรูปสินค้า',
    image_url: '/r2/seed/product-retouch.svg',
    description: 'ไดคัทเนียน ปรับแสงละมุน เพิ่มจุดเด่นสินค้า',
  },
  {
    id: 4,
    title: 'โลโก้และลายน้ำร้านเสื้อผ้า',
    category: 'ลายน้ำ/โลโก้',
    image_url: '/r2/seed/product-watermark.svg',
    description: 'ลายเส้นมินิมอล ตกแต่งหัวใจและดอกไม้พองาม',
  },
  {
    id: 5,
    title: 'ตัวอย่างการใช้งานฟอนต์ PKZ Baitoey',
    category: 'ฟอนต์',
    image_url: '/r2/seed/font-baitoey.svg',
    description: 'ฟอนต์ลายมือหัวกลมปุ๊กปิ๊ก อ่านง่ายทุกขนาด',
  },
  {
    id: 6,
    title: 'ตัวอย่างการใช้งานฟอนต์ PKZ Choco Pink',
    category: 'ฟอนต์',
    image_url: '/r2/seed/font-chocopink.svg',
    description: 'ฟอนต์ลายมือสไตล์คาเฟ่ เรียบง่ายอบอุ่น',
  },
];

export const PortfolioPage: React.FC = () => {
  const { settings } = useSite();
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [lightboxItem, setLightboxItem] = useState<PortfolioItem | null>(null);

  const portfolioItems = useMemo<PortfolioItem[]>(() => {
    try {
      const parsed = JSON.parse(settings.portfolio_json || '');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // use default
    }
    return DEFAULT_PORTFOLIO;
  }, [settings.portfolio_json]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(portfolioItems.map((i) => i.category)));
    return ['ทั้งหมด', ...unique];
  }, [portfolioItems]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'ทั้งหมด') return portfolioItems;
    return portfolioItems.filter((i) => i.category === selectedCategory);
  }, [portfolioItems, selectedCategory]);

  const igHandle = (settings.contact_ig || 'qokhims').replace(/^@/, '').trim();
  const lineHandle = (settings.contact_line || '@280npxvj').trim();
  const lineUrlHandle = lineHandle.startsWith('@') ? lineHandle : `@${lineHandle}`;
  const facebookValue = settings.contact_facebook?.trim() || '';
  const tiktokValue = settings.contact_tiktok?.trim() || '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
      {/* ส่วนที่ 1: Bio Link รวมลิงก์ช่องทางต่าง ๆ ของร้าน */}
      <div className="max-w-xl mx-auto bg-white rounded-[2.2rem] border-2 border-[var(--color-border)] p-6 sm:p-8 shadow-xs text-center space-y-5">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-[var(--color-primary-light)] border-2 border-[var(--color-border)] shadow-2xs">
            <img
              src={
                settings.logo_url && !settings.logo_url.includes('seed/logo-')
                  ? settings.logo_url
                  : '/qokhims-profile.png'
              }
              alt={settings.site_name || 'qokhims'}
              className="w-16 h-16 rounded-full object-cover"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
            <BrandWordmark name={settings.site_name || 'qokhims'} dotVariant="heart" /> — รวมลิงก์ & ผลงาน
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
            {settings.site_tagline ||
              'รับออกแบบกราฟิกมินิมอล ป้ายแม่ค้า Rich Menu และจำหน่ายฟอนต์ลายมือสุดคิวท์'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
          <a
            href={`https://line.me/R/ti/p/${lineUrlHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-[#06C755] text-white hover:opacity-95 transition shadow-2xs"
          >
            <MessageCircle className="w-4 h-4" />
            LINE: {lineHandle}
          </a>

          <a
            href={`https://instagram.com/${igHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-[var(--color-primary)] text-white hover:opacity-95 transition shadow-2xs"
          >
            <Instagram className="w-4 h-4" />
            Instagram: {igHandle}
          </a>

          {facebookValue && (
            <a
              href={
                facebookValue.startsWith('http')
                  ? facebookValue
                  : `https://facebook.com/${facebookValue}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-blue-600 text-white hover:opacity-95 transition shadow-2xs"
            >
              <Facebook className="w-4 h-4" />
              Facebook: {facebookValue}
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
              className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-[var(--color-secondary)] text-white hover:opacity-95 transition shadow-2xs"
            >
              <Globe className="w-4 h-4" />
              TikTok: {tiktokValue}
            </a>
          )}

          <Link
            to="/font-tester"
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition"
          >
            <Type className="w-4 h-4 text-[var(--color-primary)]" />
            ทดลองพิมพ์ฟอนต์ (A/B)
          </Link>

          <Link
            to="/order"
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[var(--color-secondary)] text-white hover:bg-[var(--color-primary)] transition"
          >
            <ShoppingBag className="w-4 h-4" />
            ตะกร้าสินค้า & สั่งซื้อ
          </Link>
        </div>
      </div>

      {/* สไลเดอร์เปรียบเทียบผลงานก่อนและหลัง (แต่งรูป & ลายน้ำ) */}
      <BeforeAfterSlider />

      {/* ส่วนที่ 2: แกลเลอรีรวมผลงานของร้าน */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)]">
            <CuteFlower className="w-3.5 h-3.5" /> Portfolio Gallery
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
            แกลเลอรีตัวอย่างผลงานออกแบบ & ฟอนต์
          </h2>
          <CuteSectionDivider />
        </div>

        {/* ปุ่มกรองหมวดหมู่ผลงาน */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'bg-white border border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ตารางแกลเลอรี */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setLightboxItem(item)}
              className="group bg-white rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-primary-light)]/40">
                {item.image_url?.startsWith('/r2/seed/font-') ? (
                  <FontSpecimenArtwork imageUrl={item.image_url} compact />
                ) : (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition bg-white/95 text-[var(--color-secondary)] px-3.5 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
                    <ZoomIn className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    คลิกดูภาพขยาย
                  </span>
                </div>
                <span className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-[var(--color-primary)] border border-[var(--color-border)] shadow-2xs">
                  {item.category}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-[var(--color-secondary)] mb-1 flex items-center justify-between">
                  <span>{item.title}</span>
                  <CuteHeart className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal ดูภาพขยาย */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden border-2 border-[var(--color-border)] shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div>
                <span className="text-xs font-semibold text-[var(--color-primary)]">
                  {lightboxItem.category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[var(--color-secondary)]">
                  {lightboxItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="p-2 rounded-full hover:bg-[var(--color-primary-light)] text-[var(--color-secondary)] cursor-pointer"
                aria-label="ปิดภาพขยาย"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 bg-[var(--color-bg)]">
              <img
                src={lightboxItem.image_url}
                alt={lightboxItem.title}
                className="w-full max-h-[65vh] object-contain rounded-2xl mx-auto"
              />
            </div>
            <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-white border-t border-[var(--color-border)]">
              <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
                {lightboxItem.description}
              </p>
              <Link
                to="/order"
                className="px-5 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-95 transition inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                สั่งงานสไตล์นี้
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
