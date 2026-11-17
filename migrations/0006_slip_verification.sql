-- ============================================================================
-- Migration 0006: เพิ่มระบบตรวจสอบสลิปอัตโนมัติ (Slip Verification System)
-- รองรับการตรวจยอดเงิน, บัญชีผู้รับ, ป้องกันสลิปซ้ำ (Duplicate TransRef)
-- และการตั้งค่า Provider (SlipOK / EasySlip / Sandbox)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. เพิ่มคอลัมน์ในตาราง orders
ALTER TABLE orders ADD COLUMN slip_trans_ref TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN slip_verified INTEGER NOT NULL DEFAULT 0; -- 0: unverified/manual, 1: verified, -1: failed
ALTER TABLE orders ADD COLUMN slip_verified_at TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN slip_verify_note TEXT NOT NULL DEFAULT '';

-- 2. สร้างตาราง slip_verifications เพื่อบันทึกประวัติการตรวจสลิป และป้องกันการนำสลิปเดิมมาใช้ซ้ำ
CREATE TABLE IF NOT EXISTS slip_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  trans_ref TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  receiver_account TEXT NOT NULL DEFAULT '',
  sender_name TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'slipok',
  status TEXT NOT NULL DEFAULT 'verified', -- 'verified' | 'failed'
  raw_payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_slip_verifications_trans_ref ON slip_verifications(trans_ref);
CREATE INDEX IF NOT EXISTS idx_orders_slip_trans_ref ON orders(slip_trans_ref);
CREATE INDEX IF NOT EXISTS idx_orders_slip_verified ON orders(slip_verified);

-- 3. เพิ่มค่าตั้งค่าเริ่มต้นสำหรับระบบเช็คสลิปใน site_settings
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('slip_verify_enabled', 'false'),
  ('slip_verify_provider', 'slipok'),
  ('slip_verify_api_key', ''),
  ('slip_verify_branch_id', ''),
  ('slip_verify_auto_confirm', 'true'),
  ('slip_verify_check_receiver', 'true');
