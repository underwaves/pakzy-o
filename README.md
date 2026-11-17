# 🌸 qokhims — เว็บไซต์สตูดิโอออกแบบงานกราฟิกมินิมอล & จำหน่ายฟอนต์ลายมือ

ระบบเว็บไซต์หน้าร้านและหลังบ้านแบบครบวงจรสำหรับร้าน **qokhims** พัฒนาบนโครงสร้างพื้นฐานของ **Cloudflare 100%** (Cloudflare Workers + Hono + D1 SQLite + R2 Object Storage + Workers Static Assets + React + TypeScript + Tailwind CSS)

- **Production URL:** https://qokhims.wo-nad.workers.dev
- **Admin Portal:** https://qokhims.wo-nad.workers.dev/admin

---

## 1. โครงสร้างโปรเจกต์ (Project Structure)

```text
qokhims/
├── docs/                          # เอกสารส่งมอบสำหรับลูกค้าและเจ้าของร้าน
│   ├── คู่มือแอดมิน.md             # คู่มือการใช้งานระบบหลังบ้านทีละขั้นตอน (ภาษาง่าย)
│   ├── ข้อมูลที่ต้องส่งเพิ่ม.md     # เช็กลิสต์ข้อมูลจริงและรายการ Placeholder ที่รอเปลี่ยน
│   └── ขอบเขตงาน.md              # ขอบเขตงานที่ส่งมอบ ของแถม เงื่อนไขแก้ไข และข้อจำกัด
├── migrations/                    # ไฟล์ SQL Migrations สำหรับฐานข้อมูล Cloudflare D1
│   ├── 0001_init_schema.sql       # สร้างตารางหลักและ Indexes ทั้งหมด
│   ├── 0002_seed_data.sql         # ข้อมูลเริ่มต้น (หมวดหมู่, สินค้าตัวอย่าง, ฟอนต์, ตั้งค่าเว็บ)
│   ├── 0003_loyalty_points.sql    # ระบบสะสมแต้ม (customers, points_ledger, rewards, redemptions)
│   ├── 0004_customer_phone.sql    # เพิ่มเบอร์โทรติดต่อลูกค้าในคำสั่งซื้อ
│   ├── 0005_slip_verification.sql # เพิ่มฟิลด์การตรวจสลิปโอนเงินอัตโนมัติ (SlipOK)
│   ├── 0006_bill_system.sql       # เพิ่มระบบบิลและคำสั่งซื้อผ่าน LINE
│   └── 0007_order_tracking_tokens.sql # เพิ่ม tracking_token_hash ป้องกันการเดารหัสออเดอร์และรักษาความเป็นส่วนตัว
├── public/                        # ไฟล์ Static สาธารณะ
│   ├── favicon.svg                # ไอคอนเว็บไซต์รูปดอกไม้ประจำร้าน qokhims
│   ├── qokhims-profile.png        # รูปโปรไฟล์ร้านสำหรับแสดงผลและแชร์ลิงก์ (Open Graph)
│   ├── robots.txt                 # กำหนดสิทธิ์ Search Engine Crawler
│   └── sitemap.xml                # แผนผังเว็บไซต์สำหรับ SEO
├── scripts/
│   └── create-admin.mjs           # สคริปต์สร้าง/รีเซ็ตรหัสผ่านแอดมินคนแรก (PBKDF2 Hash)
├── src/                           # โค้ดฝั่ง Frontend (Vite + React + TypeScript + Tailwind CSS)
│   ├── components/
│   │   ├── layout/                # Navbar, Footer, AdminLayout
│   │   └── ui/                    # ProductCard, BeforeAfterSlider, Decorations, States
│   ├── context/                   # SiteContext (Bootstrap ข้อมูล + ธีมสี), ToastContext
│   ├── pages/                     # หน้าเว็บลูกค้า (HomePage, ProductsPage, FontTesterPage, FontQuizPage, OrderPage ฯลฯ)
│   │   └── admin/                 # หน้าจัดการระบบหลังบ้าน (Dashboard, Products, Fonts, Orders, Reviews, Settings)
│   ├── App.tsx                    # ระบบ Routing พร้อม Route-level Code Splitting (React.lazy)
│   ├── index.css                  # Design Tokens (CSS Variables), Keyframes, Reduced Motion
│   └── types.ts                   # TypeScript Interfaces
├── worker/                        # โค้ดฝั่ง Backend (Cloudflare Workers + Hono)
│   ├── middleware/
│   │   └── auth.ts                # ตรวจสอบสิทธิ์แอดมินผ่าน JWT ใน httpOnly Cookie
│   ├── routes/
│   │   ├── public.ts              # API สาธารณะ (/api/bootstrap, /api/products, /api/orders, /api/reviews)
│   │   ├── admin.ts               # API หลังบ้าน (/api/admin/* — บังคับผ่าน Auth + Zod Validation ทุกจุด)
│   │   └── files.ts               # เสิร์ฟไฟล์รูปและฟอนต์ Preview จาก R2 (/r2/*) พร้อมบล็อกการเข้าถึงไฟล์เต็ม
│   ├── utils/
│   │   ├── crypto.ts              # PBKDF2-SHA256 Password Hashing & HMAC-SHA256 JWT
│   │   ├── line.ts                # สร้างข้อความสรุปออเดอร์, ลิงก์ LINE OA (@280npxvj) และ Push Message API
│   │   ├── rateLimit.ts           # ระบบจำกัดความถี่ (Rate Limit) ป้องกัน Brute-force และ Spam
│   │   └── sampleAssets.ts        # SVG ตัวอย่างสำหรับ Seed เริ่มต้น
│   ├── index.ts                   # Entry point ของ Worker + Security Headers (CSP, nosniff, Referrer-Policy)
│   ├── schemas.ts                 # Zod Validation Schemas สำหรับตรวจสอบ Input ทุก Endpoint
│   └── types.ts                   # Type ของ Cloudflare Bindings (DB, BUCKET, ASSETS)
├── wrangler.jsonc                 # ไฟล์ตั้งค่า Cloudflare Workers, D1, R2 และ Static Assets
├── vite.config.ts                 # ตั้งค่า Vite Build และ Manual Chunks
└── package.json
```

