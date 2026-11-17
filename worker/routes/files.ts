import { Hono } from 'hono';
import type { Env, AppVariables } from '../types';
import { getSeedSvg, getSeedFontSourceUrl } from '../utils/sampleAssets';

export const filesRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function guessContentType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.woff2')) return 'font/woff2';
  if (lower.endsWith('.ttf')) return 'font/ttf';
  if (lower.endsWith('.otf')) return 'font/otf';
  return 'application/octet-stream';
}

function isFontKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.startsWith('fonts/') ||
    lower.endsWith('.woff2') ||
    lower.endsWith('.ttf') ||
    lower.endsWith('.otf')
  );
}

/**
 * เสิร์ฟไฟล์รูปภาพ โลโก้ และไฟล์ฟอนต์ตัวอย่าง (Preview) จาก Cloudflare R2
 * - บล็อกการเข้าถึงไฟล์ฟอนต์เต็ม (private/*, fonts/full/*) จากสาธารณะอย่างเด็ดขาด (403 Forbidden)
 * - บล็อกการเปิด URL ไฟล์ฟอนต์ในแท็บเบราว์เซอร์เพื่อดาวน์โหลดโดยตรง (Sec-Fetch-Dest: document)
 */
filesRoute.get('/*', async (c) => {
  const rawPath = c.req.path.replace(/^\/(r2|api\/files)\//, '');
  const key = decodeURIComponent(rawPath);

  if (!key || key.includes('..')) {
    return c.json({ error: 'ไม่พบไฟล์ที่ระบุ' }, 400);
  }

  const lowerKey = key.toLowerCase();

  // 1. ป้องกันการเข้าถึงไฟล์ฟอนต์เต็มหรือไฟล์ส่วนตัวใน R2 จากสาธารณะ
  if (
    lowerKey.startsWith('private/') ||
    lowerKey.startsWith('fonts/full/') ||
    lowerKey.includes('/full/')
  ) {
    return c.json(
      { error: 'ไม่อนุญาตให้เข้าถึงไฟล์ฟอนต์ตัวเต็มจากสาธารณะ (เข้าถึงได้เฉพาะไฟล์ Preview เท่านั้น)' },
      403
    );
  }

  // 2. สำหรับไฟล์ฟอนต์ตัวอย่าง (Preview) อนุญาตให้โหลดผ่าน @font-face ของเว็บ แต่บล็อกการเปิด URL ดาวน์โหลดตรงในแท็บเบราว์เซอร์
  if (isFontKey(key)) {
    const secFetchDest = c.req.header('Sec-Fetch-Dest');
    if (secFetchDest === 'document') {
      return c.json(
        { error: 'ไฟล์ฟอนต์อนุญาตเฉพาะการแสดงผลตัวอย่างบนหน้าเว็บเท่านั้น ห้ามดาวน์โหลดโดยตรงค่ะ' },
        403
      );
    }
  }

  // 3. หากเป็นไฟล์ SVG ตัวอย่างเริ่มต้น (seed/*.svg) ให้เสิร์ฟพร้อม Cache-Control
  const seedSvg = getSeedSvg(key);
  if (seedSvg) {
    await c.env.BUCKET.put(key, seedSvg, {
      httpMetadata: { contentType: 'image/svg+xml; charset=utf-8' },
    });

    return new Response(seedSvg, {
      headers: {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
        'access-control-allow-origin': '*',
        'x-content-type-options': 'nosniff',
      },
    });
  }

  // 4. ค้นหาไฟล์ที่แอดมินอัปโหลดไว้จาก Cloudflare R2 Bucket
  const object = await c.env.BUCKET.get(key);
  if (object) {
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    if (!headers.get('content-type')) {
      headers.set('content-type', guessContentType(key));
    }
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800');
    headers.set('access-control-allow-origin', '*');
    headers.set('x-content-type-options', 'nosniff');

    return new Response(object.body, { headers });
  }

  // 5. หากเป็นไฟล์ฟอนต์ตัวอย่างเริ่มต้น ให้ดึงไฟล์ฟอนต์ภาษาไทยมาเก็บใน R2 อัตโนมัติแล้วเสิร์ฟเฉพาะ Preview
  const seedFontUrl = getSeedFontSourceUrl(key);
  if (seedFontUrl) {
    try {
      const res = await fetch(seedFontUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = 'font/ttf';
        await c.env.BUCKET.put(key, buffer, {
          httpMetadata: { contentType },
        });
        return new Response(buffer, {
          headers: {
            'content-type': contentType,
            'cache-control': 'public, max-age=31536000, immutable',
            'access-control-allow-origin': '*',
            'x-content-type-options': 'nosniff',
          },
        });
      }
    } catch {
      // กรณีออฟไลน์ไม่เชื่อมต่ออินเทอร์เน็ตภายนอก
    }
  }

  return c.json({ error: 'ไม่พบไฟล์ในระบบ R2' }, 404);
});
