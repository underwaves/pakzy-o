import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Type,
  Columns2,
  LayoutList,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Shuffle,
  SlidersHorizontal,
  Image as ImageIcon,
  MoveHorizontal,
} from 'lucide-react';
import type { FontItem } from '../types';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import {
  CuteHeart,
  CuteFlower,
  CuteSparkle,
  CuteBow,
  CuteDaisy,
  CuteSectionDivider,
  CuteWashiTape,
  CardCornerDoodle,
} from '../components/ui/Decorations';
import { LoadingState, EmptyState } from '../components/ui/States';
import { calculateFontPriceInfo } from '../utils/promo';

const PRESET_SAMPLES = [
  'ฝากร้านหน่อยนะคะ ขอบคุณทุกออเดอร์เลยน้า ♡ 1234567890',
  'สวัสดีค่ะ ยินดีต้อนรับสู่ร้าน pakzy.o รับออกแบบป้ายและฟอนต์น่ารัก ✿',
  'แจ้งเลขพัสดุประจำวันนี้ ขอบคุณที่อุดหนุนร้านเล็ก ๆ ของเรานะคะ ♥',
  'โปรโมชันพิเศษ! ซื้อครบ 2 ชิ้น ส่งฟรีทั่วไทย ☆ Special Offer 50% OFF',
  'กขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ ๑๒๓๔๕๖๗๘๙๐',
];

const CUTE_STICKER_CHARS = [
  ' ♡ ',
  ' ✿ ',
  ' ✦ ',
  ' ♥ ',
  ' ☆ ',
  ' ⋆˚✿˖° ',
  ' (´｡• ᵕ •｡`) ',
  ' ꒰ 🍒 ꒱ ',
  ' ๑๒๓๔๕ ',
];

const PAPER_THEMES = [
  { id: 'pink', label: 'ชมพูพาสเทล', bg: '#fff5f8', text: '#4a3228', border: '#ec7a9a' },
  { id: 'white', label: 'ขาวคลีน', bg: '#ffffff', text: '#4a3228', border: '#eed5de' },
  { id: 'cream', label: 'ครีมอุ่นคาเฟ่', bg: '#fdf8f2', text: '#4a3228', border: '#d4a373' },
  { id: 'choco', label: 'น้ำตาลช็อกโก', bg: '#38241d', text: '#fff5f8', border: '#ec7a9a' },
];

const TEXT_COLORS = [
  { id: 'default', label: 'ตามธีมกระดาษ', value: '' },
  { id: 'brown', label: 'น้ำตาลเข้ม', value: '#4a3228' },
  { id: 'pink', label: 'ชมพูเข้ม', value: '#d95b80' },
  { id: ' mocha', label: 'น้ำตาลคาราเมล', value: '#8c583a' },
  { id: 'cream', label: 'ครีมสว่าง', value: '#fff5f8' },
];

const PAPER_PATTERNS = [
  { id: 'dots', label: 'จุดไข่ปลา', className: 'pkz-paper-dots' },
  { id: 'plain', label: 'กระดาษเรียบ', className: '' },
  { id: 'grid', label: 'ตารางกริด', className: 'pkz-paper-grid' },
  { id: 'lines', label: 'เส้นบรรทัด', className: 'pkz-paper-lines' },
];