---

## 2. การติดตั้งและรันทดสอบบนเครื่อง (Local Development)

### ข้อกำหนดเบื้องต้น
- **Node.js** เวอร์ชัน 20 ขึ้นไป
- บัญชี Cloudflare (สำหรับเชื่อมต่อ D1/R2 เมื่อต้องการ Deploy)

### ขั้นตอนการติดตั้ง
```bash
# 1. ติดตั้ง Dependencies ทั้งหมด
npm install

# 2. สร้างตารางและใส่ข้อมูลเริ่มต้น (Seed) ลงฐานข้อมูล D1 จำลองในเครื่อง (--local)
npm run db:migrate:local

# 3. สร้างบัญชีแอดมินคนแรกลงฐานข้อมูล Local (ระบบจะถามชื่อผู้ใช้และรหัสผ่านทางหน้าจอ)
npm run admin:create:local

# 4. สร้างไฟล์ .dev.vars สำหรับเก็บ JWT_SECRET ตอนรันในเครื่อง (ไฟล์นี้อยู่ใน .gitignore แล้ว)
echo "JWT_SECRET=replace-with-a-random-32-char-secret-key" > .dev.vars
```

### การรันเซิร์ฟเวอร์พัฒนา (Local)
```bash
# รันแบบรวมทั้ง Frontend + Worker ในพอร์ตเดียว (http://localhost:8787)
npm run preview

# หรือรันแยก 2 เทอร์มินัลเพื่อใช้งาน Hot Reload (HMR):
npm run dev:worker   # เทอร์มินัลที่ 1: รัน Cloudflare Worker ที่พอร์ต 8787
npm run dev          # เทอร์มินัลที่ 2: รัน Vite Dev Server ที่พอร์ต 5173
```

---

## 3. การสร้าง D1 Database และ R2 Bucket บน Production

