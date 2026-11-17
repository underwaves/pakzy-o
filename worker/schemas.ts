import { z } from 'zod';

// Schema สำหรับสร้างคำสั่งซื้อจากหน้าบ้าน (POST /api/orders)
// เซิร์ฟเวอร์จะใช้ product_id และ quantity ในการดึงราคาจริงและคำนวณยอดเงินฝั่ง Server เสมอ
export const orderItemInputSchema = z.object({
  product_id: z.number().int().positive({ message: 'กรุณาระบุรหัสสินค้าหรือฟอนต์ที่ถูกต้อง' }),
  quantity: z.number().int().min(1, 'จำนวนต้องไม่น้อยกว่า 1').max(99, 'จำนวนต้องไม่เกิน 99'),
  item_note: z.string().trim().max(500).optional().default(''),
  // ยอมรับฟิลด์เพิ่มเติมจาก frontend เพื่อความเข้ากันได้ แต่เซิร์ฟเวอร์จะไม่นำมาคำนวณราคาเด็ดขาด
  product_title: z.string().trim().optional(),
  category_type: z.enum(['service', 'font']).optional(),
  unit_price: z.number().optional(),
});

export const orderCreateSchema = z.object({
  customer_name: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุล หรือชื่อเล่นของคุณ').max(120),
  customer_contact: z.string().trim().min(2, 'กรุณากรอกช่องทางติดต่อหลัก เช่น LINE ID หรือ IG').max(150),
  customer_phone: z.string().trim().max(40).optional().default(''),
  customer_email: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกอีเมลสำหรับรับลิงก์ไฟล์ฟอนต์')
    .email('รูปแบบอีเมลไม่ถูกต้อง กรุณากรอก เช่น yourname@gmail.com')
    .max(120),
  custom_brief: z.string().trim().max(2000).optional().default(''),
  member_code: z.string().trim().max(24).optional().default(''),
  slip_url: z.string().trim().max(1000).optional().default(''),
  payment_status: z.enum(['pending', 'paid', 'verified']).optional().default('pending'),
  items: z.array(orderItemInputSchema).min(1, 'กรุณาเลือกฟอนต์อย่างน้อย 1 รายการ'),
});

// Schema สำหรับสร้างบิลส่ง LINE จากหลังบ้าน (POST /api/admin/bills)
export const adminBillItemSchema = z.object({
  product_id: z.number().int().positive().nullable().optional(),
  product_title: z.string().trim().min(1, 'กรุณาระบุชื่อสินค้าหรือบริการ').max(200),
  category_type: z.enum(['service', 'font']).optional().default('service'),
  quantity: z.number().int().min(1, 'จำนวนต้องไม่น้อยกว่า 1').max(99).default(1),
  unit_price: z.number().min(0, 'ราคาต้องไม่ติดลบ'),
  item_note: z.string().trim().max(500).optional().default(''),
});

export const adminBillCreateSchema = z.object({
  customer_name: z.string().trim().min(1, 'กรุณากรอกชื่อลูกค้า').max(120),
  customer_contact: z.string().trim().max(150).optional().default('LINE'),
  customer_phone: z.string().trim().max(40).optional().default(''),
  customer_email: z.string().trim().max(120).optional().default(''),
  custom_brief: z.string().trim().max(2000).optional().default(''),
  items: z.array(adminBillItemSchema).min(1, 'กรุณาระบุรายการอย่างน้อย 1 รายการ'),
  discount_amount: z.number().min(0, 'ส่วนลดต้องไม่ติดลบ').optional().default(0),
  due_date: z.string().trim().max(100).optional().default(''),
  member_code: z.string().trim().max(24).optional().default(''),
  summary_text: z.string().trim().max(4000).optional().default(''),
});

// Schema สำหรับแนบลิงก์ Google Drive ในออเดอร์ (PATCH /api/admin/orders/:id/drive-link)
export const adminOrderDriveLinkSchema = z.object({
  drive_link: z.string().trim().max(1000).optional().default(''),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
});

// Schema สำหรับสลับการแสดงผลสินค้าบนเว็บ (PATCH /api/admin/products/:id/toggle-visibility)
export const adminProductVisibilitySchema = z.object({
  is_active: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)),
});

