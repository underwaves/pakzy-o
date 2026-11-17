-- ============================================================================
-- Migration 0007: เพิ่มคอลัมน์ tracking_token_hash สำหรับระบบติดตามออเดอร์แบบปลอดภัย
-- ป้องกันการไล่เดารหัสคำสั่งซื้อ (Order Code Enumeration Attack) และรักษาความเป็นส่วนตัว
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. เพิ่มคอลัมน์ tracking_token_hash ในตาราง orders เพื่อเก็บ SHA-256 hash ของ token (ไม่เก็บ token จริง)
-- ออเดอร์เดิมก่อนหน้านี้จะมีค่าเป็น NULL เพื่อความปลอดภัย ออเดอร์เก่าจะไม่อนุญาตให้เข้าถึงผ่าน Public API
-- หากไม่มี token ลับที่ถูกต้อง โดยแอดมินยังคงสามารถดูและจัดการออเดอร์ทั้งหมดได้ตามปกติผ่านระบบหลังบ้าน (/admin)
ALTER TABLE orders ADD COLUMN tracking_token_hash TEXT DEFAULT NULL;

-- 2. สร้าง Index สำหรับการค้นหาด้วย tracking_token_hash ร่วมกับ order_code อย่างรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token_hash ON orders(tracking_token_hash);
