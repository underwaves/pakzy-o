import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AppVariables } from './types';
import { publicRoute } from './routes/public';
import { adminRoute } from './routes/admin';
import { filesRoute } from './routes/files';
import { processExpiredPoints } from './utils/loyalty';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function applySecurityHeaders(headers: Headers): void {
  headers.set('Content-Security-Policy', CSP_POLICY);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// ตั้งค่า Security Headers พื้นฐานสำหรับทุก Response
app.use('*', async (c, next) => {
  await next();
  applySecurityHeaders(c.res.headers);
});

// เปิด CORS สำหรับ /api/* และ /r2/* (จำเป็นสำหรับการโหลดฟอนต์ผ่าน @font-face)
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || '',
    credentials: true,
  })
);

app.use(
  '/r2/*',
  cors({
    origin: '*',
  })
);

// เสิร์ฟไฟล์รูปภาพและฟอนต์ตัวอย่างจาก Cloudflare R2
app.route('/r2', filesRoute);
app.route('/api/files', filesRoute);

// เส้นทาง API สำหรับระบบหลังบ้าน (Admin)
app.route('/api/admin', adminRoute);

// เส้นทาง API สาธารณะสำหรับหน้าบ้าน
app.route('/api', publicRoute);

// จัดการกรณีเรียก API ที่ไม่มีอยู่จริง
app.all('/api/*', (c) => {
  return c.json({ error: 'ไม่พบ API Endpoint ที่เรียกใช้งาน' }, 404);
});

// เสิร์ฟหน้าบ้าน React SPA ผ่าน Workers Static Assets (ASSETS Binding) พร้อม Security Headers
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    const assetRes = await c.env.ASSETS.fetch(c.req.raw);
    const headers = new Headers(assetRes.headers);
    applySecurityHeaders(headers);
    return new Response(assetRes.body, {
      status: assetRes.status,
      statusText: assetRes.statusText,
      headers,
    });
  }
  return c.text('pakzy.o Cloudflare Worker is running.', 200);
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(processExpiredPoints(env.DB));
  },
};
