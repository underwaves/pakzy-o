import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  Type,
  CheckCircle2,
  Plus,
  Minus,
  MessageCircle,
} from 'lucide-react';
import type { Product, FontItem } from '../types';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { ProductCard, FontSpecimenArtwork } from '../components/ui/ProductCard';
import { LoadingState, ErrorState } from '../components/ui/States';
import {
  CuteHeart,
  CuteFlower,
  CardCornerDoodle,
} from '../components/ui/Decorations';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addToOrderCart, cartItems, settings } = useSite();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [linkedFont, setLinkedFont] = useState<FontItem | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [itemNote, setItemNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/products/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('ไม่พบสินค้าหรือบริการที่คุณต้องการ');
        }
        return res.json();
      })
      .then((data) => {
        setProduct(data.product);
        setLinkedFont(data.linkedFont || null);
        setRelated(data.relatedProducts || []);
        setActiveImage(data.product?.image_url || '/r2/seed/product-banner.svg');
        setQuantity(1);
        setItemNote('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <LoadingState message="กำลังโหลดรายละเอียดสินค้า..." />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        <ErrorState message={error || 'ไม่พบรายการสินค้า'} />
        <div className="text-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-secondary)] text-white text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าบริการและฟอนต์ทั้งหมด
          </Link>
        </div>
      </div>
    );
  }

  let galleryList: string[] = [];
  try {
    const parsed = JSON.parse(product.gallery_json || '[]');
    if (Array.isArray(parsed)) {
      galleryList = parsed;
    }
  } catch {
    galleryList = [];
  }
  if (!galleryList.includes(product.image_url) && product.image_url) {
    galleryList.unshift(product.image_url);
  }

  const detailLines = (product.details || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    addToOrderCart(
      {
        product_id: product.id,
        product_title: product.title,
        category_type: product.category_type === 'font' ? 'font' : 'service',
        quantity,
        unit_price: product.price,
        item_note: itemNote.trim(),
        image_url: product.image_url,
      },
      { clientX: e.clientX, clientY: e.clientY }
    );
    showToast(`เพิ่ม "${product.title}" ลงในตะกร้าแล้วค่ะ ♡ (ดูที่ตะกร้าด้านบน)`, 'success');
  };

  const lineHandle = (settings.contact_line || '@280npxvj').trim();
  const lineUrlHandle = lineHandle.startsWith('@') ? lineHandle : `@${lineHandle}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-14">
      {/* ปุ่มย้อนกลับ */}
      <div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-secondary-muted)] hover:text-[var(--color-primary)] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้าบริการ & ฟอนต์ทั้งหมด
        </Link>
      </div>

      {/* รายละเอียดหลัก 2 คอลัมน์ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* รูปภาพสินค้า + ปุ่มใส่รูปปกและเพิ่มรูปแกลเลอรี */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative bg-white rounded-[2rem] border-2 border-[var(--color-border)] p-3 sm:p-4 shadow-xs overflow-hidden">
            <CardCornerDoodle corner="top-right" variant="flower" />
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--color-primary-light)]/40">
              {(activeImage || product.image_url || '').startsWith('/r2/seed/font-') ? (
                <FontSpecimenArtwork
                  imageUrl={activeImage || product.image_url}
                  compact={false}
                />
              ) : (
                <img
                  src={activeImage || product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {/* แถบรูปภาพแกลเลอรี */}
          {galleryList.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {galleryList.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(imgUrl)}
                  className={`w-20 h-16 rounded-2xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                    activeImage === imgUrl
                      ? 'border-[var(--color-primary)] scale-105 shadow-xs'
                      : 'border-[var(--color-border)] opacity-70 hover:opacity-100'
                  }`}
                >
                  {imgUrl.startsWith('/r2/seed/font-') ? (
                    <div className="w-full h-full bg-[var(--color-primary-light)] flex items-center justify-center text-[10px] font-bold text-[var(--color-secondary)]">
                      ตัวอย่างฟอนต์
                    </div>
                  ) : (
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ข้อมูลและปุ่มสั่งซื้อ */}
        <div className="relative lg:col-span-6 bg-white rounded-[2rem] border border-[var(--color-border)] p-6 sm:p-8 shadow-xs space-y-6 overflow-hidden">
          <CardCornerDoodle corner="top-right" variant="heart" />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                {product.category_name || 'บริการและฟอนต์'}
              </span>
              {product.badge && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-secondary)] text-white inline-flex items-center gap-1">
                  <CuteHeart className="w-3 h-3" />
                  {product.badge}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)] leading-snug">
              {product.title}
            </h1>
            {product.subtitle && (
              <p className="text-sm sm:text-base text-[var(--color-secondary-muted)]">
                {product.subtitle}
              </p>
            )}
          </div>

          {/* กล่องราคา */}
          <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/60 border border-[var(--color-border)] flex items-baseline justify-between">
            <div>
              <span className="text-xs text-[var(--color-secondary-muted)] block">
                {product.price_label || 'ราคาประเมิน'}
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-[var(--color-primary)]">
                ฿{Number(product.price).toLocaleString('th-TH')}
              </span>
            </div>
            {product.category_type === 'font' && (
              <Link
                to={
                  linkedFont
                    ? `/font-tester?font=${encodeURIComponent(linkedFont.family_name)}`
                    : '/font-tester'
                }
                className="px-4 py-2 rounded-full bg-white border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-semibold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-1.5"
              >
                <Type className="w-3.5 h-3.5" />
                ทดลองพิมพ์ฟอนต์นี้
              </Link>
            )}
          </div>

          {/* คำอธิบาย */}
          <div className="space-y-3 text-sm sm:text-base text-[var(--color-secondary)] leading-relaxed">
            <p>{product.description}</p>
          </div>

          {/* รายละเอียดสิ่งที่จะได้รับ */}
          {detailLines.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2.5">
              <h3 className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                <CuteFlower className="w-4 h-4" />
                รายละเอียดและเงื่อนไขบริการ
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[var(--color-secondary-muted)]">
                {detailLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* เลือกจำนวนและหมายเหตุเบื้องต้น */}
          <div className="space-y-4 pt-2 border-t border-[var(--color-border)]/70">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-secondary)]">
                จำนวนที่ต้องการสั่ง:
              </span>
              <div className="flex items-center gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full px-3 py-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                  aria-label="ลดจำนวน"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-sm text-[var(--color-secondary)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                  aria-label="เพิ่มจำนวน"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-secondary-muted)] mb-1.5">
                หมายเหตุเพิ่มเติมสำหรับรายการนี้ (ถ้ามี):
              </label>
              <input
                type="text"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="เช่น โทนสีชมพู-น้ำตาล, ขนาด 1080x1080 px, หรือชื่อแบรนด์..."
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                title="ใส่ตะกร้าไว้ก่อน"
                className="pkz-order-btn flex-1 py-3.5 px-6 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm sm:text-base hover:opacity-95 transition shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                ใส่ตะกร้า (฿{(product.price * quantity).toLocaleString('th-TH')})
              </button>
              <Link
                to="/order"
                className="py-3.5 px-5 rounded-full bg-[var(--color-secondary)] text-white font-semibold text-sm hover:opacity-95 transition inline-flex items-center justify-center gap-2 shadow-2xs"
              >
                <ShoppingBag className="w-4 h-4" />
                ไปที่ตะกร้าสินค้า
                {cartItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold leading-none">
                    {cartItems.reduce((acc, it) => acc + it.quantity, 0)}
                  </span>
                )}
              </Link>
              <a
                href={`https://line.me/R/ti/p/${lineUrlHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3.5 px-5 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary)] font-semibold text-sm hover:bg-[var(--color-primary-light)] transition inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-[#06C755]" />
                สอบถามทาง LINE
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* สินค้า/บริการใกล้เคียง */}
      {related.length > 0 && (
        <div className="pt-8 border-t border-[var(--color-border)]">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-secondary)] mb-6 flex items-center gap-2">
            <CuteHeart className="w-5 h-5" />
            รายการอื่น ๆ ที่น่าสนใจ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
