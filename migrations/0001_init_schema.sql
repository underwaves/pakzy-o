-- ============================================================================
-- Migration 0001: โครงสร้างฐานข้อมูลหลักสำหรับร้าน pakzy.o (Cloudflare D1 / SQLite)
-- ตารางประกอบด้วย: categories, products, fonts, orders, order_items, reviews, site_settings, admins, rate_limits
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. ตารางหมวดหมู่สินค้าและบริการ (categories)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'service', -- 'service' (บริการออกแบบ) หรือ 'font' (ฟอนต์)
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. ตารางสินค้าและบริการ (products)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '', -- รายละเอียดเพิ่มเติม เช่น สิ่งที่จะได้รับ ระยะเวลาทำงาน (คั่นบรรทัดหรือข้อความ)
  price REAL NOT NULL DEFAULT 0,
  price_label TEXT NOT NULL DEFAULT 'เริ่มต้น', -- เช่น 'เริ่มต้น', 'ราคาเดียว', 'เซ็ตละ'
  image_url TEXT NOT NULL DEFAULT '',
  gallery_json TEXT NOT NULL DEFAULT '[]', -- JSON array ของ URL รูปภาพเพิ่มเติม
  badge TEXT NOT NULL DEFAULT '', -- เช่น 'ขายดี', 'แนะนำ', 'ใหม่'
  is_featured INTEGER NOT NULL DEFAULT 0, -- 1 = แสดงหน้าแรก, 0 = ทั่วไป
  is_active INTEGER NOT NULL DEFAULT 1, -- 1 = เปิดแสดงผล, 0 = ซ่อน
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- 3. ตารางฟอนต์สำหรับหน้าทดลองพิมพ์และจัดการฟอนต์ (fonts)
CREATE TABLE IF NOT EXISTS fonts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER, -- เชื่อมกับตาราง products (ถ้ามี) เพื่อให้กดสั่งซื้อฟอนต์ได้โดยตรง
  name TEXT NOT NULL, -- ชื่อฟอนต์แสดงผล เช่น 'PKZ Baitoey (ใบเตย)'
  family_name TEXT NOT NULL UNIQUE, -- ชื่อ font-family สำหรับ CSS @font-face เช่น 'PKZBaitoey'
  file_url TEXT NOT NULL, -- URL ไฟล์ฟอนต์ใน R2 เช่น '/r2/fonts/pkz-baitoey.woff2'
  format TEXT NOT NULL DEFAULT 'woff2', -- 'woff2' | 'truetype' | 'opentype'
  sample_text TEXT NOT NULL DEFAULT 'ฝากร้านหน่อยนะคะ ขอบคุณทุกออเดอร์เลยน้า ♡ 1234567890',
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 159,
  style_tags TEXT NOT NULL DEFAULT 'น่ารัก,อ่านง่าย,จดโน้ต',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 4. ตารางคำสั่งซื้อหลัก (orders)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT NOT NULL UNIQUE, -- รหัสคำสั่งซื้อ เช่น PKZ-261115-001
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL, -- LINE ID / IG หรือช่องทางหลัก
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  custom_brief TEXT NOT NULL DEFAULT '', -- รายละเอียดบรีฟงานเพิ่มเติมจากลูกค้า
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  summary_text TEXT NOT NULL DEFAULT '', -- ข้อความสรุปสำหรับส่งเข้า LINE
  line_notified INTEGER NOT NULL DEFAULT 0, -- 1 = ส่งผ่าน LINE Messaging API แล้ว
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. ตารางรายการย่อยในคำสั่งซื้อ (order_items)
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  product_title TEXT NOT NULL,
  category_type TEXT NOT NULL DEFAULT 'service',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  item_note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 6. ตารางรีวิวและให้คะแนน (reviews)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reviewer_name TEXT NOT NULL,
  service_name TEXT NOT NULL DEFAULT 'บริการออกแบบ / ฟอนต์',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1, -- 1 = แสดงหน้าเว็บ, 0 = ซ่อนโดยแอดมิน
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. ตารางตั้งค่าเว็บไซต์ (site_settings)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. ตารางผู้ดูแลระบบ (admins)
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- PBKDF2 hash (hex)
  salt TEXT NOT NULL, -- Random salt (hex)
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. ตารางควบคุมความถี่ (rate_limits) สำหรับกัน Spam รีวิว และ Brute-force Login
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL -- Unix timestamp (วินาที)
);

-- สร้าง Indexes เพื่อเพิ่มความเร็วในการค้นหา
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_fonts_active ON fonts(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible, created_at DESC);
