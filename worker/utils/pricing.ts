import type { D1Database } from '@cloudflare/workers-types';

export interface RawOrderItemInput {
  product_id?: number | null;
  quantity: number;
  item_note?: string;
}

export interface CalculatedOrderItem {
  product_id: number;
  product_title: string;
  category_type: 'service' | 'font';
  quantity: number;
  original_unit_price: number;
  unit_price: number;
  item_note: string;
  is_discounted: boolean;
}

export interface ServerOrderCalculation {
  items: CalculatedOrderItem[];
  totalAmount: number;
  totalDiscount: number;
}

/**
 * คำนวณราคาฟอนต์ตามกฎโปรโมชันของระบบฝั่ง Server โดยอิงจากเวลาปัจจุบัน
 */
export function calculateEffectiveFontPrice(
  font: {
    price: number;
    discount_type?: string | null;
    discount_value?: number | null;
    promo_start_at?: string | null;
    promo_end_at?: string | null;
  },
  now = new Date()
): { originalPrice: number; effectivePrice: number; hasPromo: boolean } {
  const originalPrice = Number(font.price) || 0;
  const discountType = font.discount_type || 'none';
  const discountValue = Number(font.discount_value) || 0;

  if (discountType === 'none' || discountValue <= 0) {
    return { originalPrice, effectivePrice: originalPrice, hasPromo: false };
  }

  if (font.promo_start_at && font.promo_start_at.trim()) {
    const start = new Date(font.promo_start_at.trim());
    if (now < start) {
      return { originalPrice, effectivePrice: originalPrice, hasPromo: false };
    }
  }

  if (font.promo_end_at && font.promo_end_at.trim()) {
    const end = new Date(font.promo_end_at.trim());
    if (font.promo_end_at.trim().length <= 10) {
      end.setHours(23, 59, 59, 999);
    }
    if (now > end) {
      return { originalPrice, effectivePrice: originalPrice, hasPromo: false };
    }
  }

  let effectivePrice = originalPrice;
  if (discountType === 'fixed') {
    effectivePrice = Math.max(0, originalPrice - discountValue);
  } else if (discountType === 'percent') {
    effectivePrice = Math.max(0, Math.round(originalPrice * (1 - discountValue / 100)));
  }

  return {
    originalPrice,
    effectivePrice,
    hasPromo: effectivePrice < originalPrice,
  };
}

/**
 * คำนวณราคาและตรวจสอบสินค้าของคำสั่งซื้อจากฐานข้อมูล D1 ฝั่ง Server 100%
 * ห้ามเชื่อถือ unit_price, product_title, discount_amount หรือ totalAmount ที่ส่งมาจากเบราว์เซอร์
 */
export async function calculateOrderServerSide(
  db: D1Database,
  rawItems: RawOrderItemInput[],
  now = new Date()
): Promise<ServerOrderCalculation> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการค่ะ');
  }

  const calculatedItems: CalculatedOrderItem[] = [];
  let totalAmount = 0;
  let totalDiscount = 0;

  for (const item of rawItems) {
    const productId = item.product_id;
    if (!productId || typeof productId !== 'number' || !Number.isInteger(productId) || productId <= 0) {
      throw new Error('รหัสสินค้าไม่ถูกต้อง กรุณาเลือกสินค้าใหม่อีกครั้งค่ะ');
    }

    const quantity = item.quantity;
    if (!quantity || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('จำนวนสินค้าต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 99 รายการค่ะ');
    }

    // ค้นหาใน fonts ก่อน (อาจจับคู่ตรงด้วย fonts.id หรือ fonts.product_id)
    const fontRow = await db
      .prepare(
        `SELECT id, product_id, name, price, discount_type, discount_value,
                promo_start_at, promo_end_at, is_active
         FROM fonts
         WHERE product_id = ? OR id = ?
         LIMIT 1`
      )
      .bind(productId, productId)
      .first<{
        id: number;
        product_id: number | null;
        name: string;
        price: number;
        discount_type: string;
        discount_value: number;
        promo_start_at: string | null;
        promo_end_at: string | null;
        is_active: number;
      }>();

    if (fontRow) {
      if (fontRow.is_active !== 1) {
        throw new Error(`ฟอนต์ "${fontRow.name}" ปิดจำหน่ายชั่วคราว ไม่สามารถสั่งซื้อได้ค่ะ`);
      }

      // หากมีการผูกกับ product_id ให้ตรวจสอบว่า product นั้นเปิดขายด้วยหรือไม่
      if (fontRow.product_id) {
        const prod = await db
          .prepare('SELECT id, is_active FROM products WHERE id = ?')
          .bind(fontRow.product_id)
          .first<{ id: number; is_active: number }>();
        if (prod && prod.is_active !== 1) {
          throw new Error(`ฟอนต์ "${fontRow.name}" ปิดจำหน่ายชั่วคราว ไม่สามารถสั่งซื้อได้ค่ะ`);
        }
      }

      const priceInfo = calculateEffectiveFontPrice(fontRow, now);
      const effectiveUnit = priceInfo.effectivePrice;
      const originalUnit = priceInfo.originalPrice;
      const itemTitle = fontRow.name.startsWith('ฟอนต์') ? fontRow.name : `ฟอนต์ ${fontRow.name}`;

      calculatedItems.push({
        product_id: fontRow.product_id || fontRow.id,
        product_title: itemTitle,
        category_type: 'font',
        quantity,
        original_unit_price: originalUnit,
        unit_price: effectiveUnit,
        item_note: item.item_note?.trim() || '',
        is_discounted: priceInfo.hasPromo,
      });

      totalAmount += effectiveUnit * quantity;
      totalDiscount += (originalUnit - effectiveUnit) * quantity;
      continue;
    }

    // หากไม่ใช่ฟอนต์ ให้ค้นหาในตาราง products (เช่น บริการออกแบบ)
    const productRow = await db
      .prepare('SELECT id, title, price, is_active FROM products WHERE id = ?')
      .bind(productId)
      .first<{
        id: number;
        title: string;
        price: number;
        is_active: number;
      }>();

    if (!productRow) {
      throw new Error(`ไม่พบสินค้ารหัส ${productId} ในระบบค่ะ`);
    }

    if (productRow.is_active !== 1) {
      throw new Error(`สินค้า "${productRow.title}" ปิดจำหน่ายชั่วคราว ไม่สามารถสั่งซื้อได้ค่ะ`);
    }

    const price = Number(productRow.price);
    if (isNaN(price) || price < 0) {
      throw new Error(`ราคาของสินค้า "${productRow.title}" ไม่ถูกต้อง ไม่สามารถคำนวณยอดได้ค่ะ`);
    }

    calculatedItems.push({
      product_id: productRow.id,
      product_title: productRow.title,
      category_type: 'service',
      quantity,
      original_unit_price: price,
      unit_price: price,
      item_note: item.item_note?.trim() || '',
      is_discounted: false,
    });

    totalAmount += price * quantity;
  }

  if (totalAmount <= 0 && calculatedItems.length > 0) {
    // ป้องกันกรณีคำนวณได้ยอด 0 หรือติดลบ
    throw new Error('ยอดคำสั่งซื้อไม่ถูกต้อง กรุณาตรวจสอบรายการสินค้าค่ะ');
  }

  return {
    items: calculatedItems,
    totalAmount,
    totalDiscount,
  };
}
