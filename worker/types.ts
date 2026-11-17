/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;

  // Environment mode ('development' | 'production' | 'test')
  ENVIRONMENT?: string;

  // Secrets (ตั้งค่าผ่าน wrangler secret put หรือ .dev.vars สำหรับรันในเครื่อง)
  JWT_SECRET?: string;
  ADMIN_INITIAL_USERNAME?: string;
  ADMIN_INITIAL_PASSWORD?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_ADMIN_USER_ID?: string;
  SLIPOK_API_KEY?: string;
  SLIPOK_BRANCH_ID?: string;
}

export interface AdminTokenPayload {
  sub: number;
  username: string;
  iat: number;
  exp: number;
}

export type AppVariables = {
  admin?: AdminTokenPayload;
};
