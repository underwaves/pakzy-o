import { describe, it, expect } from 'vitest';
import { calculateEffectiveFontPrice, calculateOrderServerSide } from '../worker/utils/pricing';

describe('Server-Side Price Calculation & Promo Tests', () => {
  describe('calculateEffectiveFontPrice', () => {
    it('returns original price when no discount is set', () => {
      const font = {
        price: 169,
        discount_type: 'none',
        discount_value: 0,
      };
      const result = calculateEffectiveFontPrice(font);
      expect(result).toEqual({
        originalPrice: 169,
        effectivePrice: 169,
        hasPromo: false,
      });
    });

    it('applies fixed discount correctly when active', () => {
      const font = {
        price: 169,
        discount_type: 'fixed',
        discount_value: 20,
      };
      const result = calculateEffectiveFontPrice(font);
      expect(result).toEqual({
        originalPrice: 169,
        effectivePrice: 149,
        hasPromo: true,
      });
    });

    it('applies percent discount correctly when active', () => {
      const font = {
        price: 200,
        discount_type: 'percent',
        discount_value: 15,
      };
      const result = calculateEffectiveFontPrice(font);
      expect(result).toEqual({
        originalPrice: 200,
        effectivePrice: 170, // 200 * 0.85 = 170
        hasPromo: true,
      });
    });

    it('ignores discount if current time is before promo_start_at', () => {
      const now = new Date('2026-11-16T12:00:00Z');
      const font = {
        price: 169,
        discount_type: 'fixed',
        discount_value: 50,
        promo_start_at: '2026-11-20T00:00:00Z',
        promo_end_at: '2026-11-25T23:59:59Z',
      };
      const result = calculateEffectiveFontPrice(font, now);
      expect(result).toEqual({
        originalPrice: 169,
        effectivePrice: 169,
        hasPromo: false,
      });
    });

    it('ignores discount if current time is after promo_end_at (expired promotion)', () => {
      const now = new Date('2026-11-16T12:00:00Z');
      const font = {
        price: 169,
        discount_type: 'fixed',
        discount_value: 50,
        promo_start_at: '2026-11-01T00:00:00Z',
        promo_end_at: '2026-11-10T23:59:59Z',
      };
      const result = calculateEffectiveFontPrice(font, now);
      expect(result).toEqual({
        originalPrice: 169,
        effectivePrice: 169,
        hasPromo: false,
      });
    });

    it('applies discount if current time is within promo window', () => {
      const now = new Date('2026-11-16T12:00:00Z');
      const font = {
        price: 169,
        discount_type: 'fixed',
        discount_value: 30,
        promo_start_at: '2026-11-10T00:00:00Z',
        promo_end_at: '2026-11-20T23:59:59Z',
      };
      const result = calculateEffectiveFontPrice(font, now);
      expect(result).toEqual({
        originalPrice: 169,
        effectivePrice: 139,
        hasPromo: true,
      });
    });

    it('ensures effectivePrice never drops below zero', () => {
      const font = {
        price: 50,
        discount_type: 'fixed',
        discount_value: 100, // discount > price
      };
      const result = calculateEffectiveFontPrice(font);
      expect(result.effectivePrice).toBe(0);
    });
  });

  describe('calculateOrderServerSide DB Integration', () => {
    function createMockDb(fixtures: {
      fonts?: Array<{
        id: number;
        product_id: number | null;
        name: string;
        price: number;
        discount_type?: string;
        discount_value?: number;
        promo_start_at?: string | null;
        promo_end_at?: string | null;
        is_active: number;
      }>;
      products?: Array<{
        id: number;
        title: string;
        price: number;
        is_active: number;
      }>;
    }) {
      const fonts = fixtures.fonts || [];
      const products = fixtures.products || [];

      return {
        prepare: (query: string) => ({
          bind: (...args: any[]) => ({
            first: async () => {
              if (query.includes('FROM fonts')) {
                const [pId, fId] = args;
                return fonts.find((f) => f.product_id === pId || f.id === fId) || null;
              }
              if (query.includes('FROM products')) {
                const [pId] = args;
                return products.find((p) => p.id === pId) || null;
              }
              return null;
            },
          }),
        }),
      } as any;
    }

    it('calculates order total from server DB, ignoring client fake prices', async () => {
      const mockDb = createMockDb({
        fonts: [
          {
            id: 1,
            product_id: 101,
            name: 'PKZ Baitoey',
            price: 159,
            discount_type: 'none',
            discount_value: 0,
            is_active: 1,
          },
        ],
      });

      // Client attempts to send fake unit_price of 1 THB
      const rawItems = [
        {
          product_id: 101,
          quantity: 2,
          unit_price: 1, // FAKE PRICE FROM CLIENT
          product_title: 'Fake Title',
        } as any,
      ];

      const calculation = await calculateOrderServerSide(mockDb, rawItems);
      expect(calculation.totalAmount).toBe(318); // 159 * 2 = 318, not 2!
      expect(calculation.items[0].unit_price).toBe(159);
      expect(calculation.items[0].product_title).toBe('ฟอนต์ PKZ Baitoey');
    });

    it('rejects order with negative or manipulated prices by overriding with DB price', async () => {
      const mockDb = createMockDb({
        fonts: [
          {
            id: 2,
            product_id: 102,
            name: 'PKZ Choco Pink',
            price: 169,
            discount_type: 'none',
            discount_value: 0,
            is_active: 1,
          },
        ],
      });

      const rawItems = [
        {
          product_id: 102,
          quantity: 1,
          unit_price: -999, // Exploit attempt
        } as any,
      ];

      const calculation = await calculateOrderServerSide(mockDb, rawItems);
      expect(calculation.totalAmount).toBe(169);
      expect(calculation.items[0].unit_price).toBe(169);
    });

    it('rejects order if font is inactive (is_active = 0)', async () => {
      const mockDb = createMockDb({
        fonts: [
          {
            id: 3,
            product_id: 103,
            name: 'PKZ Sunset',
            price: 149,
            is_active: 0, // Inactive!
          },
        ],
      });

      const rawItems = [{ product_id: 103, quantity: 1 }];
      await expect(calculateOrderServerSide(mockDb, rawItems)).rejects.toThrow(
        'ปิดจำหน่ายชั่วคราว ไม่สามารถสั่งซื้อได้ค่ะ'
      );
    });

    it('rejects order if product does not exist in DB', async () => {
      const mockDb = createMockDb({
        fonts: [],
        products: [],
      });

      const rawItems = [{ product_id: 9999, quantity: 1 }];
      await expect(calculateOrderServerSide(mockDb, rawItems)).rejects.toThrow(
        'ไม่พบสินค้ารหัส 9999 ในระบบค่ะ'
      );
    });

    it('rejects order with invalid quantities (<= 0 or > 99 or floating numbers)', async () => {
      const mockDb = createMockDb({
        fonts: [{ id: 1, product_id: 101, name: 'PKZ Test', price: 100, is_active: 1 }],
      });

      await expect(
        calculateOrderServerSide(mockDb, [{ product_id: 101, quantity: 0 }])
      ).rejects.toThrow('จำนวนสินค้าต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 99 รายการค่ะ');

      await expect(
        calculateOrderServerSide(mockDb, [{ product_id: 101, quantity: -5 }])
      ).rejects.toThrow('จำนวนสินค้าต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 99 รายการค่ะ');

      await expect(
        calculateOrderServerSide(mockDb, [{ product_id: 101, quantity: 100 }])
      ).rejects.toThrow('จำนวนสินค้าต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 99 รายการค่ะ');

      await expect(
        calculateOrderServerSide(mockDb, [{ product_id: 101, quantity: 1.5 as any }])
      ).rejects.toThrow('จำนวนสินค้าต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 99 รายการค่ะ');
    });

    it('correctly aggregates multiple items with promo discount', async () => {
      const now = new Date('2026-11-16T12:00:00Z');
      const mockDb = createMockDb({
        fonts: [
          {
            id: 1,
            product_id: 101,
            name: 'PKZ Promo Font',
            price: 200,
            discount_type: 'fixed',
            discount_value: 30, // 170
            promo_start_at: '2026-11-01T00:00:00Z',
            promo_end_at: '2026-11-30T23:59:59Z',
            is_active: 1,
          },
          {
            id: 2,
            product_id: 102,
            name: 'PKZ Normal Font',
            price: 150,
            discount_type: 'none',
            discount_value: 0,
            is_active: 1,
          },
        ],
      });

      const rawItems = [
        { product_id: 101, quantity: 2 }, // 170 * 2 = 340 (discount: 60)
        { product_id: 102, quantity: 1 }, // 150 * 1 = 150 (discount: 0)
      ];

      const calculation = await calculateOrderServerSide(mockDb, rawItems, now);
      expect(calculation.totalAmount).toBe(490); // 340 + 150 = 490
      expect(calculation.totalDiscount).toBe(60);
      expect(calculation.items).toHaveLength(2);
    });
  });
});
