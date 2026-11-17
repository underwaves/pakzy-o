import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  Category,
  Product,
  FontItem,
  ReviewItem,
  ReviewStats,
  OrderCartItem,
  SiteSettingsMap,
} from '../types';
import { CuteHeart } from '../components/ui/Decorations';

interface FlyingToken {
  id: string;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  active: boolean;
}

interface SiteContextValue {
  settings: SiteSettingsMap;
  categories: Category[];
  products: Product[];
  fonts: FontItem[];
  reviews: ReviewItem[];
  reviewStats: ReviewStats;
  loading: boolean;
  error: string | null;
  refreshSiteData: () => Promise<void>;
  cartItems: OrderCartItem[];
  addToOrderCart: (item: OrderCartItem, clickEvent?: { clientX: number; clientY: number }) => void;
  updateOrderCartItem: (index: number, patch: Partial<OrderCartItem>) => void;
  removeFromOrderCart: (index: number) => void;
  clearOrderCart: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DEFAULT_SETTINGS: SiteSettingsMap = {
  site_name: 'pakzy.o',
  site_tagline: 'สตูดิโอออกแบบงานกราฟิกมินิมอล & ฟอนต์ลายมือสุดคิวท์',
  logo_url: '/r2/seed/logo-pakzy.svg',
  hero_badge: '✿ Graphic Design & Cute Thai Fonts ✿',
  hero_title: 'เติมความละมุนให้แบรนด์คุณ ด้วยงานดีไซน์และฟอนต์จาก pakzy.o',
  hero_subtitle:
    'รับออกแบบป้ายแม่ค้าออนไลน์ Rich Menu แต่งรูปสินค้า ลายน้ำ และจำหน่ายฟอนต์ลายมือไทยอ่านง่าย สไตล์มินิมอลโทนอบอุ่น ใส่ใจทุกรายละเอียด',
  about_text:
    'เราคือสตูดิโอออกแบบกราฟิกขนาดกะทัดรัดที่หลงใหลในความเรียบง่ายแต่น่ารัก ทุกชิ้นงานออกแบบโดยเน้นความโปร่งสบายตา อ่านง่าย และช่วยสร้างภาพจำที่อบอุ่นให้กับร้านค้าของคุณ',
  queue_status_text: 'คิวว่างพร้อมรับงาน ✿ ส่งงานไว 1-3 วัน',
  queue_status_state: 'open',
  contact_ig: 'pakzy.o',
  contact_line: '@280npxvj',
  contact_facebook: '',
  contact_tiktok: '',
  contact_email: '',
  contact_phone: '',
  theme_primary: '#ec7a9a',
  theme_primary_light: '#fceef2',
  theme_secondary: '#4a3228',
  theme_bg: '#fffaf8',
  theme_font: 'Prompt',
  enable_line_messaging_api: 'false',
  loyalty_enabled: 'true',
  baht_per_point: '10',
  points_expiry_months: '0',
  review_bonus_points: '0',
};

const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettingsMap>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    total_count: 0,
    average_rating: 5,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [flyingTokens, setFlyingTokens] = useState<FlyingToken[]>([]);

