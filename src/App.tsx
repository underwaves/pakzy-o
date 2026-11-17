import React, { useEffect, Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
  Link,
  Navigate,
} from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { SiteProvider, useSite } from './context/SiteContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { LoadingState } from './components/ui/States';
import {
  CuteHeart,
  PakzyMascotSticker,
  CardCornerDoodle,
  InitialSplashLoader,
} from './components/ui/Decorations';

// แยกโค้ดตามหน้า (Route-level Code Splitting) เพื่อลดขนาด Bundle แรกเข้าและเพิ่มคะแนน Lighthouse Performance
const ProductsPage = lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const FontTesterPage = lazy(() =>
  import('./pages/FontTesterPage').then((m) => ({ default: m.FontTesterPage }))
);
const OrderPage = lazy(() =>
  import('./pages/OrderPage').then((m) => ({ default: m.OrderPage }))
);
const ReviewsPage = lazy(() =>
  import('./pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage }))
);
const PortfolioPage = lazy(() =>
  import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const PointsPage = lazy(() =>
  import('./pages/PointsPage').then((m) => ({ default: m.PointsPage }))
);

const AdminLayout = lazy(() =>
  import('./components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const AdminLoginPage = lazy(() =>
  import('./pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AdminMembersPage = lazy(() =>
  import('./pages/admin/AdminMembersPage').then((m) => ({ default: m.AdminMembersPage }))
);
const AdminProductsPage = lazy(() =>
  import('./pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage }))
);
const AdminFontsPage = lazy(() =>
  import('./pages/admin/AdminFontsPage').then((m) => ({ default: m.AdminFontsPage }))
);
const AdminOrdersPage = lazy(() =>
  import('./pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage }))
);
const AdminBillPage = lazy(() =>
  import('./pages/admin/AdminBillPage').then((m) => ({ default: m.AdminBillPage }))
);
const AdminReviewsPage = lazy(() =>
  import('./pages/admin/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
};

/**
 * ปุ่มแชต LINE ลอยมุมขวาล่าง (Floating LINE Button)
 */
const FloatingLineButton: React.FC = () => {
  const { settings } = useSite();
  const lineHandle = (settings.contact_line || '@280npxvj').trim();
  const lineUrlHandle = lineHandle.startsWith('@') ? lineHandle : `@${lineHandle}`;

  return (
    <a
      href={`https://line.me/R/ti/p/${lineUrlHandle}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`แชตคุยกับร้านทาง LINE ${lineHandle}`}
      className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 pl-3.5 pr-4 py-3 rounded-full bg-[#06C755] text-white font-bold text-xs sm:text-sm shadow-lg border-2 border-white hover:scale-105 transition-transform duration-200"
    >
      <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
        <MessageCircle className="w-4 h-4 fill-white" />
      </span>
      <span className="hidden sm:inline">ทักแชต LINE {lineHandle}</span>
      <span className="sm:hidden">LINE</span>
      <CuteHeart className="w-3.5 h-3.5 -mr-0.5 transition-transform group-hover:scale-125" />
    </a>
  );
};

const PublicLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { settings, fonts } = useSite();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-secondary)]">
      <InitialSplashLoader siteName={settings.site_name || 'pakzy.o'} fonts={fonts} />
      <Navbar />
      {/* Page Transition นุ่ม ๆ ทุกครั้งที่เปลี่ยนหน้า */}
      <main key={pathname} className="flex-1 animate-fade-in">
        <Suspense fallback={<LoadingState message="กำลังเปิดหน้าเว็บ pakzy.o สักครู่นะคะ ♡" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <FloatingLineButton />
    </div>
  );
};

const NotFoundPage: React.FC = () => (
  <div className="max-w-lg mx-auto px-4 py-16 sm:py-24 text-center">
    <div className="relative bg-white rounded-[2.25rem] border-2 border-[var(--color-border)] p-8 sm:p-10 shadow-xs space-y-4 overflow-hidden">
      <CardCornerDoodle corner="top-right" variant="star" />
      <CardCornerDoodle corner="bottom-left" variant="flower" />
      <PakzyMascotSticker mood="lost" className="w-28 h-28 mx-auto" />
      <span className="inline-block px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
        404 Page Not Found
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
        แงง~ น้องกระต่ายหาหน้านี้ไม่เจอค่ะ
      </h1>
      <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)] leading-relaxed">
        ลิงก์ที่คุณเปิดอาจถูกย้ายหรือพิมพ์ผิด ไม่เป็นไรนะคะ กลับไปดูบริการออกแบบป้ายและฟอนต์น่ารัก ๆ ที่หน้าแรกของร้าน pakzy.o กันเถอะ ♡
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="pkz-order-btn inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition shadow-xs"
        >
          <CuteHeart className="w-4 h-4" />
          <span>กลับสู่หน้าแรก pakzy.o</span>
        </Link>
      </div>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <SiteProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<LoadingState message="กำลังโหลดระบบ pakzy.o สักครู่นะคะ ♡" />}>
            <Routes>
              {/* หน้าบ้านสำหรับลูกค้า */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/font-tester" element={<FontTesterPage />} />
                <Route path="/font-quiz" element={<Navigate to="/font-tester" replace />} />
                <Route path="/order" element={<OrderPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/points" element={<PointsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* หน้าล็อกอินและระบบจัดการหลังบ้านสำหรับแอดมิน */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="bills" element={<AdminBillPage />} />
                <Route path="members" element={<AdminMembersPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="fonts" element={<AdminFontsPage />} />
                <Route path="reviews" element={<AdminReviewsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SiteProvider>
    </ToastProvider>
  );
};

export default App;
