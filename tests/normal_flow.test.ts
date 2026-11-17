import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { publicRoute } from '../worker/routes/public';
import { adminRoute } from '../worker/routes/admin';
import { hashPasswordPBKDF2 } from '../worker/utils/crypto';
import type { Env, AppVariables } from '../worker/types';

describe('End-to-End Normal Happy Path Flow', () => {
  const jwtSecret = 'test-environment-jwt-secret-key-at-least-32-chars-long';

  it('runs the full customer order creation, server calculation, and tracking flow', async () => {
    // In-memory mock database state
    const orders: any[] = [];
    const orderItems: any[] = [];
    let nextOrderId = 1;

    const fonts = [
      {
        id: 1,
        product_id: 101,
        name: 'PKZ Baitoey',
        price: 159,
        discount_type: 'none',
        discount_value: 0,
        is_active: 1,
      },
      {
        id: 2,
        product_id: 102,
        name: 'PKZ Choco Pink',
        price: 169,
        discount_type: 'none',
        discount_value: 0,
        is_active: 1,
      },
    ];

    const createStatement = (query: string, boundArgs: any[] = []) => {
      const executeFirst = async () => {
        if (query.includes('FROM rate_limits')) return null;
        if (query.includes('FROM settings')) return null;
        if (query.includes('FROM customers')) return null;
        if (query.includes('FROM fonts')) {
          const [pId, fId] = boundArgs;
          return fonts.find((f) => f.product_id === pId || f.id === fId) || null;
        }
        if (query.includes('FROM products')) {
          return null;
        }
        if (query.includes('FROM orders')) {
          const code = String(boundArgs[0]).toUpperCase();
          return orders.find((o) => o.order_code.toUpperCase() === code) || null;
        }
        return null;
      };

      const executeAll = async () => {
        if (query.includes('FROM settings')) {
          return {
            results: [
              { key: 'contact_line', value: '@280npxvj' },
              { key: 'enable_line_messaging_api', value: 'false' },
            ],
          };
        }
        if (query.includes('FROM order_items')) {
          const orderId = Number(boundArgs[0]);
          return { results: orderItems.filter((it) => it.order_id === orderId) };
        }
        return { results: [] };
      };

      const executeRun = async () => {
        if (query.includes('INSERT INTO orders')) {
          const [
            order_code, customer_name, customer_contact, customer_phone,
            customer_email, custom_brief, total_amount, discount_amount,
            summary_text, customer_id, slip_url, payment_status, tracking_token_hash
          ] = boundArgs;
          const id = nextOrderId++;
          const newOrder = {
            id,
            order_code,
            customer_name,
            customer_contact,
            customer_phone,
            customer_email,
            custom_brief,
            total_amount,
            discount_amount,
            status: 'pending',
            payment_status,
            summary_text,
            customer_id,
            slip_url,
            drive_link: null,
            due_date: null,
            slip_verified: 0,
            channel: 'web',
            created_at: new Date().toISOString(),
            tracking_token_hash,
          };
          orders.push(newOrder);
          return { meta: { last_row_id: id, changes: 1 } };
        }
        return { meta: { changes: 1 } };
      };

      return {
        bind: (...args: any[]) => createStatement(query, args),
        first: executeFirst,
        all: executeAll,
        run: executeRun,
      };
    };

    const mockDb = {
      prepare: (query: string) => createStatement(query),
      batch: async (_statements: any[]) => [],
    };

    const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
    app.route('/api', publicRoute);

    const env: Env = {
      DB: mockDb as any,
      BUCKET: {} as any,
      ASSETS: {} as any,
      ENVIRONMENT: 'test',
      JWT_SECRET: jwtSecret,
    };

    // 1. Customer creates an order (even trying to inject malicious price)
    const createRes = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Customer Cute',
          customer_contact: '@cutecustomer',
          customer_email: 'cute@example.com',
          customer_phone: '0812345678',
          items: [
            {
              product_id: 101,
              quantity: 1,
              unit_price: 1, // Manipulated price
              product_title: 'Fake Title',
            },
            {
              product_id: 102,
              quantity: 2,
              unit_price: 0, // Manipulated price
            },
          ],
        }),
      },
      env
    );

    expect(createRes.status).toBe(201);
    const createdData = await createRes.json();
    expect(createdData.order).toBeDefined();
    expect(createdData.order.order_code).toMatch(/^PKZ-\d{6}-\d{4}$/);
    expect(createdData.order.tracking_token).toBeDefined();
    expect(createdData.order.tracking_token.startsWith('trk_')).toBe(true);

    // Server recalculated correct amounts: 159*1 + 169*2 = 159 + 338 = 497
    expect(createdData.order.total_amount).toBe(497);

    const orderCode = createdData.order.order_code;
    const trackingToken = createdData.order.tracking_token;

    // 2. Customer accesses the tracking endpoint with valid token
    const trackRes = await app.request(
      `/api/orders/track/${orderCode}?token=${encodeURIComponent(trackingToken)}`,
      {},
      env
    );

    expect(trackRes.status).toBe(200);
    const trackData = await trackRes.json();
    expect(trackData.order.order_code).toBe(orderCode);
    expect(trackData.order.total_amount).toBe(497);
    expect(trackData.order.status).toBe('pending');
    expect(trackData.order.customer_name).toBe('Customer Cute');
    // Ensure PII is not leaked
    expect(trackData.order.customer_email).toBeUndefined();
    expect(trackData.order.customer_phone).toBeUndefined();
    expect(trackData.order.customer_contact).toBeUndefined();
  });

  it('runs the admin login and authenticated route flow', async () => {
    const password = 'VerySecureAdminPassword123!';
    const { hashHex, saltHex } = await hashPasswordPBKDF2(password);

    const adminUser = {
      id: 1,
      username: 'admin',
      password_hash: hashHex,
      salt: saltHex,
      failed_attempts: 0,
      locked_until: null,
    };

    const createStatement = (query: string, boundArgs: any[] = []) => ({
      bind: (...args: any[]) => createStatement(query, args),
      first: async () => {
        if (query.includes('FROM rate_limits')) return null;
        if (query.includes('SELECT COUNT(*) as cnt FROM admins')) return { cnt: 1 };
        if (query.includes('FROM admins WHERE username = ?')) {
          return boundArgs[0] === 'admin' ? adminUser : null;
        }
        return null;
      },
      all: async () => ({ results: [] }),
      run: async () => ({ meta: { changes: 1 } }),
    });

    const mockDb = {
      prepare: (query: string) => createStatement(query),
    };

    const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
    app.route('/api/admin', adminRoute);

    const env: Env = {
      DB: mockDb as any,
      BUCKET: {} as any,
      ASSETS: {} as any,
      ENVIRONMENT: 'test',
      JWT_SECRET: jwtSecret,
    };

    // 1. Admin login with correct credentials
    const loginRes = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password,
        }),
      },
      env
    );

    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.message).toContain('สำเร็จ');

    const setCookieHeader = loginRes.headers.get('set-cookie');
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain('qokhims_admin_token=');
    expect(setCookieHeader?.toLowerCase()).toContain('httponly');
    expect(setCookieHeader?.toLowerCase()).toContain('samesite=lax');

    // Extract cookie value
    const match = setCookieHeader?.match(/qokhims_admin_token=([^;]+)/);
    const cookieToken = match ? match[1] : '';
    expect(cookieToken).toBeTruthy();

    // 2. Admin calls /api/admin/me with auth cookie
    const meRes = await app.request(
      '/api/admin/me',
      {
        headers: {
          Cookie: `qokhims_admin_token=${cookieToken}`,
        },
      },
      env
    );

    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.admin).toMatchObject({ sub: 1, username: 'admin' });
  });
});
