-- ============================================================================
-- Migration 0004: เพิ่มฟิลด์รองรับระบบตะกร้า ชำระเงินผ่านเว็บ และระบบออกบิลส่งไลน์
-- สำหรับร้าน pakzy.o (Cloudflare D1 / SQLite)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. เพิ่มคอลัมน์ในตาราง orders เพื่อรองรับการชำระเงิน สลิป ลิงก์ Drive และบิลไลน์
ALTER TABLE orders ADD COLUMN slip_url TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN drive_link TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN channel TEXT NOT NULL DEFAULT 'web'; -- 'web' | 'line_bill'
ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN due_date TEXT DEFAULT NULL; -- วันรับ/ส่งงาน
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'; -- 'pending' | 'paid' | 'verified'

-- 2. สร้าง Indexes สำหรับค้นหาตาม channel และ payment_status
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- 3. เพิ่มค่าตั้งค่าเริ่มต้นใน site_settings
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('portfolio_drive_url', 'https://drive.google.com/drive/folders/placeholder-pakzy-portfolio'),
  ('promptpay_number', '0812345678'),
  ('bank_name', 'ธนาคารกสิกรไทย (KBANK)'),
  ('bank_account_number', '123-4-56789-0'),
  ('bank_account_name', 'น.ส. พักตร์ปรียา (pakzy.o)'),
  ('font_quiz_enabled', 'true');