// Schema สำหรับส่งรีวิวจากหน้าบ้าน (POST /api/reviews)
export const reviewCreateSchema = z.object({
  reviewer_name: z.string().trim().min(2, 'กรุณาระบุชื่อหรือชื่อเล่นของคุณ').max(80, 'ชื่อยาวเกินไป'),
  service_name: z.string().trim().min(1, 'กรุณาระบุบริการหรือฟอนต์ที่สั่งซื้อ').max(120).optional().default('บริการออกแบบ / ฟอนต์'),
  rating: z.number().int().min(1, 'กรุณาให้คะแนนตั้งแต่ 1 ถึง 5 ดาว').max(5, 'คะแนนสูงสุดคือ 5 ดาว'),
  comment: z.string().trim().min(5, 'กรุณาเขียนรีวิวอย่างน้อย 5 ตัวอักษร').max(1000, 'ข้อความรีวิวยาวเกินไป (สูงสุด 1,000 ตัวอักษร)'),
  member_code: z.string().trim().max(24).optional().default(''),
  order_code: z.string().trim().max(40).optional().default(''),
});

// Schema สำหรับแอดมินล็อกอิน (POST /api/admin/login)
export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ใช้').max(80),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(200),
});

// Schema สำหรับเพิ่ม/แก้ไขสินค้าโดยแอดมิน
export const adminProductSchema = z.object({
  category_id: z.number().int().positive('กรุณาเลือกหมวดหมู่'),
  title: z.string().trim().min(2, 'กรุณาระบุชื่อสินค้า/บริการ').max(200),
  slug: z.string().trim().max(200).optional(),
  subtitle: z.string().trim().max(300).optional().default(''),
  description: z.string().trim().max(2000).optional().default(''),
  details: z.string().trim().max(4000).optional().default(''),
  price: z.number().min(0, 'ราคาต้องไม่ติดลบ'),
  price_label: z.string().trim().max(50).optional().default('เริ่มต้น'),
  image_url: z.string().trim().min(1, 'กรุณาอัปโหลดรูปหรือระบุ URL รูปภาพ'),
  gallery_json: z.string().optional().default('[]'),
  badge: z.string().trim().max(50).optional().default(''),
  is_featured: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)),
  is_active: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)),
});

// Schema สำหรับเพิ่ม/แก้ไขฟอนต์โดยแอดมิน
export const adminFontSchema = z.object({
  product_id: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(2, 'กรุณาระบุชื่อฟอนต์').max(150),
  family_name: z.string().trim().min(2, 'กรุณาระบุชื่อ Font Family สำหรับ CSS').max(100),
  file_url: z.string().trim().min(1, 'กรุณาอัปโหลดไฟล์ฟอนต์ (.ttf, .otf, .woff2)'),
  format: z.enum(['woff2', 'truetype', 'opentype']).optional().default('woff2'),
  sample_text: z.string().trim().max(500).optional().default('ฝากร้านหน่อยนะคะ ขอบคุณทุกออเดอร์เลยน้า ♡ 1234567890'),
  description: z.string().trim().max(1000).optional().default(''),
  price: z.number().min(0).optional().default(159),
  discount_type: z.enum(['none', 'fixed', 'percent']).optional().default('none'),
  discount_value: z.number().min(0).optional().default(0),
  promo_start_at: z.string().trim().nullable().optional(),
  promo_end_at: z.string().trim().nullable().optional(),
  style_tags: z.string().trim().max(200).optional().default('น่ารัก,อ่านง่าย'),
  is_active: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)),
});

// Schema สำหรับเปลี่ยนสถานะคำสั่งซื้อ
export const adminOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
});

// Schema สำหรับเปลี่ยนรหัสผ่านแอดมิน
export const adminPasswordChangeSchema = z.object({
  current_password: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
  new_password: z.string().min(6, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร').max(128),
});

// Schema สำหรับเปิด/ปิดการแสดงผลรีวิวโดยแอดมิน
export const adminReviewVisibilitySchema = z.object({
  is_visible: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)),
});

// Schema สำหรับบันทึกการตั้งค่าเว็บไซต์โดยแอดมิน
export const adminSettingsUpdateSchema = z.object({
  settings: z.record(z.string().max(100), z.union([z.string().max(50000), z.number(), z.boolean()])),
});

// Schema สำหรับบันทึกและทดสอบ LINE Messaging API โดยแอดมิน
export const adminLineTestSchema = z.object({
  line_channel_access_token: z.string().trim().max(500).optional().default(''),
  line_admin_user_id: z.string().trim().max(120).optional().default(''),
});

// ============================================================================
// Schemas สำหรับระบบสะสมแต้ม (Loyalty Points System)
// ============================================================================

