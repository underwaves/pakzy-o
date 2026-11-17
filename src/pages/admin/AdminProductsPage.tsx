import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Check,
  X,
  Eye,
  EyeOff,
  Star,
  ImagePlus,
} from 'lucide-react';
import type { Product, Category } from '../../types';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../../components/ui/States';

interface ProductFormState {
  id: number | null;
  category_id: number;
  title: string;
  subtitle: string;
  description: string;
  details: string;
  price: number;
  price_label: string;
  image_url: string;
  gallery_json: string;
  badge: string;
  is_featured: boolean;
  is_active: boolean;
}

const EMPTY_FORM: ProductFormState = {
  id: null,
  category_id: 1,
  title: '',
  subtitle: '',
  description: '',
  details: '',
  price: 150,
  price_label: 'เริ่มต้น',
  image_url: '/r2/seed/product-banner.svg',
  gallery_json: '[]',
  badge: '',
  is_featured: false,
  is_active: true,
};

export const AdminProductsPage: React.FC = () => {
  const { refreshSiteData } = useSite();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingRowId, setUploadingRowId] = useState<number | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenAdd = () => {
    setForm({
      ...EMPTY_FORM,
      category_id: categories[0]?.id || 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setForm({
      id: p.id,
      category_id: p.category_id,
      title: p.title,
      subtitle: p.subtitle || '',
      description: p.description || '',
      details: p.details || '',
      price: Number(p.price),
      price_label: p.price_label || 'เริ่มต้น',
      image_url: p.image_url || '',
      gallery_json: p.gallery_json || '[]',
      badge: p.badge || '',
      is_featured: Boolean(p.is_featured),
      is_active: Boolean(p.is_active),
    });
    setModalOpen(true);
  };

  const handleQuickRowImageUpload = async (
    p: Product,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRowId(p.id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', 'cover');

      const res = await fetch(`/api/admin/products/${p.id}/image`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'อัปโหลดรูปไม่สำเร็จ');
      }
      showToast(`เปลี่ยนรูปปกของ "${p.title}" สำเร็จแล้วค่ะ ♡`, 'success');
      await loadProducts();
      await refreshSiteData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ', 'error');
    } finally {
      setUploadingRowId(null);
      e.target.value = '';
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'cover' | 'gallery' = 'cover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'products');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'อัปโหลดรูปไม่สำเร็จ');
      }

      if (target === 'gallery') {
        let currentList: string[] = [];
        try {
          currentList = JSON.parse(form.gallery_json || '[]');
          if (!Array.isArray(currentList)) currentList = [];
        } catch {
          currentList = [];
        }
        currentList.push(data.url);
        setForm((prev) => ({
          ...prev,
          gallery_json: JSON.stringify(currentList),
        }));
        showToast('เพิ่มรูปลงในแกลเลอรีแล้วค่ะ ♡', 'success');
      } else {
        setForm((prev) => ({ ...prev, image_url: data.url }));
        showToast('อัปโหลดรูปหน้าปกขึ้น Cloudflare R2 สำเร็จค่ะ ♡', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryImage = (urlToRemove: string) => {
    try {
      const list = JSON.parse(form.gallery_json || '[]');
      if (Array.isArray(list)) {
        const next = list.filter((u: string) => u !== urlToRemove);
        setForm((prev) => ({ ...prev, gallery_json: JSON.stringify(next) }));
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = form.id !== null;
      const url = isEdit ? `/api/admin/products/${form.id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      }

      showToast(data.message || 'บันทึกข้อมูลเรียบร้อยแล้วค่ะ', 'success');
      setModalOpen(false);
      await loadProducts();
      await refreshSiteData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...p,
          is_featured: Boolean(p.is_featured),
          is_active: !p.is_active,
        }),
      });
      if (res.ok) {
        showToast(
          p.is_active ? 'ซ่อนรายการจากหน้าเว็บแล้ว' : 'เปิดแสดงรายการบนหน้าเว็บแล้ว',
          'info'
        );
        loadProducts();
        refreshSiteData();
      }
    } catch {
      showToast('ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`ยืนยันการลบ "${p.title}" ใช่หรือไม่คะ?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        showToast('ลบสินค้า/บริการเรียบร้อยแล้วค่ะ', 'info');
        loadProducts();
        refreshSiteData();
      }
    } catch {
      showToast('ลบไม่สำเร็จ', 'error');
    }
  };

  let parsedGallery: string[] = [];
  try {
    const arr = JSON.parse(form.gallery_json || '[]');
    if (Array.isArray(arr)) parsedGallery = arr;
  } catch {
    parsedGallery = [];
  }

  if (loading) {
    return <LoadingState message="กำลังโหลดรายการสินค้าและบริการ..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-secondary)]">
            จัดการสินค้าและบริการ ({products.length})
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
            กดปุ่ม "เปลี่ยนรูป" ที่แต่ละรายการเพื่ออัปโหลดรูปปกใหม่ขึ้น Cloudflare R2 ได้ทันที
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          เพิ่มสินค้า / บริการใหม่
        </button>
      </div>

      {/* มุมมองการ์ดสำหรับมือถือ (Mobile Card View — ไม่ซ้อนทับและกดเปลี่ยนรูปง่าย) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-3xl border border-[var(--color-border)] p-4 shadow-2xs space-y-3.5"
          >
            <div className="flex items-start gap-3.5">
              <img
                src={p.image_url}
                alt={p.title}
                className="w-24 h-20 rounded-2xl object-cover border border-[var(--color-border)] bg-[var(--color-primary-light)] shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-primary-light)] text-[var(--color-secondary)] truncate max-w-[160px]">
                    {p.category_name || 'ทั่วไป'}
                  </span>
                  <span className="text-base font-bold text-[var(--color-primary)] shrink-0">
                    ฿{Number(p.price).toLocaleString('th-TH')}
                  </span>
                </div>

                <div className="font-bold text-sm text-[var(--color-secondary)] leading-snug flex items-start gap-1">
                  <span className="line-clamp-2">{p.title}</span>
                  {p.is_featured === 1 && (
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
                  )}
                </div>

                {p.subtitle && (
                  <p className="text-xs text-[var(--color-secondary-muted)] line-clamp-1">
                    {p.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--color-border)]/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:opacity-95 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition shadow-2xs">
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>
                    {uploadingRowId === p.id ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปปก'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleQuickRowImageUpload(p, e)}
                    disabled={uploadingRowId === p.id}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleToggleActive(p)}
                  title={p.is_active ? 'คลิกเพื่อซ่อนจากหน้าเว็บ (จะยังเลือกในบิลส่งไลน์ได้)' : 'คลิกเพื่อเปิดแสดงบนหน้าเว็บ'}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                    p.is_active
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  }`}
                >
                  {p.is_active ? (
                    <>
                      <Eye className="w-3.5 h-3.5" /> แสดงบนเว็บ
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> ซ่อนจากเว็บ (ใช้ในบิลไลน์)
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(p)}
                  className="px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="ลบ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ตารางสินค้าสำหรับหน้าจอแท็บเล็ตและคอมพิวเตอร์ */}
      <div className="hidden md:block bg-white rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] text-xs text-[var(--color-secondary-muted)]">
                <th className="py-3.5 px-4 whitespace-nowrap">รูปหน้าปก (คลิกเปลี่ยนรูปได้)</th>
                <th className="py-3.5 px-4 min-w-[220px]">ชื่อบริการ / สินค้า</th>
                <th className="py-3.5 px-4 whitespace-nowrap">หมวดหมู่</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ราคา</th>
                <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-bg)]/50">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-16 h-12 rounded-xl object-cover border border-[var(--color-border)] bg-[var(--color-primary-light)] shrink-0"
                      />
                      <label className="px-2.5 py-1.5 rounded-xl bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)] text-[var(--color-secondary)] hover:text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition shrink-0">
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>
                          {uploadingRowId === p.id ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูป'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleQuickRowImageUpload(p, e)}
                          disabled={uploadingRowId === p.id}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                      <span>{p.title}</span>
                      {p.is_featured === 1 && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-secondary-muted)] line-clamp-1">
                      {p.subtitle}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-primary-light)] text-[var(--color-secondary)]">
                      {p.category_name || 'ทั่วไป'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[var(--color-primary)] whitespace-nowrap">
                    ฿{Number(p.price).toLocaleString('th-TH')}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(p)}
                      title={p.is_active ? 'คลิกเพื่อซ่อนจากหน้าเว็บ (จะยังเลือกในบิลส่งไลน์ได้)' : 'คลิกเพื่อเปิดแสดงบนหน้าเว็บ'}
                      className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                        p.is_active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      {p.is_active ? (
                        <>
                          <Eye className="w-3.5 h-3.5" /> แสดงบนเว็บ
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> ซ่อนจากเว็บ (ใช้ในบิลไลน์)
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition cursor-pointer"
                      title="แก้ไข"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal เพิ่ม/แก้ไขสินค้า */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border-2 border-[var(--color-border)] shadow-xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h2 className="text-lg font-bold text-[var(--color-secondary)]">
                {form.id ? 'แก้ไขสินค้า / บริการ' : 'เพิ่มสินค้า / บริการใหม่'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">หมวดหมู่ *</label>
                  <select
                    value={form.category_id}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category_id: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'font' ? 'ฟอนต์' : 'บริการ'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    ป้ายกำกับพิเศษ (เช่น ขายดี, แนะนำ)
                  </label>
                  <input
                    type="text"
                    value={form.badge}
                    onChange={(e) => setForm((prev) => ({ ...prev, badge: e.target.value }))}
                    placeholder="เช่น ยอดฮิต, มาใหม่"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  ชื่อสินค้า / บริการ *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น ออกแบบป้ายบัญชี / ป้ายแม่ค้าออนไลน์"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">คำโปรยสั้น ๆ</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="เช่น โทนพาสเทล มินิมอล ปรับสีตามแบรนด์ได้"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">ราคา (บาท) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    คำนำหน้าราคา (เช่น เริ่มต้น, ราคาเดียว)
                  </label>
                  <input
                    type="text"
                    value={form.price_label}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price_label: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                  />
                </div>
              </div>

              {/* อัปโหลดรูปหน้าปกขึ้น R2 พร้อมพรีวิว */}
              <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
                <label className="block text-xs font-bold text-[var(--color-secondary)]">
                  รูปภาพหน้าปกของการ์ด (อัปโหลดรูปจากเครื่องขึ้น R2 หรือวาง URL) *
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  {form.image_url && (
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="w-24 h-18 rounded-xl object-cover border border-[var(--color-border)] bg-white shrink-0"
                    />
                  )}
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="text"
                      required
                      value={form.image_url}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, image_url: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[var(--color-border)] text-xs"
                    />
                    <label className="px-4 py-2 rounded-xl bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปหน้าปกจากเครื่อง'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'cover')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* รูปตัวอย่างเพิ่มเติมในแกลเลอรี */}
                <div className="pt-3 border-t border-[var(--color-border)]/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--color-secondary)]">
                      รูปตัวอย่างเพิ่มเติมในหน้ารายละเอียด ({parsedGallery.length} รูป)
                    </span>
                    <label className="px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border)] text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1 cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มรูปในแกลเลอรี
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'gallery')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {parsedGallery.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {parsedGallery.map((gUrl, idx) => (
                        <div
                          key={idx}
                          className="relative group w-16 h-14 rounded-xl overflow-hidden border border-[var(--color-border)] bg-white"
                        >
                          <img src={gUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(gUrl)}
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-red-500 text-white opacity-90 hover:opacity-100 cursor-pointer"
                            title="ลบรูปนี้"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">รายละเอียดอธิบายบริการ</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  สิ่งที่จะได้รับ / เงื่อนไข (ขึ้นบรรทัดใหม่เพื่อแยกหัวข้อย่อย)
                </label>
                <textarea
                  rows={3}
                  value={form.details}
                  onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, is_featured: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                  <span className="text-xs font-semibold">แสดงเป็นสินค้าแนะนำหน้าแรก</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                  <span className="text-xs font-semibold">
                    เปิดแสดงผลบนเว็บไซต์ (หากปิด จะซ่อนจากหน้าเว็บ แต่ยังเลือกในบิลส่งไลน์ได้ตามปกติ)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[var(--color-border)] text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-95 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