  // Dark Mode โทนน้ำตาลเข้ม จำค่าไว้ใน localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pakzy_dark_mode') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('pakzy_dark_mode', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const [cartItems, setCartItems] = useState<OrderCartItem[]>(() => {
    try {
      const saved = localStorage.getItem('pakzy_order_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pakzy_order_cart', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  // โหลด @font-face ของร้านทุกฟอนต์ไว้ส่วนกลาง เพื่อให้ทั้ง Hero หน้าแรกและหน้าทดลองฟอนต์เรียกใช้ได้ทันที
  useEffect(() => {
    if (fonts.length === 0) return;
    const styleId = 'pakzy-r2-dynamic-fontfaces';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = fonts
      .map(
        (f) => `
      @font-face {
        font-family: '${f.family_name}';
        src: url('${f.file_url}');
        font-display: swap;
      }
    `
      )
      .join('\n');
  }, [fonts]);

  // อัปเดต CSS Variables สำหรับธีมสีและฟอนต์หลัก (เฉพาะโหมดสว่าง ส่วนโหมดมืดใช้โทนน้ำตาลเข้ม)
  useEffect(() => {
    const root = document.documentElement;
    if (!isDarkMode) {
      if (settings.theme_primary) {
        root.style.setProperty('--color-primary', settings.theme_primary);
        root.style.setProperty('--color-primary-hover', settings.theme_primary);
      }
      if (settings.theme_primary_light) {
        root.style.setProperty('--color-primary-light', settings.theme_primary_light);
      }
      if (settings.theme_secondary) {
        root.style.setProperty('--color-secondary', settings.theme_secondary);
      }
      if (settings.theme_bg) {
        root.style.setProperty('--color-bg', settings.theme_bg);
      }
    } else {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-light');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-bg');
    }

    if (settings.theme_font) {
      root.style.setProperty('--font-main', `'${settings.theme_font}', 'Prompt', sans-serif`);
    }
    if (settings.site_name) {
      document.title = `${settings.site_name} | ${
        settings.site_tagline || 'รับออกแบบกราฟิกและฟอนต์ลายมือน่ารัก'
      }`;
    }
  }, [settings, isDarkMode]);

  const refreshSiteData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลเว็บไซต์ได้ในขณะนี้');
      }
      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...(data.settings || {}) }));
      setCategories(data.categories || []);
      setProducts(data.products || []);
      setFonts(data.fonts || []);
      setReviews(data.reviews || []);
      if (data.reviewStats) {
        setReviewStats(data.reviewStats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSiteData();
  }, [refreshSiteData]);

  const triggerFlyToCart = useCallback((startX: number, startY: number) => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const cartBtn = document.getElementById('pkz-navbar-cart-btn');
    const rect = cartBtn?.getBoundingClientRect();
    const targetX = rect ? rect.left + rect.width / 2 : window.innerWidth - 80;
    const targetY = rect ? rect.top + rect.height / 2 : 32;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const token: FlyingToken = {
      id,
      startX,
      startY,
      deltaX: targetX - startX,
      deltaY: targetY - startY,
      active: false,
    };

    setFlyingTokens((prev) => [...prev, token]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyingTokens((prev) =>
          prev.map((t) => (t.id === id ? { ...t, active: true } : t))
        );
      });
    });

    setTimeout(() => {
      setFlyingTokens((prev) => prev.filter((t) => t.id !== id));
    }, 680);
  }, []);

  const addToOrderCart = useCallback(
    (newItem: OrderCartItem, clickEvent?: { clientX: number; clientY: number }) => {
      if (clickEvent && clickEvent.clientX && clickEvent.clientY) {
        triggerFlyToCart(clickEvent.clientX, clickEvent.clientY);
      }
      setCartItems((prev) => {
        const existingIndex = prev.findIndex(
          (i) =>
            (newItem.product_id && i.product_id === newItem.product_id) ||
            i.product_title === newItem.product_title
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + newItem.quantity,
          };
          return updated;
        }
        return [...prev, newItem];
      });
    },
    [triggerFlyToCart]
  );

  const updateOrderCartItem = useCallback(
    (index: number, patch: Partial<OrderCartItem>) => {
      setCartItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
      );
    },
    []
  );

  const removeFromOrderCart = useCallback((index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const clearOrderCart = useCallback(() => {
    setCartItems([]);
  }, []);

  return (
    <SiteContext.Provider
      value={{
        settings,
        categories,
        products,
        fonts,
        reviews,
        reviewStats,
        loading,
        error,
        refreshSiteData,
        cartItems,
        addToOrderCart,
        updateOrderCartItem,
        removeFromOrderCart,
        clearOrderCart,
        isDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
      {/* ไอคอนหัวใจบินเข้าตะกร้าสั่งซื้อ (ใช้เฉพาะ transform และ opacity) */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
        {flyingTokens.map((t) => (
          <div
            key={t.id}
            style={{
              left: `${t.startX - 16}px`,
              top: `${t.startY - 16}px`,
              transform: t.active
                ? `translate3d(${t.deltaX}px, ${t.deltaY}px, 0) scale(0.35)`
                : 'translate3d(0, 0, 0) scale(1.15)',
              opacity: t.active ? 0.15 : 1,
              transition:
                'transform 0.62s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.62s ease-in',
            }}
            className="fixed w-8 h-8 rounded-full bg-[var(--color-primary-light)] border-2 border-[#4a3228] flex items-center justify-center shadow-md"
          >
            <CuteHeart className="w-4 h-4" />
          </div>
        ))}
      </div>
    </SiteContext.Provider>
  );
};

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error('useSite must be used within SiteProvider');
  }
  return ctx;
}