หากต้องการสร้างทรัพยากรใหม่บนบัญชี Cloudflare ของลูกค้า:

```bash
# 1. ล็อกอินเข้าบัญชี Cloudflare
npx wrangler login

# 2. สร้างฐานข้อมูล Cloudflare D1
npx wrangler d1 create pakzy-o-db
# -> นำค่า database_id ที่ได้ไปใส่ในไฟล์ wrangler.jsonc ที่หัวข้อ d1_databases[0].database_id

# 3. สร้าง Cloudflare R2 Bucket สำหรับเก็บรูปภาพและไฟล์ฟอนต์
npx wrangler r2 bucket create pakzy-o-bucket
```

---

## 4. การรัน Migrations, Seed และการสร้างแอดมินบน Production

```bash
# 1. รันไฟล์ Migrations (0001_init_schema.sql และ 0002_seed_data.sql) บนฐานข้อมูลจริง (--remote)
npm run db:migrate:remote

# 2. สร้างบัญชีแอดมินคนแรกบนฐานข้อมูลจริง (รับรหัสผ่านผ่าน Interactive Prompt โดยไม่ฝังในโค้ด)
npm run admin:create:remote
```

---

## 5. การตั้งค่า Secrets บน Production (`wrangler secret`)

ข้อมูลลับทั้งหมดต้องตั้งผ่าน `wrangler secret` เท่านั้น (ห้ามใส่ใน `wrangler.jsonc`):

```bash
# 1. ตั้งค่าคีย์ลับสำหรับเซ็น JWT Cookie ของแอดมิน (จำเป็นอย่างยิ่ง)
# ต้องมีความยาวอย่างน้อย 32 ตัวอักษรขึ้นไป (แนะนำสุ่มด้วย openssl rand -hex 32)
npx wrangler secret put JWT_SECRET

# 2. (ทางเลือก) ตั้งค่า SlipOK API สำหรับระบบตรวจสลิปโอนเงินอัตโนมัติ
npx wrangler secret put SLIPOK_API_KEY
npx wrangler secret put SLIPOK_BRANCH_ID

# 3. (ทางเลือก) ตั้งค่า LINE Messaging API สำหรับส่ง Push แจ้งเตือนคำสั่งซื้อเข้าแชตแอดมินอัตโนมัติ
# หมายเหตุ: เจ้าของร้านสามารถกรอกหรือเปลี่ยนค่าเหล่านี้ได้เองจากหน้าเว็บที่เมนู /admin/settings เช่นกัน
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put LINE_ADMIN_USER_ID
```

---

## 6. มาตรการความปลอดภัยและสถาปัตยกรรมระบบ (Security Architecture)

### 6.1 ความปลอดภัยของ JWT แอดมิน (Admin JWT Security & Fail-Closed)
- **ระบบ Fail-Closed บน Production:** หากไม่มีการตั้งค่า `JWT_SECRET` หรือ Secret สั้นกว่า 32 ตัวอักษร ระบบจะปฏิเสธการล็อกอินและการเข้าถึง API แอดมินทันที (HTTP 500) โดยไม่เปิดเผย Secret หรือรายละเอียดระบบ พร้อมบันทึก Alert ลง Log
- **การจำกัด Dev Fallback:** คีย์สำรองสำหรับทดสอบในเครื่องจะได้รับอนุญาตเฉพาะเมื่อระบุ `ENVIRONMENT="development"` หรือ `ENVIRONMENT="test"` อย่างชัดเจนเท่านั้น และไม่สามารถถูกเรียกใช้บน Production ได้
- **การตรวจสอบ Signature & Algorithm:** ตรวจสอบเฉพาะอัลกอริทึม `HS256` และ `typ: 'JWT'` พร้อมตรวจเวลาออก Token (`iat`) และวันหมดอายุ (`exp`) อย่างเคร่งครัดเพื่อป้องกัน Alg-none Attack
- **การตั้งค่า Cookie:** ส่งผ่าน `httpOnly: true`, `secure: true` (บน HTTPS/Production), `sameSite: 'Lax'` และอายุ Cookie 12 ชั่วโมง

