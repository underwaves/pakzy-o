-- Migration 0005: เพิ่มฟิลด์ส่วนลดและโปรโมชันฟอนต์ + อีเมลแจ้งเตือน
ALTER TABLE fonts ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'none'; -- 'none' | 'fixed' | 'percent'
ALTER TABLE fonts ADD COLUMN discount_value REAL NOT NULL DEFAULT 0;
ALTER TABLE fonts ADD COLUMN promo_start_at TEXT DEFAULT NULL;
ALTER TABLE fonts ADD COLUMN promo_end_at TEXT DEFAULT NULL;

INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('notification_email', '');
