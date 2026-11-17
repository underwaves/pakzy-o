import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Type, Sparkles, Filter } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { ProductCard } from '../components/ui/ProductCard';
import { CuteSectionDivider, CuteFlower, CuteHeart } from '../components/ui/Decorations';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/States';

export const ProductsPage: React.FC = () => {
  const { products, categories, loading, error, refreshSiteData } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeType = searchParams.get('type') || 'all'; // 'all' | 'service' | 'font'
  const activeCatSlug = searchParams.get('category') || 'all';
  const [searchText, setSearchText] = useState('');

  const handleTypeChange = (type: string) => {
    const next = new URLSearchParams(searchParams);
    if (type === 'all') next.delete('type');
    else next.set('type', type);
    next.delete('category');
    setSearchParams(next);
  };

  const handleCategoryChange = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (slug === 'all') next.delete('category');
    else next.set('category', slug);
    setSearchParams(next);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeType !== 'all' && p.category_type !== activeType) {
        return false;
      }
      if (activeCatSlug !== 'all' && p.category_slug !== activeCatSlug) {
        return false;
      }
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSub = (p.subtitle || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        return matchTitle || matchSub || matchDesc;
      }
      return true;
    });
  }, [products, activeType, activeCatSlug, searchText]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      {/* ส่วนหัวของหน้าบริการและสินค้า */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)]">
          <CuteFlower className="w-3.5 h-3.5" /> Services & Cute Fonts
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-secondary)]">
          บริการรับออกแบบกราฟิก & ฟอนต์ลายมือ
        </h1>
        <CuteSectionDivider />
        <p className="text-sm sm:text-base text-[var(--color-secondary-muted)]">
          เลือกชมบริการออกแบบป้าย Rich Menu แต่งรูป ลายน้ำ และฟอนต์ลายมือน่ารัก ๆ ของร้าน สามารถกรองตามหมวดหมู่ด้านล่างได้เลยค่ะ
        </p>
      </div>

      {/* แถบตัวกรองหมวดหมู่หลัก (ทั้งหมด / บริการออกแบบ / ฟอนต์) + ค้นหา */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[var(--color-border)] shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* ปุ่มกรองประเภทหลัก: บริการ / ฟอนต์ */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleTypeChange('all')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeType === 'all'
                  ? 'bg-[var(--color-secondary)] text-white shadow-2xs'
                  : 'bg-[var(--color-primary-light)]/70 text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)]'
              }`}
            >
              ทั้งหมด ({products.length})
            </button>
            <button
              onClick={() => handleTypeChange('service')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
                activeType === 'service'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'bg-[var(--color-primary-light)]/70 text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              บริการออกแบบ ({products.filter((p) => p.category_type === 'service').length})
            </button>
            <button
              onClick={() => handleTypeChange('font')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
                activeType === 'font'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'bg-[var(--color-primary-light)]/70 text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)]'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              ฟอนต์ลายมือ ({products.filter((p) => p.category_type === 'font').length})
            </button>
          </div>

          {/* ช่องค้นหา */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[var(--color-secondary-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ค้นหาชื่อบริการ หรือชื่อฟอนต์..."
              className="w-full pl-9 pr-4 py-2 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* หมวดหมู่ย่อย */}
        {categories.length > 0 && (
          <div className="pt-3 border-t border-[var(--color-border)]/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-secondary-muted)] inline-flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> หมวดหมู่ย่อย:
            </span>
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeCatSlug === 'all'
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/40'
                  : 'text-[var(--color-secondary-muted)] hover:bg-gray-100'
              }`}
            >
              ทุกหมวดย่อย
            </button>
            {categories
              .filter((c) => activeType === 'all' || c.type === activeType)
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    activeCatSlug === cat.slug
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/40'
                      : 'text-[var(--color-secondary-muted)] hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* แบนเนอร์ลัดไปหน้าทดลองฟอนต์เมื่อเลือกดูฟอนต์ */}
      {(activeType === 'font' || activeCatSlug.includes('font')) && (
        <div className="bg-[var(--color-primary-light)]/80 border border-[var(--color-border)] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm text-[var(--color-secondary)] font-medium">
            <CuteHeart className="w-4 h-4 text-[var(--color-primary)]" />
            <span>อยากลองพิมพ์ชื่อร้านของคุณด้วยฟอนต์เหล่านี้ก่อนตัดสินใจซื้อไหมคะ?</span>
          </div>
          <Link
            to="/font-tester"
            className="px-4 py-2 rounded-full bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition shrink-0 inline-flex items-center gap-1.5"
          >
            <Type className="w-3.5 h-3.5" />
            เปิดหน้าทดลองพิมพ์ฟอนต์ (A/B)
          </Link>
        </div>
      )}

      {/* รายการการ์ดสินค้า */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refreshSiteData} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="ไม่พบสินค้าหรือบริการที่ค้นหา"
          description="ลองล้างตัวกรองการค้นหา หรือเลือกดูหมวดหมู่อื่นดูนะคะ"
          actionLabel="ดูสินค้าทั้งหมด"
          onAction={() => {
            setSearchText('');
            setSearchParams({});
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
