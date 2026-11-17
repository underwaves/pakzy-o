-- ============================================================================
-- Migration 0003: ระบบสะสมแต้ม (Loyalty Points System) สำหรับร้าน pakzy.o
-- ประกอบด้วยตาราง: customers, points_ledger, rewards, redemptions
-- และอัปเดตตาราง orders + site_settings พร้อม Seed ของรางวัลเริ่มต้น 3 รายการ
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. ตารางสมาชิกสะสมแต้ม (customers)
-- เก็บเฉพาะข้อมูลเท่าที่จำเป็นตามแนวทาง PDPA (ชื่อเล่น + ช่องทางติดต่อ + PIN Hash)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_code TEXT NOT NULL UNIQUE, -- เช่น PZ-4K9M (ตัวอักษรไม่กำกวม ไม่ซ้ำ)
  display_name TEXT NOT NULL,
  contact TEXT NOT NULL, -- IG / LINE / เบอร์โทร ตามที่ลูกค้ากรอก
  pin_hash TEXT NOT NULL, -- PBKDF2-SHA256 hash (hex)
  pin_salt TEXT NOT NULL, -- Random salt (hex)
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  consent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. ตารางของรางวัลที่ใช้แต้มแลก (rewards)
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost_points INTEGER NOT NULL CHECK (cost_points > 0),
  stock INTEGER DEFAULT NULL CHECK (stock IS NULL OR stock >= 0), -- NULL = ไม่จำกัดจำนวน
  is_active INTEGER NOT NULL DEFAULT 1, -- 1 = แสดงหน้าเว็บ, 0 = ซ่อน
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. ตารางสมุดบัญชีแต้ม (points_ledger) แบบ Append-only (ห้ามแก้ไขหรือลบย้อนหลัง)
CREATE TABLE IF NOT EXISTS points_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust', 'expire', 'bonus')),
  points INTEGER NOT NULL CHECK (points != 0), -- ค่าบวก หรือ ค่าลบ
  order_id INTEGER DEFAULT NULL,
  reward_id INTEGER DEFAULT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system', -- 'system' หรือ 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT DEFAULT NULL, -- วันหมดอายุของแต้มก้อนนี้ (กรณี type = earn/bonus และเปิดตั้งค่าวันหมดอายุ)
  expired_processed INTEGER NOT NULL DEFAULT 0, -- 1 = ถูกตัดหมดอายุไปแล้วโดย Cron
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE SET NULL
);

-- 4. ตารางรายการแลกของรางวัล (redemptions)
CREATE TABLE IF NOT EXISTS redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  reward_id INTEGER NOT NULL,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  fulfilled_at TEXT DEFAULT NULL,
  note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE RESTRICT
);

-- 5. เพิ่มคอลัมน์สำหรับผูกสมาชิกและบันทึกแต้มในตาราง orders
ALTER TABLE orders ADD COLUMN customer_id INTEGER DEFAULT NULL REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN points_awarded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN points_awarded_at TEXT DEFAULT NULL;

-- 6. สร้าง Indexes เพื่อความรวดเร็วและความถูกต้องของข้อมูล
CREATE INDEX IF NOT EXISTS idx_customers_member_code ON customers(member_code);
CREATE INDEX IF NOT EXISTS idx_customers_contact ON customers(contact);
CREATE INDEX IF NOT EXISTS idx_points_ledger_customer ON points_ledger(customer_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_points_ledger_order ON points_ledger(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_order_bonus ON points_ledger(order_id) WHERE type = 'bonus' AND order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_points_ledger_expiry ON points_ledger(expires_at, expired_processed) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rewards_active_sort ON rewards(is_active, sort_order ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_redemptions_customer ON redemptions(customer_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status, id DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- 7. เพิ่มค่าตั้งค่าระบบสะสมแต้มเริ่มต้นใน site_settings
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('loyalty_enabled', 'true'),
  ('baht_per_point', '10'),
  ('points_expiry_months', '0'),
  ('review_bonus_points', '0');

-- 8. Seed ข้อมูลของรางวัลตัวอย่าง 3 รายการ
INSERT OR IGNORE INTO rewards (id, name, description, cost_points, stock, is_active, sort_order) VALUES
  (
    1,
    'ส่วนลด 20 บาท สำหรับสั่งป้ายหรือฟอนต์',
    'ใช้ลดราคาได้ทันทีทุกบริการออกแบบป้าย หรือซื้อฟอนต์ลายมือในร้าน pakzy.o ไม่มีขั้นต่ำค่ะ ♡',
    15,
    NULL,
    1,
    1
  ),
  (
    2,
    'แถมฟรี! วาดของตกแต่ง/มินิไอคอนเพิ่ม 1 ชิ้น',
    'เพิ่มดีเทลความคิวท์ให้ป้ายบัญชีหรือ Rich Menu ของคุณด้วยไอคอนวาดมือสุดพิเศษ 1 ชิ้นฟรี!',
    25,
    20,
    1,
    2
  ),
  (
    3,
    'ส่วนลดพิเศษ 50 บาท (ใช้ได้ทุกบริการและฟอนต์)',
    'คูปองส่วนลดสุดคุ้ม 50 บาท สำหรับลูกค้าประจำคนสำคัญ ใช้ลดได้ทั้งงานป้าย Rich Menu และฟอนต์ค่ะ ✿',
    40,
    10,
    1,
    3
  );