### 6.2 ความเป็นส่วนตัวและการรักษาความปลอดภัยของระบบติดตามออเดอร์ (Secure Order Tracking & Privacy)
- **CSPRNG Tracking Token:** ระบบสร้างรหัสลับสำหรับติดตามคำสั่งซื้อด้วยฟังก์ชันสุ่มที่มีความปลอดภัยสูงระดับวิทยาการเข้ารหัสลับ (32 ไบต์ / 256 บิต สุ่มแบบ Cryptographically Secure RNG) นำหน้าด้วย `trk_`
- **One-way Hash Storage:** ฐานข้อมูล D1 จัดเก็บเฉพาะค่า SHA-256 Hash ของ Tracking Token (`tracking_token_hash`) เท่านั้น ไม่มีการจัดเก็บ Raw Token ลงฐานข้อมูล
- **Single Token Return:** Raw Token จะถูกส่งกลับให้ลูกค้าเฉพาะตอนสั่งซื้อสำเร็จ (`POST /api/orders`) เท่านั้น โดยหน้าเว็บจะสร้างลิงก์ส่วนตัว `https://.../order?track=PKZ-...&token=trk_...` ให้ลูกค้าคัดลอกเก็บไว้
- **Uniform 404 Response:** กรณีไม่ระบุ Token, Token ไม่ถูกต้อง หรือเดารหัสออเดอร์ ระบบจะตอบกลับด้วยข้อความปฏิเสธเดียวกันทั้งหมด (`ไม่พบข้อมูลคำสั่งซื้อ หรือข้อมูลการเข้าถึงไม่ถูกต้องค่ะ` HTTP 404) เพื่อป้องกันการยืนยันรหัสคำสั่งซื้อ (Order Code Enumeration)
- **Strict Data Minimization:** API ติดตามคำสั่งซื้อจะไม่ส่งคืนข้อมูลส่วนบุคคล (PII) เช่น `customer_email`, `customer_phone`, `customer_contact`, `custom_brief`, `slip_url`, `slip_trans_ref` หรือ `summary_text`
- **Google Drive Protection:** ลิงก์ดาวน์โหลดไฟล์งานและฟอนต์ (`drive_link`) จะเปิดเผยเฉพาะเมื่อลูกค้าผ่านการตรวจสอบ Tracking Token สำเร็จเท่านั้น
- **Rate Limit:** จำกัดความถี่การตรวจสอบสถานะสูงสุด 15 ครั้งต่อ 5 นาทีต่อ IP เพื่อป้องกัน Brute-force
- **Legacy Orders Handling:** คำสั่งซื้อเดิมก่อนการรัน Migration 0007 จะมี `tracking_token_hash = NULL` ซึ่งจะไม่สามารถถูกเข้าถึงผ่าน API สาธารณะได้ (แอดมินยังคงเปิดดูและส่งมอบงานได้ตามปกติใน `/admin/orders`)

### 6.3 การคำนวณราคาฝั่งเซิร์ฟเวอร์แบบ Zero-Trust (Server-Side Price Calculation)
- **Zero-Trust Client Input:** เซิร์ฟเวอร์ไม่เชื่อถือ `unit_price`, `product_title`, `discount_amount` หรือ `totalAmount` ที่ส่งมาจาก Browser
- **D1 Source of Truth:** ดึงราคาจริง สถานะการจำหน่าย (`is_active = 1`) และกฎโปรโมชันจากฐานข้อมูล D1 ด้วย `product_id` และตรวจสอบจำนวนสินค้า (1–99 ชิ้น)
- **Promotion Validity:** คำนวณส่วนลดแบบ Fixed และ Percent ตามช่วงเวลาโปรโมชันจริง ณ วันที่สั่งซื้อ
- **Single Source for Verification & Points:** ยอดเงินสุทธิที่คำนวณจากเซิร์ฟเวอร์จะถูกนำไปใช้ตรวจสลิปโอนเงิน (SlipOK), บันทึกลงตารางคำสั่งซื้อ และคำนวณแต้มสะสมของลูกค้า

