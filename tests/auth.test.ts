import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { getJwtSecret, MIN_JWT_SECRET_LENGTH, adminAuthMiddleware, ADMIN_COOKIE_NAME } from '../worker/middleware/auth';
import { signJwt, verifyJwt } from '../worker/utils/crypto';
import type { Env, AppVariables } from '../worker/types';

describe('Admin JWT Security & Regression Tests', () => {
  const validSecret = 'a-very-secure-secret-key-that-is-at-least-32-chars-long';
  const shortSecret = 'short-secret';

  describe('getJwtSecret fail-closed and dev fallback behavior', () => {
    it('returns null in production when JWT_SECRET is missing (fail-closed)', () => {
      const prodEnv: Env = {
        ENVIRONMENT: 'production',
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const secret = getJwtSecret(prodEnv);
      expect(secret).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_SECURITY] JWT_SECRET is not configured in production environment')
      );
      consoleSpy.mockRestore();
    });

    it('returns null in production when JWT_SECRET is shorter than 32 characters (fail-closed)', () => {
      const prodEnv: Env = {
        ENVIRONMENT: 'production',
        JWT_SECRET: shortSecret,
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const secret = getJwtSecret(prodEnv);
      expect(secret).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`minimum length requirement (${MIN_JWT_SECRET_LENGTH} characters)`)
      );
      consoleSpy.mockRestore();
    });

    it('returns the secret in production when JWT_SECRET is >= 32 characters', () => {
      const prodEnv: Env = {
        ENVIRONMENT: 'production',
        JWT_SECRET: validSecret,
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      };
      const secret = getJwtSecret(prodEnv);
      expect(secret).toBe(validSecret);
    });

    it('returns null when ENVIRONMENT is undefined and JWT_SECRET is missing (production default fail-closed)', () => {
      const defaultEnv: Env = {
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const secret = getJwtSecret(defaultEnv);
      expect(secret).toBeNull();
      consoleSpy.mockRestore();
    });

    it('allows dev fallback ONLY when ENVIRONMENT is explicitly "development" or "test"', () => {
      const devEnv: Env = {
        ENVIRONMENT: 'development',
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      };
      const testEnv: Env = {
        ENVIRONMENT: 'test',
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      };
      
      const devSecret = getJwtSecret(devEnv);
      expect(devSecret).toBe('qokhims-local-dev-jwt-secret-key-at-least-32-chars-long');

      const testSecret = getJwtSecret(testEnv);
      expect(testSecret).toBe('qokhims-local-dev-jwt-secret-key-at-least-32-chars-long');
    });
  });

  describe('JWT Signature, Algorithm, and Expiration Verification', () => {
    it('signs and verifies a valid JWT successfully', async () => {
      const payload = {
        sub: 1,
        username: 'admin',
      };
      const token = await signJwt(payload, validSecret);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const verified = await verifyJwt(token, validSecret);
      expect(verified).not.toBeNull();
      expect(verified?.sub).toBe(1);
      expect(verified?.username).toBe('admin');
    });

    it('rejects a forged token with altered payload', async () => {
      const payload = {
        sub: 2,
        username: 'user',
      };
      const token = await signJwt(payload, validSecret);
      const [header, , signature] = token.split('.');
      
      // Tamper payload to escalate sub and username to admin
      const forgedPayload = btoa(JSON.stringify({
        sub: 1,
        username: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      const forgedToken = `${header}.${forgedPayload}.${signature}`;
      const result = await verifyJwt(forgedToken, validSecret);
      expect(result).toBeNull();
    });

    it('rejects a token signed with a different secret', async () => {
      const otherSecret = 'another-completely-different-secret-key-32chars!';
      const payload = {
        sub: 1,
        username: 'admin',
      };
      const token = await signJwt(payload, otherSecret);
      const result = await verifyJwt(token, validSecret);
      expect(result).toBeNull();
    });

    it('rejects an expired token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = {
        sub: 1,
        username: 'admin',
        exp: now - 60, // expired 60 seconds ago
        iat: now - 3600,
      };
      // Manually construct token with expired exp
      const headerSegment = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payloadSegment = btoa(JSON.stringify(expiredPayload))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const signingInput = `${headerSegment}.${payloadSegment}`;
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(validSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(signingInput)
      );
      const sigSegment = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const expiredToken = `${signingInput}.${sigSegment}`;

      const result = await verifyJwt(expiredToken, validSecret);
      expect(result).toBeNull();
    });

    it('rejects token with algorithm none or unsupported alg', async () => {
      const fakeHeader = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payload = btoa(JSON.stringify({
        sub: 1,
        username: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const fakeToken = `${fakeHeader}.${payload}.`;

      const result = await verifyJwt(fakeToken, validSecret);
      expect(result).toBeNull();
    });
  });

  describe('adminAuthMiddleware fail-closed enforcement via Hono app', () => {
    function createTestApp() {
      const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
      app.use('/api/admin/*', adminAuthMiddleware);
      app.get('/api/admin/me', (c) => {
        const admin = c.get('admin');
        return c.json({ ok: true, admin });
      });
      return app;
    }

    it('returns 500 fail-closed when production secret is missing', async () => {
      const app = createTestApp();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await app.request('/api/admin/me', {
        headers: {
          Cookie: `${ADMIN_COOKIE_NAME}=some-token`,
        },
      }, {
        ENVIRONMENT: 'production',
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('ระบบความปลอดภัยไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      consoleSpy.mockRestore();
    });

    it('returns 500 fail-closed when production secret is too short', async () => {
      const app = createTestApp();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await app.request('/api/admin/me', {
        headers: {
          Cookie: `${ADMIN_COOKIE_NAME}=some-token`,
        },
      }, {
        ENVIRONMENT: 'production',
        JWT_SECRET: shortSecret,
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('ระบบความปลอดภัยไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      consoleSpy.mockRestore();
    });

    it('returns 401 when no auth cookie is provided', async () => {
      const app = createTestApp();
      const res = await app.request('/api/admin/me', {}, {
        ENVIRONMENT: 'production',
        JWT_SECRET: validSecret,
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('กรุณาเข้าสู่ระบบ');
    });

    it('returns 401 when invalid or forged token is provided in cookie', async () => {
      const app = createTestApp();
      const res = await app.request('/api/admin/me', {
        headers: {
          Cookie: `${ADMIN_COOKIE_NAME}=invalid.token.structure`,
        },
      }, {
        ENVIRONMENT: 'production',
        JWT_SECRET: validSecret,
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('เซสชันหมดอายุหรือไม่ถูกต้อง');
    });

    it('allows access (200) and populates admin payload when valid token is provided in cookie', async () => {
      const app = createTestApp();
      const validToken = await signJwt({ sub: 1, username: 'admin' }, validSecret);

      const res = await app.request('/api/admin/me', {
        headers: {
          Cookie: `${ADMIN_COOKIE_NAME}=${validToken}`,
        },
      }, {
        ENVIRONMENT: 'production',
        JWT_SECRET: validSecret,
        DB: {} as any,
        BUCKET: {} as any,
        ASSETS: {} as any,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.admin).toMatchObject({ sub: 1, username: 'admin' });
    });
  });
});
