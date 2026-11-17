import { hashIp } from './crypto';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * ตรวจสอบและนับจำนวนการเรียก API ตาม IP (เก็บในตาราง rate_limits ของ D1)
 */
export async function checkRateLimit(
  db: D1Database,
  actionPrefix: string,
  clientIp: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const ipHash = await hashIp(clientIp);
  const key = `${actionPrefix}:${ipHash}`;
  const now = Math.floor(Date.now() / 1000);

  const existing = await db
    .prepare('SELECT count, window_start FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ count: number; window_start: number }>();

  if (!existing || now - existing.window_start >= windowSeconds) {
    await db
      .prepare(
        `INSERT INTO rate_limits (key, count, window_start)
         VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`
      )
      .bind(key, now)
      .run();

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, windowSeconds - (now - existing.window_start));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  const nextCount = existing.count + 1;
  await db
    .prepare('UPDATE rate_limits SET count = ? WHERE key = ?')
    .bind(nextCount, key)
    .run();

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - nextCount),
    retryAfterSeconds: 0,
  };
}
