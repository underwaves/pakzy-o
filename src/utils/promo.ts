import type { FontItem } from '../types';

export interface FontPriceInfo {
  originalPrice: number;
  effectivePrice: number;
  hasPromo: boolean;
  discountBadgeText?: string;
}

/**
 * คำนวณราคาฟอนต์หลังหักส่วนลดโปรโมชัน (ถ้ามีและยังอยู่ในช่วงเวลา)
 */
export function calculateFontPriceInfo(font: FontItem): FontPriceInfo {
  const originalPrice = Number(font.price) || 0;
  const discountType = font.discount_type || 'none';
  const discountValue = Number(font.discount_value) || 0;

  if (discountType === 'none' || discountValue <= 0) {
    return {
      originalPrice,
      effectivePrice: originalPrice,
      hasPromo: false,
    };
  }

  // ตรวจสอบช่วงวันที่โปรโมชัน (ถ้ากำหนดไว้)
  const now = new Date();
  if (font.promo_start_at && font.promo_start_at.trim()) {
    const startDate = new Date(font.promo_start_at);
    if (now < startDate) {
      return {
        originalPrice,
        effectivePrice: originalPrice,
        hasPromo: false,
      };
    }
  }

  if (font.promo_end_at && font.promo_end_at.trim()) {
    const endDate = new Date(font.promo_end_at);
    // หากเป็นวันที่แบบ YYYY-MM-DD ให้ครอบคลุมจนถึงสิ้นวัน 23:59:59
    if (font.promo_end_at.length <= 10) {
      endDate.setHours(23, 59, 59, 999);
    }
    if (now > endDate) {
      return {
        originalPrice,
        effectivePrice: originalPrice,
        hasPromo: false,
      };
    }
  }

  let effectivePrice = originalPrice;
  let discountBadgeText = '';

  if (discountType === 'fixed') {
    effectivePrice = Math.max(0, originalPrice - discountValue);
    discountBadgeText = `ลด ฿${discountValue}`;
  } else if (discountType === 'percent') {
    effectivePrice = Math.max(0, Math.round(originalPrice * (1 - discountValue / 100)));
    discountBadgeText = `ลด ${discountValue}%`;
  }

  return {
    originalPrice,
    effectivePrice,
    hasPromo: effectivePrice < originalPrice,
    discountBadgeText,
  };
}