---

## 7. ชุดทดสอบอัตโนมัติ (Automated Test Suite)

โปรเจกต์นี้มีชุดทดสอบอัตโนมัติด้วย **Vitest** ครอบคลุมทั้งกรณีปกติ (Happy Path) และ Regression Tests สำหรับช่องโหว่ความปลอดภัย:

```bash
# รันชุดทดสอบทั้งหมด (Automated Regression Tests)
npm test

# รันชุดทดสอบแบบ Watch mode
npm run test:watch
```

### สรุปไฟล์ทดสอบ (42 Tests Passing)
1. `tests/auth.test.ts` (15 tests):
   - ทดสอบการ Fail-closed ของ `getJwtSecret` เมื่อ Secret ขาดหายหรือสั้นกว่า 32 ตัวอักษร
   - ทดสอบการจำกัด Dev Fallback เฉพาะ Dev/Test
   - ทดสอบการเซ็นและตรวจสอบ JWT, การตรวจจับ Token ปลอมแปลง, Token หมดอายุ และ Alg-none Attack
   - ทดสอบ `adminAuthMiddleware` สำหรับ HTTP 500, HTTP 401 และการผ่านเข้าถึงด้วย Cookie ที่ถูกต้อง
2. `tests/pricing.test.ts` (13 tests):
   - ทดสอบการคำนวณส่วนลดแบบ Fixed, Percent, โปรโมชันที่ยังไม่เริ่ม, โปรโมชันหมดอายุ
   - ทดสอบการเพิกเฉยต่อราคาปลอมหรือราคาติดลบจากเบราว์เซอร์
   - ทดสอบการปฏิเสธสินค้าที่ปิดจำหน่าย (`is_active = 0`) และสินค้าที่ไม่มีอยู่จริง
   - ทดสอบการตรวจสอบจำนวนสินค้า (Quantity Boundary)
3. `tests/tracking.test.ts` (12 tests):
   - ทดสอบเอนโทรปีของ CSPRNG Tracking Token และการสร้าง Hash แบบ Deterministic
   - ทดสอบการปฏิเสธ Uniform 404 เมื่อไม่มี Token, Token ผิด หรือสุ่มเดารหัสคำสั่งซื้อ
   - ทดสอบการจัดการคำสั่งซื้อเก่า (Legacy Orders)
   - ทดสอบ Data Minimization ไม่ให้ PII รั่วไหล
   - ทดสอบ Rate Limit ป้องกัน Brute-force
4. `tests/normal_flow.test.ts` (2 tests):
   - ทดสอบ End-to-End โฟลว์การสั่งซื้อของลูกค้า การคำนวณราคาจริง และการติดตามสถานะด้วย Token
   - ทดสอบ End-to-End โฟลว์การล็อกอินแอดมิน การรับ Cookie และการเข้าถึง API หลังบ้าน

---

## 8. การตรวจสอบโค้ดและ Deploy ขึ้น Production

> ⚠️ **คำเตือนสำคัญ:** ห้าม Deploy หรือแก้ไขฐานข้อมูล Production จนกว่าจะได้รับการอนุมัติและทดสอบความถูกต้องเรียบร้อยแล้ว

```bash
# 1. ตรวจสอบชุดทดสอบอัตโนมัติ
npm test

# 2. ตรวจสอบความถูกต้องของ TypeScript
npm run typecheck

# 3. ทดสอบการ Build และ Static Asset Manifest (Dry-run ไม่กระทบ Production)
npm run build
npx wrangler deploy --dry-run
```

---

## 7. การผูกโดเมนส่วนตัว (Custom Domain)

