export interface Category {
  id: number;
  slug: string;
  name: string;
  type: 'service' | 'font';
  description: string;
  sort_order: number;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  category_type?: 'service' | 'font';
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  details: string;
  price: number;
  price_label: string;
  image_url: string;
  gallery_json: string;
  badge: string;
  is_featured: number;
  is_active: number;
  created_at: string;
}

export type ProductItem = Product;

export interface FontItem {
  id: number;
  product_id: number | null;
  name: string;
  family_name: string;
  file_url: string;
  format: 'woff2' | 'truetype' | 'opentype';
  sample_text: string;
  description: string;
  price: number;
  discount_type?: 'none' | 'fixed' | 'percent';
  discount_value?: number;
  promo_start_at?: string | null;
  promo_end_at?: string | null;
  style_tags: string;
  is_active: number;
  created_at: string;
}

export interface ReviewItem {
  id: number;
  reviewer_name: string;
  service_name: string;
  rating: number;
  comment: string;
  is_visible?: number;
  created_at: string;
}

export interface ReviewStats {
  total_count: number;
  average_rating: number;
  distribution: Record<number, number>;
}

export interface OrderCartItem {
  product_id: number | null;
  product_title: string;
  category_type: 'service' | 'font';
  quantity: number;
  unit_price: number;
  item_note: string;
  image_url?: string;
}

export interface OrderRecord {
  id: number;
  order_code: string;
  customer_name: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  custom_brief: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  summary_text: string;
  line_notified: number;
  customer_id?: number | null;
  member_code?: string | null;
  member_display_name?: string | null;
  points_awarded?: number;
  points_awarded_at?: string | null;
  estimated_points?: number;
  slip_url?: string | null;
  drive_link?: string | null;
  channel?: 'web' | 'line_bill';
  discount_amount?: number;
  due_date?: string | null;
  payment_status?: 'pending' | 'paid' | 'verified';
  slip_trans_ref?: string | null;
  slip_verified?: number; // 0 = unverified, 1 = verified, -1 = failed
  slip_verified_at?: string | null;
  slip_verify_note?: string;
  created_at: string;
  items?: OrderCartItem[];
}

export interface SlipConfig {
  slip_verify_enabled: string;
  slip_verify_provider: string;
  slip_verify_api_key: string;
  slip_verify_branch_id: string;
  slip_verify_auto_confirm: string;
  slip_verify_check_receiver: boolean;
  has_env_api_key: boolean;
  has_env_branch_id: boolean;
}

export interface LoyaltyRules {
  loyalty_enabled: boolean;
  baht_per_point: number;
  points_expiry_months: number;
  review_bonus_points: number;
  contact_line: string;
}

export interface RewardItem {
  id: number;
  name: string;
  description: string;
  cost_points: number;
  stock: number | null;
  is_active: number;
  sort_order: number;
  created_at?: string;
}

export interface MemberProfile {
  id: number;
  member_code: string;
  display_name: string;
  contact: string;
  points_balance: number;
  lifetime_points: number;
  failed_attempts?: number;
  locked_until?: string | null;
  created_at: string;
  consent_at?: string;
}

export interface PointsLedgerItem {
  id: number;
  customer_id?: number;
  type: 'earn' | 'redeem' | 'adjust' | 'expire' | 'bonus';
  points: number;
  order_id: number | null;
  reward_id: number | null;
  note: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

export interface RedemptionItem {
  id: number;
  customer_id?: number;
  member_code?: string;
  member_display_name?: string;
  member_contact?: string;
  display_name?: string;
  contact?: string;
  reward_id: number;
  reward_name?: string;
  points_spent: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  created_at: string;
  fulfilled_at: string | null;
  note: string;
}

export interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  image_url: string;
  description: string;
}

export type SiteSettingsMap = Record<string, string>;

declare global {
  interface Response {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json<T = any>(): Promise<T>;
  }
}

