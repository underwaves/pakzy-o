import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Type,
  ShoppingBag,
  Star,
  MessageCircle,
  Instagram,
  ArrowRight,
  Palette,
  LayoutGrid,
  Stamp,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { ProductCard } from '../components/ui/ProductCard';
import {
  CuteHeart,
  CuteFlower,
  CuteSparkle,
  CuteBow,
  CuteSectionDivider,
  CuteWashiTape,
  CardCornerDoodle,
  RevealOnScroll,
  BrandWordmark,
} from '../components/ui/Decorations';
import { LoadingState, ErrorState } from '../components/ui/States';

interface HeroSparkleParticle {
  id: number;
  x: number;
  y: number;
  kind: 'star' | 'heart';
}

export const HomePage: React.FC = () => {
  const {
    settings,
    products,
    fonts,
    reviews,
    reviewStats,
    loading,
    error,
    refreshSiteData,
  } = useSite();
  // สลับฟอนต์ตัวอย่างของร้านในป้ายกำกับใต้ชื่อร้าน
  const [fontCycleIndex, setFontCycleIndex] = useState(0);
  const [fontAnimating, setFontAnimating] = useState(false);

  // Interactive Variable Font Weight สำหรับชื่อร้านขนาดยักษ์ใน Hero (ตอบสนองตามเมาส์และการแตะ/ลากบนมือถือ)
  const wordmarkRef = useRef<HTMLDivElement | null>(null);
  const [pointerRatio, setPointerRatio] = useState<number | null>(null);

  // Sparkle ตามเคอร์เซอร์เฉพาะใน Hero บนหน้าจอคอม (ปิดบนมือถือและเมื่อ reduced-motion)
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const [sparkles, setSparkles] = useState<HeroSparkleParticle[]>([]);
  const lastSparkleTimeRef = useRef<number>(0);

  const heroFontsList =
    fonts.length > 0
      ? fonts
      : [
          {
            id: 1,
            name: 'PKZ Baitoey (ใบเตย)',
            family_name: 'PKZ Baitoey',
            file_url: '/r2/fonts/pkz-baitoey.ttf',
            sample_text: 'ฝากร้านหน่อยนะคะ ขอบคุณทุกออเดอร์เลยน้า ♡',
            price: 159,
            product_id: 6,
            is_active: 1,
          },
          {
            id: 2,
            name: 'PKZ Choco Pink (ช็อกโกพิงค์)',
            family_name: 'PKZ Choco Pink',
            file_url: '/r2/fonts/pkz-chocopink.ttf',
            sample_text: 'เมนูใหม่ประจำสัปดาห์ หอมกรุ่นจากเตาทุกวัน ✿',
            price: 169,
            product_id: 7,
            is_active: 1,
          },
          {
            id: 3,
            name: 'PKZ Milky Star (มิลกี้สตาร์)',
            family_name: 'PKZ Milky Star',
            file_url: '/r2/fonts/pkz-milkystar.ttf',
            sample_text: 'โปรโมชันลดพิเศษ ส่งฟรีทุกออเดอร์วันนี้! ☆',
            price: 179,
            product_id: 8,
            is_active: 1,
          },
          {
            id: 4,
            name: 'PKZ Brownie Note (บราวนี่โน้ต)',
            family_name: 'PKZ Brownie Note',
            file_url: '/r2/fonts/pkz-brownienote.ttf',
            sample_text: 'แจ้งเลขพัสดุและรายละเอียดการดูแลรักษาสินค้า',
            price: 149,
            product_id: 9,
            is_active: 1,
          },
        ];

  useEffect(() => {
    if (heroFontsList.length <= 1) return;

    const timer = setInterval(() => {
      setFontAnimating(true);
      setTimeout(() => {
        setFontCycleIndex((prev) => (prev + 1) % heroFontsList.length);
        setFontAnimating(false);
      }, 200);
    }, 2600);

    return () => clearInterval(timer);
  }, [heroFontsList.length]);

  const updateWordmarkPointer = (clientX: number) => {
    const el = wordmarkRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    setPointerRatio(Math.max(0, Math.min(1, ratio)));
  };

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    updateWordmarkPointer(e.clientX);

    // Sparkle ตามเคอร์เซอร์เฉพาะบนคอม (pointer: fine) และจำกัดจำนวนไม่เกิน 4 ชิ้น
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const now = Date.now();
    if (now - lastSparkleTimeRef.current < 150) return;
    lastSparkleTimeRef.current = now;

    const heroEl = heroSectionRef.current;
    if (!heroEl) return;
    const rect = heroEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = now + Math.random();

    setSparkles((prev) => [
      ...prev.slice(-3),
      { id, x, y, kind: prev.length % 2 === 0 ? 'star' : 'heart' },
    ]);

    window.setTimeout(() => {
      setSparkles((prev) => prev.filter((item) => item.id !== id));
    }, 650);
  };

  const currentHeroFont = heroFontsList[fontCycleIndex % heroFontsList.length] || heroFontsList[0];
  const getHeroFontStack = () => {
    if (!currentHeroFont) return `'Prompt', sans-serif`;
    let fallback = 'Mali';
    if (currentHeroFont.family_name.toLowerCase().includes('choco')) fallback = 'Itim';
    else if (currentHeroFont.family_name.toLowerCase().includes('milky')) fallback = 'Sriracha';
    else if (currentHeroFont.family_name.toLowerCase().includes('brownie')) fallback = 'Kodchasan';
    return `'${currentHeroFont.family_name}', '${fallback}', 'Anuphan', 'Prompt', sans-serif`;
  };

  const siteBrandText = settings.site_name || 'qokhims';
  const brandChars = siteBrandText.split('');

  const featuredProducts = products.filter((p) => p.is_featured === 1).slice(0, 6);
  const displayProducts =
    featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6);

  const lineHandle = (settings.contact_line || '@280npxvj').trim();
  const lineUrlHandle = lineHandle.startsWith('@') ? lineHandle : `@${lineHandle}`;
  const igHandle = (settings.contact_ig || 'qokhims').replace(/^@/, '').trim();

  // สถานะคิวงานที่แก้ไขได้จากหลังบ้าน
  const queueText =
    settings.queue_status_text || 'คิวว่างพร้อมรับงาน ✿ ส่งงานไว 1-3 วัน';
  const queueState = settings.queue_status_state || 'open';
  const queueDotColor =
    queueState === 'closed'
      ? 'bg-rose-500'
      : queueState === 'busy'
      ? 'bg-amber-400'
      : 'bg-emerald-500';

  const orderSteps = [
    {
      step: '01',
      nodeKind: 'heart' as const,
      title: 'เลือก/ทดลองพิมพ์ฟอนต์ก่อนตัดสินใจ',
      desc: 'ลองพิมพ์ข้อความจริง เลือกสไตล์ที่ชอบ และเปรียบเทียบ A/B ได้อย่างมั่นใจก่อนสั่งซื้อ',
    },
    {
      step: '02',
      nodeKind: 'star' as const,
      title: 'สั่งซื้อและโอนชำระผ่านเว็บ',
      desc: 'กดใส่ตะกร้า ชำระเงินผ่าน QR Code สแกนจ่ายพร้อมแนบสลิปผ่านหน้าเว็บได้ทันที สะดวก รวดเร็ว',
    },
    {
      step: '03',
      nodeKind: 'heart' as const,
      title: 'รับไฟล์พร้อมใช้ ร้านส่งมอบไฟล์ผ่าน Google Drive',
      desc: 'แอดมินส่งมอบลิงก์ Google Drive ในระบบสำหรับดาวน์โหลดไฟล์พร้อมใช้งานเชิงพาณิชย์ได้ทันที',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      {/* 1. Hero Section แนะนำร้าน: "ตัวอักษรคือตัวเอกของร้าน" */}
      <section
        ref={heroSectionRef}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={() => setPointerRatio(null)}
        className="relative overflow-hidden pt-8 pb-16 sm:py-20 bg-gradient-to-b from-[var(--color-primary-light)]/85 via-[var(--color-bg)] to-transparent"
      >
        {/* Sparkle ตามเคอร์เซอร์เฉพาะใน Hero บนคอม (สูงสุดไม่เกิน 4 ชิ้น) */}
        {sparkles.map((sp) => (
          <span
            key={sp.id}
            style={{ left: sp.x, top: sp.y }}
            className="pointer-events-none select-none hidden lg:inline-block absolute -translate-x-1/2 -translate-y-1/2 z-20 animate-star-pop opacity-80"
            aria-hidden="true"
          >
            {sp.kind === 'star' ? (
              <CuteSparkle className="w-4 h-4" />
            ) : (
              <CuteHeart className="w-3.5 h-3.5" />
            )}
          </span>
        ))}

        {/* ดาวลอยช้า ๆ 3 ดวงในฉากหลัง (คงความมินิมอล ไม่เกิน 5-6 ชิ้นบนหน้าจอ) */}
        <div
          style={{ animationDelay: '0s' }}
          className="pointer-events-none select-none absolute top-10 left-8 sm:left-16 opacity-75 animate-float-gentle"
          aria-hidden="true"
        >
          <CuteSparkle className="w-5 h-5" />
        </div>
        <div
          style={{ animationDelay: '1.3s' }}
          className="pointer-events-none select-none absolute top-16 right-10 sm:right-24 opacity-80 animate-float-gentle"
          aria-hidden="true"
        >
          <CuteSparkle className="w-6 h-6" />
        </div>
        <div
          style={{ animationDelay: '2.1s' }}
          className="pointer-events-none select-none absolute bottom-12 left-1/4 opacity-70 animate-float-gentle"
          aria-hidden="true"
        >
          <CuteSparkle className="w-5 h-5" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left animate-fade-in">
              {/* ป้ายคอนเซ็ปต์ร้าน */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-primary)]">
                  <CuteFlower className="w-3.5 h-3.5" />
                  <span>{settings.hero_badge || 'ตัวอักษรคือตัวเอกของร้าน ♡'}</span>
                </div>
              </div>

              {/* Signature #2: ชื่อร้านตัวอักษรยักษ์ สลับฟอนต์ตามฟอนต์ของร้าน + เปลี่ยนน้ำหนัก/ขนาดตามระยะเมาส์และการแตะลาก */}
              <div className="space-y-3">
                <p className="text-sm sm:text-base font-semibold text-[var(--color-secondary-muted)]">
                  เติมความละมุนให้แบรนด์คุณ ด้วยงานดีไซน์และฟอนต์ลายมือจาก
                </p>

                <div
                  ref={wordmarkRef}
                  onClick={() => {
                    setFontAnimating(true);
                    setTimeout(() => {
                      setFontCycleIndex((prev) => (prev + 1) % heroFontsList.length);
                      setFontAnimating(false);
                    }, 160);
                  }}
                  onTouchStart={(e) => {
                    if (e.touches[0]) updateWordmarkPointer(e.touches[0].clientX);
                  }}
                  onTouchMove={(e) => {
                    if (e.touches[0]) updateWordmarkPointer(e.touches[0].clientX);
                  }}
                  onTouchEnd={() => setPointerRatio(null)}
                  title="คลิกเพื่อสลับฟอนต์ หรือเลื่อนเมาส์/ลากนิ้วผ่านตัวอักษรเพื่อเล่นกับน้ำหนักฟอนต์"
                  className="inline-flex items-baseline justify-center lg:justify-start select-none cursor-pointer py-1.5"
                  style={{
                    fontFamily: getHeroFontStack(),
                    opacity: fontAnimating ? 0.18 : 1,
                    transform: fontAnimating ? 'translateY(4px)' : 'translateY(0)',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                  }}
                >
                  {brandChars.map((ch, idx) => {
                    const charPos =
                      brandChars.length > 1 ? idx / (brandChars.length - 1) : 0.5;
                    const dist =
                      pointerRatio === null ? 0.5 : Math.abs(pointerRatio - charPos);
                    const proximity =
                      pointerRatio === null ? 0.35 : Math.max(0, 1 - dist * 2.1);
                    const weight = Math.round(320 + proximity * 480); // 320..800
                    const liftPx = pointerRatio === null ? 0 : -proximity * 6;
                    const scaleVal = pointerRatio === null ? 1 : 1 + proximity * 0.08;

                    if (ch === '.') {
                      return (
                        <span
                          key={idx}
                          style={{
                            transform: `translateY(${liftPx.toFixed(1)}px) scale(${(
                              scaleVal * 1.05
                            ).toFixed(3)})`,
                            transition: 'transform 0.14s ease-out',
                          }}
                          className="inline-flex items-center mx-0.5 sm:mx-1 text-[var(--color-primary)] font-bold text-5xl sm:text-7xl lg:text-[5.25rem] leading-none"
                        >
                          .
                        </span>
                      );
                    }

                    return (
                      <span
                        key={idx}
                        style={{
                          fontFamily: getHeroFontStack(),
                          fontWeight: weight,
                          fontVariationSettings: `'wght' ${weight}`,
                          transform: `translateY(${liftPx.toFixed(1)}px) scale(${scaleVal.toFixed(
                            3
                          )})`,
                          color:
                            proximity > 0.62
                              ? 'var(--color-primary)'
                              : 'var(--color-secondary)',
                          transition:
                            'transform 0.14s ease-out, color 0.18s ease, font-weight 0.14s ease',
                        }}
                        className="inline-block text-5xl sm:text-7xl lg:text-[5.25rem] leading-none tracking-tight"
                      >
                        {ch}
                      </span>
                    );
                  })}
                </div>

                {/* แถบแสดงฟอนต์ของร้านที่กำลังแสดงบนชื่อร้านด้านบน */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs text-[var(--color-secondary-muted)]">
                  {currentHeroFont && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[var(--color-border)] shadow-2xs">
                      <CuteHeart className="w-3.5 h-3.5" />
                      <span>ชื่อร้านกำลังแสดงด้วยฟอนต์:</span>
                      <Link
                        to={`/font-tester?font=${encodeURIComponent(
                          currentHeroFont.family_name
                        )}`}
                        style={{
                          fontFamily: getHeroFontStack(),
                          opacity: fontAnimating ? 0.25 : 1,
                          transition: 'opacity 0.2s ease',
                        }}
                        className="font-bold text-sm text-[var(--color-primary)] hover:underline"
                      >
                        {currentHeroFont.name}
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm sm:text-base lg:text-lg text-[var(--color-secondary-muted)] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {settings.hero_subtitle ||
                  'รับออกแบบป้ายแม่ค้าออนไลน์ Rich Menu แต่งรูปสินค้า ลายน้ำ และจำหน่ายฟอนต์ลายมือไทยอ่านง่าย สไตล์มินิมอลโทนอบอุ่น ใส่ใจทุกรายละเอียด'}
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                <Link
                  to="/products"
                  className="pkz-order-btn px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm sm:text-base font-semibold hover:opacity-95 transition shadow-sm inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  ดูบริการ & ฟอนต์ทั้งหมด
                </Link>
                <Link
                  to="/font-tester"
                  className="px-5 py-3.5 rounded-full bg-white border-2 border-[var(--color-secondary)] text-[var(--color-secondary)] text-sm sm:text-base font-semibold hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-2"
                >
                  <Type className="w-4 h-4 text-[var(--color-primary)]" />
                  ทดลองพิมพ์ฟอนต์ (A/B)
                </Link>
              </div>

              {/* ป้ายสติกเกอร์จุดเด่นของร้าน */}
              <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs">
                <span className="px-3.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] font-semibold text-[var(--color-secondary)] inline-flex items-center gap-1.5 shadow-2xs">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  คะแนนรีวิว{' '}
                  {reviewStats.average_rating > 0
                    ? reviewStats.average_rating.toFixed(1)
                    : '5.0'}{' '}
                  / 5.0 ({reviewStats.total_count} รีวิว)
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] font-semibold text-[var(--color-secondary)] inline-flex items-center gap-1.5 shadow-2xs">
                  <CuteHeart className="w-3.5 h-3.5" />
                  ฟอนต์สระไม่ลอย ใช้เชิงพาณิชย์ได้
                </span>
              </div>
            </div>

            {/* การ์ดโชว์หน้าร้านด้านขวา (Sticker Style — ตั้งตรง ไม่เอียง) */}
            <div className="lg:col-span-5 animate-fade-in pt-4 lg:pt-0">
              <div
                className="relative pkz-sticker-card p-4 sm:p-6 rounded-[2.2rem]"
              >
                <CuteWashiTape />
                <CardCornerDoodle variant="flower" position="bottom-right" />
                <div className="absolute -top-3.5 right-5 px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold shadow-sm flex items-center gap-1">
                  <CuteSparkle className="w-3.5 h-3.5" /> Cute & Minimal
                </div>

                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--color-primary-light)] mb-4 border border-[var(--color-border)]">
                  {settings.hero_image_url &&
                  settings.hero_image_url !== '/r2/seed/product-banner.svg' ? (
                    <img
                      src={settings.hero_image_url}
                      alt="รูปโชว์หน้าร้าน qokhims"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* แสดงรูปโปรไฟล์ประจำร้าน qokhims */
                    <div className="w-full h-full bg-gradient-to-br from-[#fff7fa] via-[#fcebf2] to-[#f5e6df] flex flex-col items-center justify-center p-5 text-center relative">
                      <div className="relative mb-3">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 bg-white/90 border-2 border-[var(--color-border)] shadow-md flex items-center justify-center">
                          <img
                            src={
                              settings.logo_url &&
                              !settings.logo_url.includes('seed/logo-')
                                ? settings.logo_url
                                : '/qokhims-profile.png'
                            }
                            alt={settings.site_name || 'qokhims'}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-[var(--color-border)] shadow-2xs flex items-center justify-center">
                          <CuteFlower className="w-4.5 h-4.5" />
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-[var(--color-secondary)] tracking-tight flex items-center justify-center">
                        <span>@</span>
                        <BrandWordmark name={settings.site_name || 'qokhims'} dotVariant="dot" />
                      </h3>
                      <p className="text-xs text-[var(--color-secondary-muted)] mt-0.5 font-medium">
                        รับออกแบบป้ายมินิมอล • Rich Menu • ฟอนต์ลายมือ ♡
                      </p>
                      <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-primary)]">
                        <span>IG: {settings.contact_ig || 'qokhims'}</span>
                        <span>•</span>
                        <span>LINE: {settings.contact_line || '@280npxvj'}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={
                        settings.logo_url && !settings.logo_url.includes('seed/logo-')
                          ? settings.logo_url
                          : '/qokhims-profile.png'
                      }
                      alt={settings.site_name || 'qokhims'}
                      className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shadow-2xs shrink-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1">
                        <CuteFlower className="w-3.5 h-3.5" /> สตูดิโอออกแบบกราฟิก & ฟอนต์
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-[var(--color-secondary)]">
                        <BrandWordmark name={settings.site_name || 'qokhims'} dotVariant="dot" />{' '}
                        Studio ♡
                      </h2>
                    </div>
                  </div>
                  <Link
                    to="/portfolio"
                    className="px-4 py-2 rounded-full bg-[var(--color-primary-light)] text-[var(--color-secondary)] text-xs font-semibold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    ดูผลงาน <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. รวมผลงานออกแบบ (Google Drive Portfolio Showcase) */}
      <RevealOnScroll className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 sm:pt-4">
        <div className="relative overflow-hidden pkz-card rounded-[2.5rem] p-6 sm:p-10 lg:p-12 border-2 border-[var(--color-border)] shadow-xs">
          <CuteWashiTape />
          <CardCornerDoodle variant="flower" position="top-right" />
          <CardCornerDoodle variant="heart" position="bottom-left" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)]">
                <FolderOpen className="w-3.5 h-3.5" /> Design Portfolio & Showcase
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
                รวมผลงานออกแบบร้าน <BrandWordmark name={settings.site_name || 'qokhims'} dotVariant="dot" />
              </h2>
              <p className="text-sm sm:text-base text-[var(--color-secondary-muted)] leading-relaxed">
                ชมตัวอย่างผลงานออกแบบป้ายแม่ค้าออนไลน์, ป้ายเลขบัญชี, Rich Menu LINE OA, แต่งรูปสินค้า และงานกราฟิกทั้งหมดที่ทางร้านเคยทำให้ลูกค้าได้ในโฟลเดอร์ Google Drive รวมผลงานค่ะ
              </p>

              <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/50 border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-secondary)] space-y-1">
                <p className="font-semibold text-[var(--color-primary)] flex items-center gap-1.5">
                  <CuteSparkle className="w-4 h-4" /> หมายเหตุสำหรับงานออกแบบป้ายและกราฟิก:
                </p>
                <p className="text-[var(--color-secondary-muted)] leading-relaxed">
                  งานออกแบบมีราคาปรับเปลี่ยนตามความยากง่ายและรายละเอียดบรีฟงานของลูกค้า ทางร้านจึงไม่ได้เปิดให้กดสั่งซื้อตรงนี้ ลูกค้าสามารถทักแชต LINE เพื่อปรึกษา แจ้งรายละเอียด และเช็กคิวงานกับแอดมินได้โดยตรงเลยนะคะ ♡
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={
                    settings.portfolio_drive_url ||
                    'https://drive.google.com/drive/folders/placeholder-qokhims-portfolio'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pkz-order-btn px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-2 shadow-xs"
                >
                  <FolderOpen className="w-4 h-4" />
                  เปิดดูโฟลเดอร์รวมผลงานใน Google Drive
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <a
                  href={`https://line.me/R/ti/p/${
                    (settings.contact_line || '@280npxvj').startsWith('@')
                      ? settings.contact_line || '@280npxvj'
                      : '@' + (settings.contact_line || '280npxvj')
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-full bg-[#06C755] text-white text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-2 shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  ทักแชต LINE เพื่อสั่งงาน ({settings.contact_line || '@280npxvj'})
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-3xl p-5 bg-gradient-to-br from-[#fff7fa] to-[#fcebf2] border-2 border-[var(--color-border)] shadow-xs space-y-3.5 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] shadow-2xs">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-secondary)]">
                    Google Drive Portfolio
                  </h3>
                  <p className="text-xs text-[var(--color-secondary-muted)] mt-1">
                    อัปเดตผลงานจริงเรื่อย ๆ คัดสรรผลงานน่ารักมินิมอล
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-secondary)] pt-1">
                  <div className="p-2.5 rounded-xl bg-white border border-[var(--color-border)]/70">
                    <span className="font-bold text-[var(--color-primary)] block">ป้ายแม่ค้า & แบนเนอร์</span>
                    <span className="text-[10px] text-[var(--color-secondary-muted)]">โทนละมุนอ่านง่าย</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[var(--color-border)]/70">
                    <span className="font-bold text-[var(--color-primary)] block">Rich Menu LINE</span>
                    <span className="text-[10px] text-[var(--color-secondary-muted)]">จัดวางสวย ใช้งานง่าย</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>

      {/* 3. สินค้าและบริการแนะนำ (การ์ดสติกเกอร์ Die-cut ขอบขาว ตั้งตรง เรียงแนวเดียวกัน) */}
      <RevealOnScroll className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1">
              <CuteHeart className="w-3.5 h-3.5" /> Featured Stickers & Fonts
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)] mt-1">
              บริการและฟอนต์แนะนำยอดฮิต
            </h2>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition"
          >
            ดูรายการทั้งหมด ({products.length} รายการ)
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refreshSiteData} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 items-stretch">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </RevealOnScroll>

      {/* 4. ส่วน 3 ขั้นตอนสั่งงาน (แสดงสีไฮไลต์ทั้ง 3 ขั้นตอนอย่างชัดเจนเท่ากันทุกหน้าจอ) */}
      <RevealOnScroll className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pkz-card rounded-[2.2rem] p-6 sm:p-10 lg:p-12 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)]">
              <CuteHeart className="w-3.5 h-3.5" /> How To Order
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
              3 ขั้นตอนสั่งซื้อฟอนต์ง่าย ๆ ผ่านเว็บ
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
              ทดลองพิมพ์ฟอนต์ สั่งซื้อโอนชำระผ่านเว็บ และรับไฟล์พร้อมใช้ผ่าน Google Drive ได้ทันที ♡
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {orderSteps.map((st) => (
              <div
                key={st.step}
                className="rounded-3xl p-5 border-2 bg-[var(--color-bg)] border-[var(--color-primary)] shadow-2xs transition-all hover:-translate-y-1 hover:shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-secondary)] border border-[var(--color-border)]">
                    {st.nodeKind === 'heart' ? (
                      <CuteHeart className="w-3.5 h-3.5" />
                    ) : (
                      <CuteSparkle className="w-3.5 h-3.5" />
                    )}
                    STEP {st.step}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[var(--color-secondary)] mb-1.5">
                  {st.title}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)] leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </RevealOnScroll>

      {/* 5. แบนเนอร์ระบบสะสมแต้มบัตรน่ารัก */}
      {settings.loyalty_enabled !== 'false' && (
        <RevealOnScroll className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2.2rem] bg-white border-2 border-[var(--color-border)] p-6 sm:p-10 shadow-xs pkz-paper-dots">
            <CardCornerDoodle variant="flower" position="top-right" />
            <CardCornerDoodle variant="star" position="bottom-left" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-border)]">
                  <Stamp className="w-3.5 h-3.5" /> Qokhims Loyalty Stamp Card
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
                  สะสมแต้มทุกออเดอร์ แลกรับส่วนลดและของรางวัลสุดคิวท์ ♡
                </h2>
                <p className="text-sm sm:text-base text-[var(--color-secondary-muted)] leading-relaxed">
                  ไม่ต้องโหลดแอปหรือจำรหัสผ่านยาก ๆ เพียงเปิดบัตรสะสมแต้มออนไลน์ฟรี รับรหัสสมาชิกสั้น ๆ เช่น <strong>PZ-XXXX</strong> ทุกการสั่งซื้อที่แอดมินส่งงานเรียบร้อยจะได้รับแต้มสะสมอัตโนมัติ (ทุก {settings.baht_per_point || 10} บาท = 1 แต้ม)
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    to="/points"
                    className="pkz-order-btn px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-2 shadow-xs"
                  >
                    <CuteSparkle className="w-4 h-4" />
                    เปิดบัตรสะสมแต้ม / เช็กแต้มของคุณ
                  </Link>
                  <Link
                    to="/points"
                    className="px-6 py-3.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-secondary)] text-sm font-semibold hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-2"
                  >
                    ดูรายการของรางวัลทั้งหมด →
                  </Link>
                </div>
              </div>

              {/* จำลองการ์ดแสตมป์ 10 ช่องมินิ */}
              <div className="lg:col-span-5">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#fffaf8] to-[#fceef2] border-2 border-[var(--color-border)] shadow-xs space-y-4 text-center">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-dashed border-[var(--color-border)]">
                    <span className="font-bold text-[var(--color-secondary)]">
                      🌸 บัตรสะสมแสตมป์ qokhims
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold text-[10px]">
                      PZ-MEMBER
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const isStamped = num <= 4;
                      return (
                        <div
                          key={num}
                          className={`aspect-square rounded-2xl flex flex-col items-center justify-center border transition-transform ${
                            isStamped
                              ? 'bg-white border-[var(--color-primary)] text-[var(--color-primary)] shadow-2xs'
                              : 'bg-white/50 border-dashed border-[var(--color-border)] text-gray-300'
                          }`}
                        >
                          {isStamped ? (
                            <CuteFlower className="w-5 h-5 text-[var(--color-primary)]" />
                          ) : (
                            <span className="text-xs font-bold text-[var(--color-secondary-muted)]/60">
                              {num}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-[var(--color-secondary-muted)]">
                    สะสมครบ 10 แสตมป์ แลกรับส่วนลดพิเศษทันที ✨
                  </p>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      )}

      {/* 7. รีวิวล่าสุดจากลูกค้า */}
      <RevealOnScroll className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[var(--color-primary)]" /> Customer Reviews
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)] mt-1">
              รีวิวความประทับใจจากลูกค้า (
              {reviewStats.average_rating > 0
                ? reviewStats.average_rating.toFixed(1)
                : '5.0'}{' '}
              ★)
            </h2>
          </div>
          <Link
            to="/reviews"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline"
          >
            ดูรีวิวทั้งหมด & เขียนรีวิว
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {reviews.slice(0, 4).map((rev) => (
            <div
              key={rev.id}
              className="relative pkz-card p-5 rounded-3xl flex flex-col justify-between hover:-translate-y-1"
            >
              <CardCornerDoodle variant="heart" position="top-right" />
              <div>
                <div className="flex items-center gap-0.5 mb-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rev.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-[var(--color-secondary)] leading-relaxed mb-4">
                  "{rev.comment}"
                </p>
              </div>
              <div className="pt-3 border-t border-dashed border-[var(--color-border)]">
                <div className="text-xs font-bold text-[var(--color-secondary)]">
                  {rev.reviewer_name}
                </div>
                <div className="text-[11px] font-medium text-[var(--color-primary)]">
                  ✿ {rev.service_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </RevealOnScroll>

      {/* 8. ปุ่มติดต่อร้านและสั่งงานด่วน */}
      <RevealOnScroll className="max-w-4xl mx-auto px-4 sm:px-6 text-center pt-2">
        <div className="relative pkz-card rounded-[2.2rem] p-8 sm:p-10 space-y-5">
          <CuteWashiTape />
          <CardCornerDoodle variant="flower" position="top-left" />
          <CardCornerDoodle variant="star" position="bottom-right" />
          <div className="inline-flex items-center justify-center gap-2">
            <CuteFlower className="w-5 h-5" />
            <CuteBow className="w-8 h-7" />
            <CuteHeart className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
            พร้อมเริ่มงานดีไซน์น่ารัก ๆ กับ{' '}
            <BrandWordmark name={settings.site_name || 'qokhims'} dotVariant="dot" />{' '}
            หรือยังคะ?
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-secondary-muted)] max-w-xl mx-auto">
            สามารถกดเลือกบริการ รับใบเสร็จสรุปคำสั่งซื้อน่ารัก ๆ แล้วส่งเข้าแชต LINE ร้านได้ทันที หรือทักสอบถามคิวงานก่อนได้เลยน้า ♡
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/order"
              className="pkz-order-btn px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-2 shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              เปิดดูตะกร้าสินค้า & สั่งซื้อ
            </Link>
            <a
              href={`https://line.me/R/ti/p/${lineUrlHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-full bg-[#06C755] text-white text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              ทักแชต LINE ({lineHandle})
            </a>
            <a
              href={`https://instagram.com/${igHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-full bg-[var(--color-secondary)] text-[var(--color-bg)] text-sm font-semibold hover:opacity-90 transition inline-flex items-center gap-2"
            >
              <Instagram className="w-4 h-4" />
              IG: {igHandle}
            </a>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
};
