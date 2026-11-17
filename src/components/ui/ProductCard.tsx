import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, Type } from 'lucide-react';
import type { Product } from '../../types';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import {
  CuteHeart,
  CuteFlower,
  CuteSparkle,
  CardCornerDoodle,
} from './Decorations';

const SEED_FONT_SPECIMEN_MAP: Record<
  string,
  {
    series: string;
    familyName: string;
    displayName: string;
    tagline: string;
    sampleTh: string;
    sampleEn: string;
    bgTone: string;
    pillTone: string;
  }
> = {
  '/r2/seed/font-baitoey.svg': {
    series: 'PKZ FONT SERIES 01',
    familyName: 'PKZ Baitoey',
    displayName: 'PKZ Baitoey (ใบเตย)',
    tagline: 'ฟอนต์ลายมือกลมปุ๊กปิ๊ก อ่านง่าย สระไม่ลอย ♡',
    sampleTh: '“ฝากร้านหน่อยนะคะ ขอบคุณทุกออเดอร์เลยน้า”',
    sampleEn: 'Aa Bb Cc 1234567890 ๑๒๓๔๕ ♥ ✿',
    bgTone: '#fff6f9',
    pillTone: '#fceef2',
  },
  '/r2/seed/font-chocopink.svg': {
    series: 'PKZ FONT SERIES 02',
    familyName: 'PKZ Choco Pink',
    displayName: 'PKZ Choco Pink (ช็อกโกพิงค์)',
    tagline: 'ลายมือเส้นคลีนมินิมอล สไตล์คาเฟ่เกาหลี ✿',
    sampleTh: '“เมนูใหม่ประจำสัปดาห์ หอมกรุ่นจากเตาทุกวัน”',
    sampleEn: 'Sweet Cafe & Bakery Studio 2026 ♡',
    bgTone: '#fdf8f5',
    pillTone: '#f7ede8',
  },
  '/r2/seed/font-milkystar.svg': {
    series: 'PKZ FONT SERIES 03',
    familyName: 'PKZ Milky Star',
    displayName: 'PKZ Milky Star (มิลกี้สตาร์)',
    tagline: 'ฟอนต์พาดหัวสดใส โดดเด่นสะดุดตา ☆',
    sampleTh: '“โปรโมชันลดพิเศษ ส่งฟรีทุกออเดอร์วันนี้!”',
    sampleEn: 'Special Promotion 50% OFF ✦',
    bgTone: '#fff7fa',
    pillTone: '#fceef2',
  },
  '/r2/seed/font-brownienote.svg': {
    series: 'PKZ FONT SERIES 04',
    familyName: 'PKZ Brownie Note',
    displayName: 'PKZ Brownie Note (บราวนี่โน้ต)',
    tagline: 'ลายมือจดสรุปเรียบร้อย อ่านสบายตาทุกย่อหน้า',
    sampleTh: '“แจ้งเลขพัสดุและรายละเอียดการดูแลรักษาสินค้า”',
    sampleEn: 'Thank you for supporting our small business ♡',
    bgTone: '#faf5f2',
    pillTone: '#f7ede8',
  },
};

/**
 * การ์ดแสดงตัวอย่างฟอนต์แบบสด (Live @font-face Specimen)
 * เมื่อยังไม่ได้อัปโหลดรูปหน้าปกของตัวเอง จะแสดงตัวอย่างฟอนต์จริงแบบไม่ล้นกรอบ
 * และเมื่ออัปโหลดรูปภาพแล้ว จะเปลี่ยนไปแสดงรูปภาพที่อัปโหลดทันที
 */
