import type { AdminTokenPayload } from '../types';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : '0' + hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * สร้าง Hash รหัสผ่านด้วย PBKDF2 (HMAC-SHA256) ผ่าน Web Crypto API
 */
export async function hashPasswordPBKDF2(
  password: string,
  existingSaltHex?: string
): Promise<{ hashHex: string; saltHex: string }> {
  const saltBytes = existingSaltHex
    ? hexToBytes(existingSaltHex)
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  return {
    hashHex: bytesToHex(new Uint8Array(derivedBits)),
    saltHex: bytesToHex(saltBytes),
  };
}

/**
 * ตรวจสอบรหัสผ่านกับ PBKDF2 Hash แบบ Constant-time เพื่อป้องกัน Timing Attack
 */
export async function verifyPasswordPBKDF2(
  password: string,
  expectedHashHex: string,
  saltHex: string
): Promise<boolean> {
  const { hashHex } = await hashPasswordPBKDF2(password, saltHex);
  if (hashHex.length !== expectedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hashHex.length; i++) {
    diff |= hashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * สร้าง JWT (HMAC-SHA256) สำหรับเก็บใน httpOnly Cookie ของแอดมิน
 */
export async function signJwt(
  payload: Omit<AdminTokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds = 60 * 60 * 12 // ค่าเริ่มต้น 12 ชั่วโมง
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AdminTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerSegment = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadSegment = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${headerSegment}.${payloadSegment}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/**
 * ตรวจสอบความถูกต้องและวันหมดอายุของ JWT
 */
export async function verifyJwt(
  token: string,
  secret: string
): Promise<AdminTokenPayload | null> {
  try {
    if (!token || !secret) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerSeg, payloadSeg, sigSeg] = parts;

    // ตรวจสอบ Header อย่างเข้มงวด (ป้องกัน alg 'none' attack หรือ alg ปลอม)
    const headerJson = new TextDecoder().decode(base64UrlDecode(headerSeg));
    const header = JSON.parse(headerJson);
    if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }

    const signingInput = `${headerSeg}.${payloadSeg}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = base64UrlDecode(sigSeg);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as BufferSource,
      new TextEncoder().encode(signingInput)
    );

    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadSeg));
    const payload = JSON.parse(payloadJson) as AdminTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    // ตรวจสอบวันหมดอายุ (exp) และเวลาออก token (iat)
    if (!payload.exp || typeof payload.exp !== 'number' || payload.exp < now) {
      return null;
    }
    if (!payload.iat || typeof payload.iat !== 'number' || payload.iat > now + 60) {
      return null;
    }

    // ตรวจสอบฟิลด์สำคัญใน payload
    if (!payload.sub || typeof payload.sub !== 'number' || !payload.username || typeof payload.username !== 'string') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * สุ่มสร้าง Tracking Token สำหรับติดตามออเดอร์ด้วย Cryptographically Secure RNG (CSPRNG)
 * ใช้ขนาด 32 ไบต์ (256 บิต) เข้ารหัสเป็น URL-safe Base64 มีค่า Entropy สูง คาดเดาไม่ได้
 */
export function generateTrackingToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return `trk_${base64UrlEncode(randomBytes)}`;
}

/**
 * แฮช Tracking Token ด้วย SHA-256 เพื่อเก็บลงฐานข้อมูล (ไม่เก็บ token ตัวจริง)
 */
export async function hashTrackingToken(token: string): Promise<string> {
  const cleanToken = token.trim();
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`qokhims-trk-token-salt:${cleanToken}`)
  );
  return bytesToHex(new Uint8Array(digest));
}

/**
 * แฮช IP Address ด้วย SHA-256 สำหรับทำ Rate Limit โดยไม่เก็บ IP จริงของลูกค้า
 */
export async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`qokhims-ip-salt:${ip}`)
  );
  return bytesToHex(new Uint8Array(digest)).slice(0, 24);
}