export const FontTesterPage: React.FC = () => {
  const { fonts, loading, addToOrderCart } = useSite();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [customText, setCustomText] = useState<string>(PRESET_SAMPLES[0]);
  const [fontSize, setFontSize] = useState<number>(34);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');

  // โหมดแสดงผล: 'ab' (เคียงกัน) | 'slider' (ลากเส้นแบ่ง A/B) | 'mockup' (ดูบนป้าย/Rich Menu/ลายน้ำ) | 'all' (รวมทุกฟอนต์)
  const [viewMode, setViewMode] = useState<'ab' | 'slider' | 'mockup' | 'all'>('ab');
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [mockupType, setMockupType] = useState<'banner' | 'richmenu' | 'watermark'>('banner');

  const [paperTheme, setPaperTheme] = useState(PAPER_THEMES[0]);
  const [customTextColor, setCustomTextColor] = useState<string>('');
  const [paperPattern, setPaperPattern] = useState(PAPER_PATTERNS[0]);

  const [fontAFamily, setFontAFamily] = useState<string>('');
  const [fontBFamily, setFontBFamily] = useState<string>('');
  const [loadedFamilies, setLoadedFamilies] = useState<Record<string, boolean>>({});

  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // ตั้งค่าฟอนต์เริ่มต้น A และ B
  useEffect(() => {
    if (fonts.length === 0) return;
    const requestedFont = searchParams.get('font');
    if (requestedFont && fonts.some((f) => f.family_name === requestedFont)) {
      setFontAFamily(requestedFont);
    } else if (!fontAFamily) {
      setFontAFamily(fonts[0].family_name);
    }

    if (!fontBFamily) {
      setFontBFamily(fonts[1]?.family_name || fonts[0].family_name);
    }
  }, [fonts, searchParams, fontAFamily, fontBFamily]);

  // โหลดผ่าน FontFace API เพื่อติดตามสถานะการโหลดฟอนต์จาก R2
  useEffect(() => {
    if (fonts.length === 0) return;
    fonts.forEach((f) => {
      if ('FontFace' in window) {
        const face = new FontFace(f.family_name, `url(${f.file_url})`);
        face
          .load()
          .then((loaded) => {
            document.fonts.add(loaded);
            setLoadedFamilies((prev) => ({ ...prev, [f.family_name]: true }));
          })
          .catch(() => {
            setLoadedFamilies((prev) => ({ ...prev, [f.family_name]: true }));
          });
      }
    });
  }, [fonts]);

  const fontA = useMemo(
    () => fonts.find((f) => f.family_name === fontAFamily) || fonts[0],
    [fonts, fontAFamily]
  );

  const fontB = useMemo(
    () => fonts.find((f) => f.family_name === fontBFamily) || fonts[1] || fonts[0],
    [fonts, fontBFamily]
  );

  const getFontStack = (font?: FontItem) => {
    if (!font) return `'Prompt', sans-serif`;
    let fallback = 'Mali';
    if (font.family_name.toLowerCase().includes('choco')) fallback = 'Itim';
    else if (font.family_name.toLowerCase().includes('milky')) fallback = 'Sriracha';
    else if (font.family_name.toLowerCase().includes('brownie')) fallback = 'Kodchasan';
    return `'${font.family_name}', '${fallback}', 'Prompt', sans-serif`;
  };

  // ปุ่มสุ่มคู่ฟอนต์ A/B
  const handleRandomizePair = () => {
    if (fonts.length < 2) return;
    const idxA = Math.floor(Math.random() * fonts.length);
    let idxB = Math.floor(Math.random() * fonts.length);
    if (idxB === idxA) {
      idxB = (idxA + 1) % fonts.length;
    }
    setFontAFamily(fonts[idxA].family_name);
    setFontBFamily(fonts[idxB].family_name);
    showToast(
      `สุ่มคู่ฟอนต์: ${fonts[idxA].name} vs ${fonts[idxB].name} ♡`,
      'info'
    );
  };

  // ลากเส้นแบ่ง A/B Slider
  const updateSplitFromClientX = (clientX: number) => {
    const el = splitContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.max(5, Math.min(95, Math.round(pct))));
  };

  useEffect(() => {
    if (!isDraggingSplit) return;
    const onMove = (e: MouseEvent) => updateSplitFromClientX(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) updateSplitFromClientX(e.touches[0].clientX);
    };
    const onUp = () => setIsDraggingSplit(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDraggingSplit]);

  const handleOrderFont = (font: FontItem, e?: React.MouseEvent) => {
    const promo = calculateFontPriceInfo(font);
    addToOrderCart(
      {
        product_id: font.product_id,
        product_title: `ฟอนต์ ${font.name}`,
        category_type: 'font',
        quantity: 1,
        unit_price: promo.effectivePrice,
        item_note: promo.hasPromo
          ? `โปรโมชัน: ลดเหลือ ฿${promo.effectivePrice} (ปกติ ฿${promo.originalPrice}) • ไฟล์ฟอนต์ .TTF 3 น้ำหนัก`
          : 'ไฟล์ฟอนต์ .TTF มี 3 น้ำหนัก (บาง / ปกติ / หนา)',
      },
      e ? { clientX: e.clientX, clientY: e.clientY } : undefined
    );
    showToast(
      `เพิ่มฟอนต์ "${font.name}" ลงในตะกร้าแล้วค่ะ ♡ (฿${promo.effectivePrice} - ทดลองพิมพ์ต่อได้เลยนะคะ)`,
      'success'
    );
  };

  const activeTextColor = customTextColor || paperTheme.text;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <LoadingState message="กำลังเตรียมสตูดิโอทดลองพิมพ์ฟอนต์จาก R2..." />
      </div>
    );
  }

  if (fonts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          title="ยังไม่มีฟอนต์ในระบบ"
          description="แอดมินสามารถอัปโหลดไฟล์ฟอนต์ (.ttf, .otf, .woff2) ขึ้น R2 ได้จากระบบหลังบ้านค่ะ"
        />
      </div>
    );
  }

  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
      {/* ของตกแต่งลอยเบา ๆ รอบหน้าแบบพองาม */}
      <div
        className="pointer-events-none select-none hidden md:block absolute top-8 left-6 animate-float-gentle opacity-80"
        aria-hidden="true"
      >
        <CuteDaisy className="w-8 h-8" />
      </div>
      <div
        className="pointer-events-none select-none hidden md:block absolute top-12 right-10 animate-float-gentle opacity-80"
        aria-hidden="true"
      >
        <CuteBow className="w-8 h-8" />
      </div>

      {/* ส่วนหัวหน้าทดลองพิมพ์ฟอนต์ */}
      <div className="text-center max-w-2xl mx-auto space-y-2.5">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-1.5 border-[var(--color-border)] text-xs font-semibold text-[var(--color-primary)] shadow-2xs">
          <CuteFlower className="w-3.5 h-3.5" />
          <span>Dynamic R2 Font Studio • A/B Slider & Live Mockup</span>
          <CuteHeart className="w-3.5 h-3.5" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-secondary)] tracking-tight">
          สตูดิโอทดลองพิมพ์ฟอนต์ pakzy.o
        </h1>
        <CuteSectionDivider />
        <p className="text-sm sm:text-base text-[var(--color-secondary-muted)]">
          พิมพ์ข้อความของคุณ สุ่มคู่ฟอนต์ A/B ลากเส้นแบ่งเทียบตัวอักษร ดูตัวอย่างบน Mockup ป้าย/Rich Menu/ลายน้ำ และบันทึกรูปเก็บไว้ตัดสินใจได้เลยค่ะ ♡
        </p>
      </div>

      {/* แผงควบคุมการพิมพ์และปรับแต่ง */}
      <div className="relative pkz-card rounded-[2.2rem] overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--color-primary-light)] via-[var(--color-surface)] to-[var(--color-primary-light)]/70 px-5 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ec7a9a] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#d4a373] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#f3c6d3] inline-block" />
            <span className="ml-2 text-xs font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
              <CuteFlower className="w-3.5 h-3.5" />
              กระดานทดลองพิมพ์ข้อความ (Live Font Playground)
            </span>
          </div>

          {/* ปุ่มสุ่มคู่ฟอนต์ A/B */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRandomizePair}
              className="px-3.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Shuffle className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              สุ่มคู่ฟอนต์ A/B
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* ช่องพิมพ์ข้อความเอง */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="font-tester-input"
                className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-1.5"
              >
                <Type className="w-4 h-4 text-[var(--color-primary)]" />
                พิมพ์ข้อความที่ต้องการทดลอง:
              </label>
              <button
                type="button"
                onClick={() => {
                  setCustomText(PRESET_SAMPLES[0]);
                  setFontSize(34);
                  setLetterSpacing(0);
                  setCustomTextColor('');
                }}
                className="px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-primary)] hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                คืนค่าเริ่มต้น
              </button>
            </div>

            <textarea
              id="font-tester-input"
              rows={2}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="พิมพ์ข้อความภาษาไทย อังกฤษ หรือตัวเลขที่นี่..."
              className="w-full px-4 py-3.5 rounded-2xl bg-[var(--color-bg)] border-1.5 border-[var(--color-border)] text-base text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition shadow-2xs"
            />

            {/* ปุ่มกดแทรกของตกแต่งในข้อความ */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1 mr-1">
                <CuteHeart className="w-3.5 h-3.5" /> กดแทรกของตกแต่ง:
              </span>
              {CUTE_STICKER_CHARS.map((sym, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCustomText((prev) => prev + sym)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-xs font-medium text-[var(--color-secondary)] transition cursor-pointer shadow-2xs"
                >
                  {sym.trim()}
                </button>
              ))}
            </div>

            {/* ปุ่มเลือกประโยคตัวอย่างด่วน */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-[var(--color-secondary-muted)] mr-1">
                ประโยคตัวอย่าง:
              </span>
              {PRESET_SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomText(sample)}
                  className="px-3 py-1 rounded-full text-xs bg-[var(--color-primary-light)]/75 hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-secondary)] transition truncate max-w-[210px] cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* แถบปรับโหมดการแสดงผล, ขนาดตัวอักษร, ระยะห่างตัวอักษร และสี/ลายกระดาษ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5 border-t border-dashed border-[var(--color-border)] items-start">
            {/* 1. โหมดแสดงผล */}
            <div className="lg:col-span-5 space-y-2">
              <span className="text-xs font-semibold text-[var(--color-secondary-muted)] block">
                โหมดการเปรียบเทียบและแสดงผล:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setViewMode('ab')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1 transition cursor-pointer ${
                    viewMode === 'ab'
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-secondary)] hover:bg-white'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  เคียงกัน A/B
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('slider')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1 transition cursor-pointer ${
                    viewMode === 'slider'
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-secondary)] hover:bg-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  ลากเส้น A/B
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('mockup')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1 transition cursor-pointer ${
                    viewMode === 'mockup'
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-secondary)] hover:bg-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  ดูบน Mockup
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1 transition cursor-pointer ${
                    viewMode === 'all'
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-secondary)] hover:bg-white'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  ทุกฟอนต์
                </button>
              </div>
            </div>

            {/* 2. ขนาดตัวอักษร & ระยะห่างตัวอักษร (Letter Spacing) */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-secondary)]">
                  <span>ขนาดตัวอักษร:</span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold">
                    {fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={72}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-[var(--color-primary)] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-secondary)]">
                  <span>ระยะห่างตัวอักษร:</span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold">
                    {letterSpacing}px
                  </span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={8}
                  step={0.5}
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(Number(e.target.value))}
                  className="w-full accent-[var(--color-primary)] cursor-pointer"
                />
              </div>
            </div>

            {/* 3. สีพื้นหลังกระดาษ, สีตัวอักษร และการจัดวาง */}
            <div className="lg:col-span-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                  สีกระดาษ:
                </span>
                <div className="flex items-center gap-1.5">
                  {PAPER_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setPaperTheme(theme)}
                      title={theme.label}
                      style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition cursor-pointer ${
                        paperTheme.id === theme.id
                          ? 'scale-110 ring-2 ring-[var(--color-primary)]'
                          : ''
                      }`}
                    >
                      {paperTheme.id === theme.id && (
                        <Check
                          className="w-3 h-3"
                          style={{
                            color: theme.id === 'choco' ? '#ffffff' : '#ec7a9a',
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <select
                  aria-label="เลือกสีตัวอักษร"
                  value={customTextColor}
                  onChange={(e) => setCustomTextColor(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)]"
                >
                  {TEXT_COLORS.map((c) => (
                    <option key={c.id} value={c.value}>
                      สีอักษร: {c.label}
                    </option>
                  ))}
                </select>

                <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setTextAlign('left')}
                    className={`p-1 rounded-md cursor-pointer ${
                      textAlign === 'left'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-secondary-muted)]'
                    }`}
                    title="ชิดซ้าย"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign('center')}
                    className={`p-1 rounded-md cursor-pointer ${
                      textAlign === 'center'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-secondary-muted)]'
                    }`}
                    title="กึ่งกลาง"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign('right')}
                    className={`p-1 rounded-md cursor-pointer ${
                      textAlign === 'right'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-secondary-muted)]'
                    }`}
                    title="ชิดขวา"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {PAPER_PATTERNS.map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => setPaperPattern(pat)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      paperPattern.id === pat.id
                        ? 'bg-[var(--color-secondary)] text-[var(--color-bg)]'
                        : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-secondary-muted)]'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          โหมดที่ 1: เปรียบเทียบ A/B เคียงกัน (Side-by-Side A/B)
         ==================================================================== */}
      {viewMode === 'ab' && fontA && fontB && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 pt-3 animate-fade-in">
          {/* ฝั่ง A */}
          <div className="relative pkz-card rounded-[2.2rem] p-5 sm:p-6 flex flex-col space-y-4">
            <CuteWashiTape />
            <CardCornerDoodle variant="flower" position="bottom-right" />
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-dashed border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-2xl bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shadow-2xs">
                  A
                </span>
                <select
                  aria-label="เลือกฟอนต์เปรียบเทียบ A"
                  value={fontA.family_name}
                  onChange={(e) => setFontAFamily(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  {fonts.map((f) => (
                    <option key={f.id} value={f.family_name}>
                      {f.name} (฿{f.price})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const promoA = calculateFontPriceInfo(fontA);
                return (
                  <div className="flex items-center gap-2">
                    {promoA.hasPromo && (
                      <span className="line-through text-xs text-[var(--color-secondary-muted)] font-normal">
                        ฿{promoA.originalPrice}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleOrderFont(fontA, e)}
                      className="pkz-order-btn px-4 py-2 rounded-full bg-[var(--color-secondary)] text-[var(--color-bg)] text-xs font-semibold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>ใส่ตะกร้า (฿{promoA.effectivePrice})</span>
                      {promoA.hasPromo && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold">
                          {promoA.discountBadgeText}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(fontA.style_tags || '')
                .split(',')
                .filter(Boolean)
                .map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium"
                  >
                    ✿ {tag.trim()}
                  </span>
                ))}
              <span className="ml-auto text-[11px] font-medium text-[var(--color-secondary-muted)]">
                {loadedFamilies[fontA.family_name] ? '✓ โหลดจาก R2 แล้ว' : 'พร้อมแสดงผล'}
              </span>
            </div>

            <div
              style={{
                backgroundColor: paperTheme.bg,
                color: activeTextColor,
                borderColor: paperTheme.border,
              }}
              className={`relative flex-1 min-h-[220px] rounded-3xl border-2 p-6 flex items-center justify-center transition-colors overflow-hidden ${paperPattern.className}`}
            >
              <p
                style={{
                  fontFamily: getFontStack(fontA),
                  fontSize: `${fontSize}px`,
                  letterSpacing: `${letterSpacing}px`,
                  lineHeight,
                  textAlign,
                }}
                className="break-words w-full"
              >
                {customText || fontA.sample_text}
              </p>
            </div>
          </div>

          {/* ฝั่ง B */}
          <div className="relative pkz-card rounded-[2.2rem] p-5 sm:p-6 flex flex-col space-y-4">
            <CuteWashiTape />
            <CardCornerDoodle variant="heart" position="bottom-right" />
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-dashed border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-2xl bg-[var(--color-secondary)] text-[var(--color-bg)] text-xs font-bold flex items-center justify-center shadow-2xs">
                  B
                </span>
                <select
                  aria-label="เลือกฟอนต์เปรียบเทียบ B"
                  value={fontB.family_name}
                  onChange={(e) => setFontBFamily(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  {fonts.map((f) => (
                    <option key={f.id} value={f.family_name}>
                      {f.name} (฿{f.price})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const promoB = calculateFontPriceInfo(fontB);
                return (
                  <div className="flex items-center gap-2">
                    {promoB.hasPromo && (
                      <span className="line-through text-xs text-[var(--color-secondary-muted)] font-normal">
                        ฿{promoB.originalPrice}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleOrderFont(fontB, e)}
                      className="pkz-order-btn px-4 py-2 rounded-full bg-[var(--color-secondary)] text-[var(--color-bg)] text-xs font-semibold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>ใส่ตะกร้า (฿{promoB.effectivePrice})</span>
                      {promoB.hasPromo && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold">
                          {promoB.discountBadgeText}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(fontB.style_tags || '')
                .split(',')
                .filter(Boolean)
                .map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium"
                  >
                    ♥ {tag.trim()}
                  </span>
                ))}
              <span className="ml-auto text-[11px] font-medium text-[var(--color-secondary-muted)]">
                {loadedFamilies[fontB.family_name] ? '✓ โหลดจาก R2 แล้ว' : 'พร้อมแสดงผล'}
              </span>
            </div>

            <div
              style={{
                backgroundColor: paperTheme.bg,
                color: activeTextColor,
                borderColor: paperTheme.border,
              }}
              className={`relative flex-1 min-h-[220px] rounded-3xl border-2 p-6 flex items-center justify-center transition-colors overflow-hidden ${paperPattern.className}`}
            >
              <p
                style={{
                  fontFamily: getFontStack(fontB),
                  fontSize: `${fontSize}px`,
                  letterSpacing: `${letterSpacing}px`,
                  lineHeight,
                  textAlign,
                }}
                className="break-words w-full"
              >
                {customText || fontB.sample_text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          โหมดที่ 2: Slider ลากเส้นแบ่งเปรียบเทียบ A/B (Interactive Split Slider)
         ==================================================================== */}
      {viewMode === 'slider' && fontA && fontB && (
        <div className="relative pkz-card rounded-[2.2rem] p-5 sm:p-7 space-y-5 animate-fade-in">
          <CuteWashiTape />
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-dashed border-[var(--color-border)]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold">
                ฝั่งซ้าย (A):
              </span>
              <select
                value={fontA.family_name}
                onChange={(e) => setFontAFamily(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs sm:text-sm font-bold text-[var(--color-secondary)]"
              >
                {fonts.map((f) => (
                  <option key={f.id} value={f.family_name}>
                    {f.name}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-[var(--color-secondary-muted)]">VS</span>

              <span className="px-3 py-1 rounded-full bg-[var(--color-secondary)] text-[var(--color-bg)] text-xs font-bold">
                ฝั่งขวา (B):
              </span>
              <select
                value={fontB.family_name}
                onChange={(e) => setFontBFamily(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs sm:text-sm font-bold text-[var(--color-secondary)]"
              >
                {fonts.map((f) => (
                  <option key={f.id} value={f.family_name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-secondary-muted)]">
              <span>เลื่อนเส้นแบ่ง:</span>
              <input
                type="range"
                min={5}
                max={95}
                value={splitPercent}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
                className="w-28 accent-[var(--color-primary)] cursor-pointer"
              />
              <span className="text-[var(--color-primary)] font-bold">{splitPercent}%</span>
            </div>
          </div>

          {/* พื้นที่ลากเส้นแบ่ง A/B */}
          <div
            ref={splitContainerRef}
            onMouseDown={(e) => {
              setIsDraggingSplit(true);
              updateSplitFromClientX(e.clientX);
            }}
            onTouchStart={(e) => {
              setIsDraggingSplit(true);
              if (e.touches[0]) updateSplitFromClientX(e.touches[0].clientX);
            }}
            style={{
              backgroundColor: paperTheme.bg,
              color: activeTextColor,
              borderColor: paperTheme.border,
            }}
            className={`relative min-h-[260px] rounded-3xl border-2 overflow-hidden select-none cursor-ew-resize ${paperPattern.className}`}
          >
            {/* เลเยอร์ฐาน (ฟอนต์ B ฝั่งขวา) */}
            <div className="absolute inset-0 p-8 flex items-center justify-center">
              <span className="absolute top-3 right-4 px-2.5 py-0.5 rounded-full bg-[#4a3228] text-white text-[11px] font-bold">
                B: {fontB.name}
              </span>
              <p
                style={{
                  fontFamily: getFontStack(fontB),
                  fontSize: `${fontSize}px`,
                  letterSpacing: `${letterSpacing}px`,
                  lineHeight,
                  textAlign,
                }}
                className="break-words w-full"
              >
                {customText || fontB.sample_text}
              </p>
            </div>

            {/* เลเยอร์ทับ (ฟอนต์ A ฝั่งซ้าย ตัดด้วย clipPath ตามตำแหน่งเส้นแบ่ง) */}
            <div
              style={{
                clipPath: `inset(0 ${100 - splitPercent}% 0 0)`,
                backgroundColor: paperTheme.bg,
              }}
              className={`absolute inset-0 p-8 flex items-center justify-center ${paperPattern.className}`}
            >
              <span className="absolute top-3 left-4 px-2.5 py-0.5 rounded-full bg-[#ec7a9a] text-white text-[11px] font-bold">
                A: {fontA.name}
              </span>
              <p
                style={{
                  fontFamily: getFontStack(fontA),
                  fontSize: `${fontSize}px`,
                  letterSpacing: `${letterSpacing}px`,
                  lineHeight,
                  textAlign,
                }}
                className="break-words w-full"
              >
                {customText || fontA.sample_text}
              </p>
            </div>

            {/* เส้นแบ่งแนวตั้งและปุ่มจับลาก */}
            <div
              style={{ left: `${splitPercent}%` }}
              className="absolute inset-y-0 w-0.5 bg-[#ec7a9a] shadow-md pointer-events-none"
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border-2 border-[#4a3228] text-[#ec7a9a] flex items-center justify-center shadow-md">
                <MoveHorizontal className="w-4 h-4" />
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-[var(--color-secondary-muted)]">
            💡 คลิกค้างแล้วลากปุ่มวงกลมตรงกลางไปทางซ้าย-ขวา เพื่อเปรียบเทียบทรงตัวอักษรระหว่างฟอนต์ A และฟอนต์ B
          </p>
        </div>
      )}

      {/* ====================================================================
          โหมดที่ 3: ตัวอย่างข้อความบน Mockup (ป้ายแม่ค้า, Rich Menu, ลายน้ำบนรูป)
         ==================================================================== */}
      {viewMode === 'mockup' && fontA && (
        <div className="relative pkz-card rounded-[2.2rem] p-5 sm:p-7 space-y-6 animate-fade-in">
          <CuteWashiTape />
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-dashed border-[var(--color-border)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-secondary)]">
                เลือกฟอนต์สำหรับแสดงบน Mockup:
              </span>
              <select
                value={fontA.family_name}
                onChange={(e) => setFontAFamily(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs sm:text-sm font-bold text-[var(--color-secondary)]"
              >
                {fonts.map((f) => (
                  <option key={f.id} value={f.family_name}>
                    {f.name} (฿{f.price})
                  </option>
                ))}
              </select>
            </div>

            {/* สลับประเภท Mockup */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setMockupType('banner')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                  mockupType === 'banner'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-primary-light)] text-[var(--color-secondary)]'
                }`}
              >
                1. ป้ายบัญชี / ป้ายแม่ค้า
              </button>
              <button
                type="button"
                onClick={() => setMockupType('richmenu')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                  mockupType === 'richmenu'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-primary-light)] text-[var(--color-secondary)]'
                }`}
              >
                2. LINE Rich Menu
              </button>
              <button
                type="button"
                onClick={() => setMockupType('watermark')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                  mockupType === 'watermark'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-primary-light)] text-[var(--color-secondary)]'
                }`}
              >
                3. ลายน้ำบนรูปสินค้า
              </button>
            </div>
          </div>

          {/* Mockup 1: ป้ายบัญชี / ป้ายแม่ค้าออนไลน์ */}
          {mockupType === 'banner' && (
            <div className="max-w-2xl mx-auto rounded-3xl bg-gradient-to-br from-[#fff5f8] via-white to-[#fdf8f2] border-2 border-[#4a3228] p-6 sm:p-8 shadow-sm space-y-5 relative overflow-hidden">
              <CardCornerDoodle variant="flower" position="top-right" />
              <CardCornerDoodle variant="heart" position="top-left" />
              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-0.5 rounded-full bg-[#fceef2] border border-[#4a3228] text-[11px] font-bold text-[#4a3228]">
                  ✿ SHOP PAYMENT BANNER MOCKUP ✿
                </span>
                <h3
                  style={{
                    fontFamily: getFontStack(fontA),
                    fontSize: `${Math.min(44, Math.max(24, fontSize))}px`,
                    letterSpacing: `${letterSpacing}px`,
                    color: activeTextColor,
                  }}
                  className="font-bold pt-2 leading-snug"
                >
                  {customText || 'ร้าน pakzy.o ขอบคุณทุกออเดอร์เลยน้า ♡'}
                </h3>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-dashed border-[#ec7a9a] flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#fceef2] border-1.5 border-[#4a3228] flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#4a3228]">QR CODE</span>
                  <CuteHeart className="w-5 h-5 mt-1" />
                </div>
                <div
                  style={{ fontFamily: getFontStack(fontA) }}
                  className="text-center sm:text-left space-y-1 flex-1"
                >
                  <div className="text-lg sm:text-xl font-bold text-[#4a3228]">
                    ธ.กสิกรไทย: 123-4-56789-0
                  </div>
                  <div className="text-sm sm:text-base text-[#7d5d50]">
                    ชื่อบัญชี: สตูดิโอ pakzy.o (โอนแล้วแจ้งสลิปได้เลยนะคะ ♥)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mockup 2: LINE Rich Menu */}
          {mockupType === 'richmenu' && (
            <div className="max-w-2xl mx-auto rounded-3xl bg-[#fff5f8] border-2 border-[#4a3228] p-5 sm:p-6 shadow-sm space-y-4">
              <div className="text-center">
                <span className="text-xs font-bold text-[#ec7a9a]">
                  ✿ ตัวอย่างปุ่มเมนู LINE OA Rich Menu ด้วยฟอนต์ {fontA.name} ✿
                </span>
              </div>
              <div
                style={{ fontFamily: getFontStack(fontA) }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {[
                  { icon: '🌸', title: 'ดูสินค้าทั้งหมด', sub: 'New Collection' },
                  { icon: '✨', title: customText.slice(0, 18) || 'โปรโมชันวันนี้', sub: 'Special Deal' },
                  { icon: '💖', title: 'รีวิวจากลูกค้า', sub: 'Customer Love' },
                  { icon: '🛒', title: 'วิธีการสั่งซื้อ', sub: 'How to Order' },
                  { icon: '🚚', title: 'เช็กเลขพัสดุ', sub: 'Tracking No.' },
                  { icon: '💬', title: 'ทักแชตแอดมิน', sub: 'LINE @280npxvj' },
                ].map((btn, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white border-1.5 border-[#4a3228] text-center space-y-1 shadow-2xs"
                  >
                    <div className="text-2xl">{btn.icon}</div>
                    <div
                      style={{ color: activeTextColor }}
                      className="text-base sm:text-lg font-bold text-[#4a3228] truncate"
                    >
                      {btn.title}
                    </div>
                    <div className="text-xs text-[#7d5d50]">{btn.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mockup 3: ลายน้ำบนรูปสินค้า */}
          {mockupType === 'watermark' && (
            <div className="max-w-xl mx-auto relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-[#4a3228] bg-gradient-to-tr from-[#fceef2] via-[#fffaf8] to-[#f7ede8] flex items-center justify-center p-6">
              <img
                src="/r2/seed/product-retouch.svg"
                alt="Product background"
                className="absolute inset-0 w-full h-full object-cover opacity-55"
              />
              {/* ป้ายลายน้ำโปร่งแสงตรงกลางภาพ (ตรง ไม่เอียง) */}
              <div className="relative z-10 px-7 py-5 rounded-full bg-white/85 backdrop-blur-xs border-2 border-dashed border-[#4a3228] text-center shadow-md">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <CuteSparkle className="w-4 h-4" />
                  <CuteHeart className="w-4 h-4" />
                  <CuteFlower className="w-4 h-4" />
                </div>
                <p
                  style={{
                    fontFamily: getFontStack(fontA),
                    fontSize: `${Math.min(42, Math.max(22, fontSize))}px`,
                    letterSpacing: `${letterSpacing}px`,
                    color: activeTextColor,
                  }}
                  className="font-bold leading-tight"
                >
                  {customText || 'pakzy.o handmade studio ♡'}
                </p>
                <span className="text-[11px] font-semibold tracking-widest uppercase text-[#7d5d50]">
                  ✿ DO NOT COPY PHOTO • @PAKZY.O ✿
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          โหมดที่ 4: แสดงทุกฟอนต์เรียงกัน
         ==================================================================== */}
      {viewMode === 'all' && (
        <div className="space-y-5 animate-fade-in">
          {fonts.map((f) => (
            <div
              key={f.id}
              className="relative pkz-card rounded-3xl p-5 sm:p-6 space-y-3"
            >
              <CardCornerDoodle variant="flower" position="top-right" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                {(() => {
                  const promo = calculateFontPriceInfo(f);
                  return (
                    <>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-[var(--color-secondary)] flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                          {f.name}
                          {promo.hasPromo ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="line-through text-xs text-[var(--color-secondary-muted)] font-normal">
                                ฿{promo.originalPrice}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
                                ฿{promo.effectivePrice}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold">
                                {promo.discountBadgeText}
                              </span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
                              ฿{f.price}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-[var(--color-secondary-muted)]">{f.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleOrderFont(f, e)}
                          className="pkz-order-btn px-4 py-2 rounded-full bg-[var(--color-secondary)] text-[var(--color-bg)] text-xs font-semibold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>ใส่ตะกร้า (฿{promo.effectivePrice})</span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div
                style={{
                  backgroundColor: paperTheme.bg,
                  color: activeTextColor,
                  borderColor: paperTheme.border,
                }}
                className={`rounded-2xl border-2 p-5 transition-colors ${paperPattern.className}`}
              >
                <p
                  style={{
                    fontFamily: getFontStack(f),
                    fontSize: `${fontSize}px`,
                    letterSpacing: `${letterSpacing}px`,
                    lineHeight,
                    textAlign,
                  }}
                  className="break-words"
                >
                  {customText || f.sample_text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* การ์ดแนะนำสิทธิ์การใช้งานฟอนต์ */}
      <div className="relative pkz-card rounded-[2rem] p-6 sm:p-8 text-center space-y-2.5">
        <CardCornerDoodle variant="heart" position="top-left" />
        <CardCornerDoodle variant="star" position="bottom-right" />
        <div className="inline-flex items-center justify-center gap-2">
          <CuteFlower className="w-4 h-4" />
          <CuteBow className="w-7 h-6" />
          <CuteHeart className="w-4 h-4" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-[var(--color-secondary)]">
          ทุกฟอนต์ของร้าน pakzy.o รองรับทั้งการใช้งานส่วนตัวและเชิงพาณิชย์ ♡
        </h3>
        <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)] max-w-2xl mx-auto leading-relaxed">
          ได้รับไฟล์ <strong>.TTF</strong> พร้อมใช้งาน มีครบ 3 น้ำหนัก: <strong>บาง / ปกติ / หนา (Light, Regular, Bold)</strong> ติดตั้งง่ายทั้งใน iPad (GoodNotes, Procreate, CapCut, Phonto, Canva) รวมถึงคอมพิวเตอร์ Windows และ Mac สระไม่ลอย มีวรรณยุกต์ครบถ้วน พิมพ์งานได้สวยละมุนค่ะ ♡
        </p>
      </div>
    </div>
  );
};