export const FontSpecimenArtwork: React.FC<{
  imageUrl?: string;
  compact?: boolean;
}> = ({ imageUrl = '', compact = true }) => {
  const spec = SEED_FONT_SPECIMEN_MAP[imageUrl];
  if (!spec) return null;

  return (
    <div
      className="w-full h-full flex items-center justify-center p-3 sm:p-4 select-none"
      style={{ backgroundColor: spec.bgTone }}
    >
      <div className="relative w-full h-full rounded-2xl bg-white border-2 border-[#4a3228]/80 px-3.5 py-3 flex flex-col items-center justify-between text-center shadow-2xs overflow-hidden">
        <span className="absolute top-2.5 left-2.5 opacity-70 pointer-events-none">
          <CuteFlower className="w-3.5 h-3.5" />
        </span>
        <span className="absolute bottom-2.5 right-2.5 opacity-70 pointer-events-none">
          <CuteSparkle className="w-3.5 h-3.5" />
        </span>

        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#4a3228] border border-[#4a3228]/30 tracking-wide"
          style={{ backgroundColor: spec.pillTone }}
        >
          <CuteHeart className="w-2.5 h-2.5" />
          {spec.series}
        </span>

        <div
          className="px-2 leading-tight text-[#4a3228] font-bold truncate max-w-full"
          style={{
            fontFamily: `'${spec.familyName}', 'Prompt', sans-serif`,
            fontSize: compact
              ? 'clamp(1.05rem, 2.1vw, 1.35rem)'
              : 'clamp(1.4rem, 3vw, 2rem)',
          }}
        >
          {spec.displayName}
        </div>

        <div
          className="text-[11px] sm:text-xs font-semibold text-[#ec7a9a] px-2 line-clamp-1"
          style={{
            fontFamily: `'${spec.familyName}', 'Prompt', sans-serif`,
          }}
        >
          {spec.tagline}
        </div>

        <div className="w-full rounded-xl bg-[#fffaf8] border border-dashed border-[#4a3228]/35 px-2.5 py-2 space-y-0.5">
          <div
            className="text-[11px] sm:text-xs font-semibold text-[#4a3228] line-clamp-1"
            style={{
              fontFamily: `'${spec.familyName}', 'Prompt', sans-serif`,
            }}
          >
            {spec.sampleTh}
          </div>
          <div
            className="text-[10px] sm:text-[11px] text-[#7d5d50] line-clamp-1"
            style={{
              fontFamily: `'${spec.familyName}', 'Prompt', sans-serif`,
            }}
          >
            {spec.sampleEn}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProductCard: React.FC<{ product: Product; isSelected?: boolean }> = ({
  product,
  isSelected = false,
}) => {
  const { addToOrderCart } = useSite();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const currentImageUrl = product.image_url || '/r2/seed/product-banner.svg';
  const hasLiveFontSpecimen = Boolean(
    currentImageUrl && SEED_FONT_SPECIMEN_MAP[currentImageUrl]
  );

  const productTargetUrl = `/products/${product.slug || product.id}`;

  const handleCardClick = (e: React.MouseEvent) => {
    // หากคลิกที่ปุ่มหรือลิงก์ภายใน ไม่ต้อง trigger card navigation ซ้ำ
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, label')) {
      return;
    }
    setIsNavigating(true);
    navigate(productTargetUrl);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, label')) {
        return;
      }
      e.preventDefault();
      setIsNavigating(true);
      navigate(productTargetUrl);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToOrderCart(
      {
        product_id: product.id,
        product_title: product.title,
        category_type: product.category_type === 'font' ? 'font' : 'service',
        quantity: 1,
        unit_price: product.price,
        item_note: '',
        image_url: currentImageUrl,
      },
      { clientX: e.clientX, clientY: e.clientY }
    );
    showToast(`เพิ่ม "${product.title}" ลงในตะกร้าแล้วค่ะ ♡ (ดูที่ตะกร้าด้านบนเมื่อพร้อมสั่งซื้อ)`, 'success');
  };

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`ดูรายละเอียด ${product.title}`}
      className={`group relative pkz-card pkz-sticker-card rounded-[2rem] overflow-hidden flex flex-col p-2.5 h-full cursor-pointer focus:outline-hidden ${
        isNavigating || isSelected ? 'is-selected' : ''
      }`}
    >
      {/* สถานะกำลังเปิดหน้ารายละเอียด */}
      {isNavigating && (
        <div className="absolute inset-0 z-30 bg-white/75 backdrop-blur-[2px] flex items-center justify-center rounded-[2rem] transition-opacity">
          <div className="px-3.5 py-1.5 rounded-full bg-white shadow-md border border-[var(--color-primary)] text-xs font-bold text-[var(--color-primary)] flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
            <span>กำลังเปิด...</span>
          </div>
        </div>
      )}

      <CardCornerDoodle
        variant={product.category_type === 'font' ? 'flower' : 'heart'}
        position="bottom-right"
        className="opacity-35 group-hover:opacity-80 transition-opacity"
      />

      <div className="relative aspect-[4/3] rounded-[1.4rem] overflow-hidden bg-[var(--color-primary-light)]/50 border border-[var(--color-border)]/70">
        <Link
          to={productTargetUrl}
          onClick={(e) => {
            e.stopPropagation();
            setIsNavigating(true);
          }}
          className="block w-full h-full"
        >
          {hasLiveFontSpecimen ? (
            <div className="w-full h-full group-hover:scale-[1.02] transition-transform duration-300">
              <FontSpecimenArtwork imageUrl={currentImageUrl} compact />
            </div>
          ) : (
            <img
              src={currentImageUrl}
              alt={product.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            />
          )}
        </Link>

        {/* ป้าย Badge พิเศษวางมุมบนขวาตรง ๆ ไม่เอียง */}
        {product.badge && (
          <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--color-primary)] text-white shadow-xs border border-white/80 inline-flex items-center gap-1">
              <span>✦</span>
              {product.badge}
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5 pt-4 flex-1 flex flex-col">
        <div className="text-[11px] font-semibold text-[var(--color-primary)] mb-1 flex items-center gap-1.5">
          {product.category_type === 'font' ? (
            <CuteFlower className="w-3.5 h-3.5" />
          ) : (
            <CuteHeart className="w-3.5 h-3.5" />
          )}
          <span>{product.category_name || 'สินค้าและบริการ'}</span>
        </div>
        <Link
          to={productTargetUrl}
          onClick={(e) => {
            e.stopPropagation();
            setIsNavigating(true);
          }}
          className="text-base sm:text-lg font-bold text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition line-clamp-2 mb-1.5"
        >
          {product.title}
        </Link>
        {product.subtitle && (
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)] line-clamp-2 mb-4 flex-1">
            {product.subtitle}
          </p>
        )}

        <div className="pt-3 mt-auto border-t border-dashed border-[var(--color-border)] flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-[var(--color-secondary-muted)] block">
              {product.price_label || 'ราคา'}
            </span>
            <span className="text-lg sm:text-xl font-bold text-[var(--color-primary)]">
              ฿{Number(product.price).toLocaleString('th-TH')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {product.category_type === 'font' && (
              <Link
                to="/font-tester"
                title="ทดลองพิมพ์ฟอนต์"
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-secondary)] hover:bg-[var(--color-primary)] hover:text-white active:scale-95 transition-all shadow-2xs"
              >
                <Type className="w-4 h-4" />
              </Link>
            )}
            <Link
              to={productTargetUrl}
              onClick={(e) => {
                e.stopPropagation();
                setIsNavigating(true);
              }}
              className="px-3 py-2 rounded-full text-xs font-semibold border border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] hover:border-[var(--color-primary)] active:scale-95 transition-all inline-flex items-center gap-1 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" />
              ดูงาน
            </Link>
            <button
              type="button"
              onClick={handleAddToCart}
              title="ใส่ตะกร้าไว้ก่อน"
              className="pkz-order-btn px-3.5 py-2 rounded-full text-xs font-semibold bg-[var(--color-secondary)] text-[var(--color-bg)] hover:bg-[var(--color-primary)] hover:text-white active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              ใส่ตะกร้า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