// สมัครรับรหัสสมาชิกใหม่ (POST /api/points/register)
export const pointsRegisterSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'กรุณากรอกชื่อเล่นอย่างน้อย 2 ตัวอักษรค่ะ')
    .max(80, 'ชื่อเล่นยาวเกินไป'),
  contact: z
    .string()
    .trim()
    .min(2, 'กรุณากรอกช่องทางติดต่อ เช่น LINE, IG หรือเบอร์โทรค่ะ')
    .max(150, 'ข้อมูลช่องทางติดต่อยาวเกินไป'),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'กรุณาตั้งรหัส PIN เป็นตัวเลข 4 ถึง 6 หลักค่ะ'),
  consent: z
    .boolean()
    .refine((v) => v === true, 'กรุณาติ๊กยินยอมให้ร้านเก็บข้อมูลเพื่อใช้สะสมแต้มค่ะ'),
});

// ตรวจสอบแต้มและประวัติด้วยรหัสสมาชิก + PIN (POST /api/points/lookup)
export const pointsLookupSchema = z.object({
  member_code: z
    .string()
    .trim()
    .min(4, 'กรุณากรอกรหัสสมาชิกและ PIN ให้ถูกต้องค่ะ')
    .max(24)
    .transform((v) => v.toUpperCase()),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'กรุณากรอกรหัสสมาชิกและ PIN ให้ถูกต้องค่ะ'),
});

// แลกของรางวัลด้วยแต้มสะสม (POST /api/points/redeem)
export const pointsRedeemSchema = z.object({
  member_code: z
    .string()
    .trim()
    .min(4, 'กรุณากรอกรหัสสมาชิกและ PIN ให้ถูกต้องค่ะ')
    .max(24)
    .transform((v) => v.toUpperCase()),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'กรุณากรอกรหัสสมาชิกและ PIN ให้ถูกต้องค่ะ'),
  reward_id: z.number().int().positive('กรุณาเลือกของรางวัลที่ต้องการแลกค่ะ'),
  note: z.string().trim().max(300).optional().default(''),
});

// แอดมินปรับแต้มด้วยมือ (+/-) พร้อมบังคับใส่เหตุผล (POST /api/admin/points/adjust)
export const adminPointsAdjustSchema = z.object({
  customer_id: z.number().int().positive('กรุณาเลือกสมาชิก'),
  points: z
    .number()
    .int('จำนวนแต้มต้องเป็นจำนวนเต็ม')
    .refine((v) => v !== 0 && v >= -100000 && v <= 100000, 'จำนวนแต้มต้องไม่เป็น 0'),
  note: z
    .string()
    .trim()
    .min(2, 'กรุณาระบุเหตุผลในการปรับแต้มอย่างน้อย 2 ตัวอักษรค่ะ')
    .max(500, 'เหตุผลยาวเกินไป'),
});

// แอดมินรีเซ็ต PIN ให้สมาชิก (POST /api/admin/members/:id/reset-pin)
export const adminResetPinSchema = z.object({
  new_pin: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'รหัส PIN ต้องเป็นตัวเลข 4 ถึง 6 หลัก')
    .optional(),
});

// แอดมินเพิ่ม/แก้ไขของรางวัล (POST/PUT /api/admin/rewards)
export const adminRewardSchema = z.object({
  name: z.string().trim().min(2, 'กรุณาระบุชื่อของรางวัล').max(150),
  description: z.string().trim().max(1000).optional().default(''),
  cost_points: z.number().int().min(1, 'แต้มที่ใช้แลกต้องตั้งแต่ 1 แต้มขึ้นไป').max(1000000),
  stock: z
    .union([z.number().int().min(0, 'จำนวนคงเหลือต้องไม่ติดลบ'), z.null()])
    .optional()
    .default(null),
  is_active: z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0)),
  sort_order: z.number().int().min(0).max(9999).optional().default(0),
});

// แอดมินเปลี่ยนสถานะการแลกของรางวัล (PATCH /api/admin/redemptions/:id)
export const adminRedemptionStatusSchema = z.object({
  status: z.enum(['pending', 'fulfilled', 'cancelled']),
  note: z.string().trim().max(500).optional(),
});

// แอดมินผูกคำสั่งซื้อกับรหัสสมาชิกย้อนหลัง (PATCH /api/admin/orders/:id/link-member)
export const adminOrderLinkMemberSchema = z.object({
  member_code: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกรหัสสมาชิก เช่น PZ-XXXX')
    .max(24)
    .transform((v) => v.toUpperCase()),
});

// แอดมินทดสอบการเชื่อมต่อ API ตรวจสอบสลิป (POST /api/admin/slip-test)
export const adminSlipTestSchema = z.object({
  slip_verify_provider: z.enum(['slipok', 'easyslip', 'mock']).default('slipok'),
  slip_verify_api_key: z.string().trim().max(500).optional().default(''),
  slip_verify_branch_id: z.string().trim().max(100).optional().default(''),
});