1. เข้าไปที่ [Cloudflare Dashboard](https://dash.cloudflare.com/) → เลือกเมนู **Workers & Pages**
2. คลิกที่โปรเจกต์ **`qokhims`** → ไปที่แท็บ **Settings** → หัวข้อ **Domains & Routes**
3. คลิกปุ่ม **+ Add** → เลือก **Custom Domain**
4. พิมพ์ชื่อโดเมนที่ต้องการ (เช่น `qokhims.com` หรือ `www.qokhims.com` ซึ่งอยู่ในบัญชี Cloudflare เดียวกัน) แล้วกด **Add domain**
5. ระบบ Cloudflare จะออกใบรับรอง SSL (HTTPS) และผูก DNS ให้อัตโนมัติภายใน 1–2 นาที

---

## 8. วิธีสำรองข้อมูลฐานข้อมูล D1 (Database Backup / Export)

แอดมินหรือผู้ดูแลระบบสามารถสำรองข้อมูลทั้งหมดในฐานข้อมูล D1 ออกมาเป็นไฟล์ `.sql` เก็บไว้ในเครื่องได้ด้วยคำสั่ง:

```bash
# สำรองข้อมูลทั้งหมด (ทั้งโครงสร้างตารางและข้อมูลคำสั่งซื้อ/สินค้า/รีวิว) จาก Production
npx wrangler d1 export pakzy-o-db --remote --output=backup-qokhims.sql

# สำรองเฉพาะข้อมูล (ไม่รวมคำสั่ง CREATE TABLE)
npx wrangler d1 export pakzy-o-db --remote --no-schema --output=backup-data-only.sql
```

---

## 9. สถาปัตยกรรมระบบสะสมแต้ม (Loyalty Points System)

ระบบสะสมแต้มของร้าน qokhims ถูกออกแบบให้ไม่กระทบกับโฟลว์การสั่งซื้อเดิม และยึดตามหลักความปลอดภัยและมาตรฐานข้อมูล:

- **No-login Membership:** ลูกค้าเปิดบัตรสะสมแต้มได้ฟรีที่หน้า `/points` โดยไม่ต้องใช้อีเมลหรือรหัสผ่านยาว ระบบจะสุ่มสร้างรหัสสมาชิกอ่านง่าย (เช่น `PZ-XXXX` ตัวอักษรไม่กำกวม `[2-9A-HJ-NP-Z]`) พร้อมตั้งรหัส PIN 4–6 หลัก ซึ่งถูก Hash ด้วย **PBKDF2-SHA256 (100,000 รอบ + 16-byte Salt)**
- **Idempotent Points Awarding:** แต้มจะถูกคำนวณและแจกเข้าบัญชีลูกค้า **เฉพาะเมื่อแอดมินเปลี่ยนสถานะคำสั่งซื้อเป็น "เสร็จสิ้น" (completed)** เท่านั้น (ไม่แจกตอนส่งบรีฟ) และป้องกันการแจกแต้มซ้ำซ้อนด้วยฟิลด์ `points_awarded_at`
- **Append-only Ledger:** ทุกความเคลื่อนไหวของแต้ม (+/-) จะถูกบันทึกลงตาราง `points_ledger` เสมอ (`earn`, `redeem`, `adjust`, `bonus`, `expire`) ยอดแต้ม `points_balance` ตรวจสอบย้อนหลังได้ 100%
- **Reversal & Refund:** หากแอดมินเปลี่ยนสถานะออเดอร์กลับจาก `completed` แต้มจะถูกหักคืนอัตโนมัติ และหากแอดมินยกเลิกคำขอแลกของรางวัล แต้มและสต็อกสินค้าจะถูกคืนให้ลูกค้าทันที
- **Scheduled Expiration:** มีระบบ Cloudflare Workers Cron Trigger (`0 0 * * *`) รันตรวจแต้มที่หมดอายุทุกเที่ยงคืนอัตโนมัติ (กรณีเปิดใช้งานวันหมดอายุแต้ม)
- **PDPA Privacy Compliance:** เก็บเฉพาะชื่อเล่นและช่องทางติดต่อเพื่อประสานงาน มีกล่องติ๊กยินยอมก่อนสมัคร และมีปุ่มลบข้อมูลสมาชิกถาวรตามสิทธิ์ของเจ้าของข้อมูล

