import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { generateTrackingToken, hashTrackingToken } from '../worker/utils/crypto';
import { publicRoute } from '../worker/routes/public';
import type { Env, AppVariables } from '../worker/types';

describe('Order Tracking Token, Privacy & Security Tests', () => {
  describe('generateTrackingToken & hashTrackingToken primitives', () => {
    it('generates high-entropy tracking tokens prefixed with trk_', () => {
      const token = generateTrackingToken();
      expect(typeof token).toBe('string');
      expect(token.startsWith('trk_')).toBe(true);
      expect(token.length).toBeGreaterThanOrEqual(40);
    });

    it('generates distinct CSPRNG random tokens on each invocation', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 50; i++) {
        tokens.add(generateTrackingToken());
      }
      expect(tokens.size).toBe(50);
    });

    it('hashes tracking token deterministically to a 64-char SHA-256 hex string', async () => {
      const token = generateTrackingToken();
      const hash1 = await hashTrackingToken(token);
      const hash2 = await hashTrackingToken(token);

      expect(typeof hash1).toBe('string');
      expect(hash1).toHaveLength(64); // 256 bits = 64 hex characters
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
      expect(hash1).toBe(hash2);
    });

    it('produces distinct hashes for different tokens', async () => {
      const tokenA = generateTrackingToken();
      const tokenB = generateTrackingToken();
      const hashA = await hashTrackingToken(tokenA);
      const hashB = await hashTrackingToken(tokenB);

      expect(hashA).not.toBe(hashB);
    });
  });

  describe('GET /api/orders/track/:order_code Endpoint Security & Privacy', () => {
    const UNIFORM_404 = 'ไม่พบข้อมูลคำสั่งซื้อ หรือข้อมูลการเข้าถึงไม่ถูกต้องค่ะ';

    async function setupTrackingTest(options?: { rateLimitAllowed?: boolean }) {
      const rawToken = generateTrackingToken();
      const tokenHash = await hashTrackingToken(rawToken);

      const mockOrders: Record<string, any> = {
        'PKZ-VALID-001': {
          id: 1,
          order_code: 'PKZ-VALID-001',
          customer_name: 'Khun Somchai',
          customer_email: 'somchai@secret-private-domain.com',
          customer_phone: '081-999-8888',
          customer_contact: '@somchai_line',
          custom_brief: 'Private sensitive brief info',
          total_amount: 328,
          discount_amount: 20,
          status: 'completed',
          payment_status: 'verified',
          slip_url: 'https://r2.qokhims.com/slips/secret-slip.jpg',
          slip_trans_ref: 'TRANS-REF-SECRET-999',
          slip_verify_note: 'Verified OK',
          drive_link: 'https://drive.google.com/drive/folders/qokhims-safe-link-123',
          due_date: '2026-11-20',
          slip_verified: 1,
          channel: 'web',
          created_at: '2026-11-16 10:00:00',
          tracking_token_hash: tokenHash,
        },
        'PKZ-LEGACY-002': {
          id: 2,
          order_code: 'PKZ-LEGACY-002',
          customer_name: 'Khun Legacy',
          customer_email: 'legacy@example.com',
          total_amount: 159,
          status: 'completed',
          drive_link: 'https://drive.google.com/legacy-link',
          tracking_token_hash: null, // Legacy order before migration 0007
        },
      };

      const mockOrderItems: Record<number, any[]> = {
        1: [
          {
            product_title: 'ฟอนต์ PKZ Baitoey',
            category_type: 'font',
            quantity: 1,
            unit_price: 159,
          },
          {
            product_title: 'ฟอนต์ PKZ Choco Pink',
            category_type: 'font',
            quantity: 1,
            unit_price: 169,
          },
        ],
      };

      const mockDb = {
        prepare: (query: string) => ({
          bind: (...args: any[]) => ({
            first: async () => {
              if (query.includes('FROM rate_limits')) {
                if (options?.rateLimitAllowed === false) {
                  return { count: 999, first_request_at: Math.floor(Date.now() / 1000) };
                }
                return null;
              }
              if (query.includes('FROM orders')) {
                const code = String(args[0]).toUpperCase();
                return mockOrders[code] || null;
              }
              return null;
            },
            all: async () => {
              if (query.includes('FROM order_items')) {
                const orderId = Number(args[0]);
                return { results: mockOrderItems[orderId] || [] };
              }
              return { results: [] };
            },
            run: async () => ({ meta: { changes: 1 } }),
          }),
        }),
      };

      const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
      app.route('/api', publicRoute);

      const env: Env = {
        DB: mockDb as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
        ENVIRONMENT: 'test',
      };

      return { app, env, rawToken };
    }

    it('rejects tracking request when token is completely missing (Uniform 404)', async () => {
      const { app, env } = await setupTrackingTest();

      const res = await app.request('/api/orders/track/PKZ-VALID-001', {}, env);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe(UNIFORM_404);
    });

    it('rejects tracking request when token is incorrect (Uniform 404)', async () => {
      const { app, env } = await setupTrackingTest();

      const res = await app.request(
        '/api/orders/track/PKZ-VALID-001?token=trk_wrong_token_12345',
        {},
        env
      );
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe(UNIFORM_404);
    });

    it('rejects guessing order code with uniform 404, preventing order enumeration', async () => {
      const { app, env, rawToken } = await setupTrackingTest();

      const res = await app.request(
        `/api/orders/track/PKZ-NONEXISTENT-999?token=${encodeURIComponent(rawToken)}`,
        {},
        env
      );
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe(UNIFORM_404);
    });

    it('rejects legacy orders without tracking token hash with uniform 404', async () => {
      const { app, env, rawToken } = await setupTrackingTest();

      const res = await app.request(
        `/api/orders/track/PKZ-LEGACY-002?token=${encodeURIComponent(rawToken)}`,
        {},
        env
      );
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe(UNIFORM_404);
    });

    it('returns 200 with order status and drive link when token is valid', async () => {
      const { app, env, rawToken } = await setupTrackingTest();

      const res = await app.request(
        `/api/orders/track/PKZ-VALID-001?token=${encodeURIComponent(rawToken)}`,
        {},
        env
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.order.order_code).toBe('PKZ-VALID-001');
      expect(body.order.status).toBe('completed');
      expect(body.order.drive_link).toBe('https://drive.google.com/drive/folders/qokhims-safe-link-123');
      expect(body.items).toHaveLength(2);
    });

    it('accepts tracking token passed via x-tracking-token header', async () => {
      const { app, env, rawToken } = await setupTrackingTest();

      const res = await app.request(
        '/api/orders/track/PKZ-VALID-001',
        {
          headers: {
            'x-tracking-token': rawToken,
          },
        },
        env
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.order.order_code).toBe('PKZ-VALID-001');
    });

    it('strictly enforces data minimization and prevents leakage of customer PII and sensitive slip data', async () => {
      const { app, env, rawToken } = await setupTrackingTest();

      const res = await app.request(
        `/api/orders/track/PKZ-VALID-001?token=${encodeURIComponent(rawToken)}`,
        {},
        env
      );
      const body = await res.json();
      const order = body.order;

      // Sensitive fields that MUST NOT exist in public response
      expect(order.customer_email).toBeUndefined();
      expect(order.customer_phone).toBeUndefined();
      expect(order.customer_contact).toBeUndefined();
      expect(order.custom_brief).toBeUndefined();
      expect(order.slip_url).toBeUndefined();
      expect(order.slip_trans_ref).toBeUndefined();
      expect(order.slip_verify_note).toBeUndefined();
      expect(order.summary_text).toBeUndefined();
      expect(order.tracking_token_hash).toBeUndefined();
    });

    it('returns 429 when rate limit is exceeded', async () => {
      const { app, env, rawToken } = await setupTrackingTest({ rateLimitAllowed: false });

      const res = await app.request(
        `/api/orders/track/PKZ-VALID-001?token=${encodeURIComponent(rawToken)}`,
        {},
        env
      );
      expect(res.status).toBe(429);

      const body = await res.json();
      expect(body.error).toContain('มีการค้นหาคำสั่งซื้อถี่เกินไป');
    });
  });
});
