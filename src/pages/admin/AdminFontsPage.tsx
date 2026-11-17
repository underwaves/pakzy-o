import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Check,
  X,
  Type,
  Eye,
  EyeOff,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { FontItem } from '../../types';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../../components/ui/States';
import { calculateFontPriceInfo } from '../../utils/promo';

interface FontFormState {
  id: number | null;
  name: string;
  family_name: string;
  file_url: string;
  format: 'woff2' | 'truetype' | 'opentype';
  sample_text: string;
  description: string;
  price: number;
  discount_type: 'none' | 'fixed' | 'percent';
  discount_value: number;
  promo_start_at: string;
  promo_end_at: string;
  style_tags: string;
  is_active: boolean;
}

const EMPTY_FONT: FontFormState = {
  id: null,
  name: '',
  family_name: '',
  file_url: '',
  format: 'woff2',
  sample_text: 'ฝากร้านหน่อยนะคะ ขอบคุณทุกออเดอร์เลยน้า ♡ 1234567890',
  description: 'ฟอนต์ลายมือน่ารัก อ่านง่าย ใช้ได้ทั้งส่วนตัวและเชิงพาณิชย์',
  price: 159,
  discount_type: 'none',
  discount_value: 0,
  promo_start_at: '',
  promo_end_at: '',
  style_tags: 'น่ารัก,อ่านง่าย,ลายมือ',
  is_active: true,
};

export const AdminFontsPage: React.FC = () => {
  const { refreshSiteData } = useSite();
  const { showToast } = useToast();

  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FontFormState>(EMPTY_FONT);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFonts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fonts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFonts(data.fonts || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFonts();
  }, []);

  const handleOpenAdd = () => {
    setForm({
      ...EMPTY_FONT,
      family_name: `PKZFont${Date.now().toString().slice(-4)}`,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (f: FontItem) => {
    setForm({
      id: f.id,
      name: f.name,
      family_name: f.family_name,
      file_url: f.file_url,
      format: f.format || 'woff2',
      sample_text: f.sample_text,
      description: f.description,
      price: Number(f.price),
      discount_type: f.discount_type || 'none',
      discount_value: Number(f.discount_value) || 0,
      promo_start_at: f.promo_start_at ? f.promo_start_at.slice(0, 10) : '',
      promo_end_at: f.promo_end_at ? f.promo_end_at.slice(0, 10) : '',
      style_tags: f.style_tags,
      is_active: Boolean(f.is_active),
    });
    setModalOpen(true);
  };

  const handleFontFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'fonts');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'อัปโหลดไฟล์ฟอนต์ไม่สำเร็จ');
      }

      setForm((prev) => ({
        ...prev,
        file_url: data.url,
        format:
          data.format === 'truetype' || data.format === 'opentype'
            ? data.format
            : 'woff2',
      }));
      showToast('อัปโหลดไฟล์ฟอนต์ขึ้น Cloudflare R2 สำเร็จค่ะ ♡', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = form.id !== null;
      const url = isEdit ? `/api/admin/fonts/${form.id}` : '/api/admin/fonts';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'บันทึกฟอนต์ไม่สำเร็จ');
      }

      showToast(data.message || 'บันทึกข้อมูลฟอนต์เรียบร้อยแล้วค่ะ', 'success');
      setModalOpen(false);
      await loadFonts();
      await refreshSiteData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f: FontItem) => {
    if (!window.confirm(`ยืนยันการลบฟอนต์ "${f.name}" ใช่หรือไม่คะ?`)) return;
    try {
      const res = await fetch(`/api/admin/fonts/${f.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        showToast('ลบฟอนต์เรียบร้อยแล้วค่ะ', 'info');
        loadFonts();
        refreshSiteData();
      }
    } catch {
      showToast('ลบไม่สำเร็จ', 'error');
    }
  };

  if (loading) {
    return <LoadingState message="กำลังโหลดรายการฟอนต์ในระบบ..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-secondary)]">
            จัดการฟอนต์สำหรับหน้าทดลองพิมพ์ ({fonts.length})
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
            อัปโหลดไฟล์ฟอนต์ (.ttf, .otf, .woff2) ขึ้น Cloudflare R2 เพื่อให้ลูกค้าทดลองพิมพ์แบบเรียลไทม์
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          อัปโหลด / เพิ่มฟอนต์ใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {fonts.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-3xl border border-[var(--color-border)] p-5 shadow-2xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-2">
                    <Type className="w-4 h-4 text-[var(--color-primary)]" />
                    {f.name}
                  </h2>
                  <p className="text-xs text-[var(--color-secondary-muted)]">
                    CSS Family: <code>{f.family_name}</code> | ไฟล์: <code>{f.file_url}</code>
                  </p>
                </div>
                {(() => {
                  const promo = calculateFontPriceInfo(f);
                  return (
                    <div className="text-right shrink-0">
                      {promo.hasPromo ? (
                        <div>
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="line-through text-xs text-[var(--color-secondary-muted)] font-normal">
                              ฿{promo.originalPrice}
                            </span>
                            <span className="text-base font-bold text-[var(--color-primary)]">
                              ฿{promo.effectivePrice}
                            </span>
                          </div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold">
                            ✨ {promo.discountBadgeText}
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-bold text-[var(--color-primary)]">
                          ฿{f.price}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-base text-[var(--color-secondary)]">
                {f.sample_text}
              </div>

              <p className="text-xs text-[var(--color-secondary-muted)]">{f.description}</p>
            </div>

            <div className="pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                  f.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {f.is_active ? (
                  <>
                    <Eye className="w-3.5 h-3.5" /> เปิดให้ทดลองพิมพ์
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> ซ่อนไว้
                  </>
                )}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(f)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" /> แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(f)}
                  className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="ลบฟอนต์"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal เพิ่ม/แก้ไขฟอนต์ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border-2 border-[var(--color-border)] shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h2 className="text-lg font-bold text-[var(--color-secondary)]">
                {form.id ? 'แก้ไขข้อมูลฟอนต์' : 'อัปโหลดฟอนต์ใหม่ขึ้น R2'}
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
              <div>
                <label className="block text-xs font-semibold mb-1">
                  ชื่อฟอนต์สำหรับแสดงผล *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น PKZ Sweet Berry (สวีทเบอร์รี)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    ชื่อ CSS Font-Family (ภาษาอังกฤษติดกัน) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.family_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        family_name: e.target.value.replace(/\s+/g, ''),
                      }))
                    }
                    placeholder="PKZSweetBerry"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">ราคาปกติของฟอนต์ (บาท) *</label>
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
              </div>

              {/* ส่วนลดและโปรโมชัน (แบบบาท หรือ %) */}
              <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/40 border border-[var(--color-border)] space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-secondary)]">
                  <Tag className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>โปรโมชัน & ส่วนลดฟอนต์ (หน้าเว็บจะแสดงราคาขีดฆ่าอัตโนมัติ)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-[var(--color-secondary)]">
                      ประเภทส่วนลด
                    </label>
                    <select
                      value={form.discount_type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          discount_type: e.target.value as 'none' | 'fixed' | 'percent',
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--color-border)] text-xs"
                    >
                      <option value="none">ไม่มีส่วนลด (ราคาปกติ)</option>
                      <option value="fixed">ลดเป็นบาท (฿)</option>
                      <option value="percent">ลดเป็นเปอร์เซ็นต์ (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-[var(--color-secondary)]">
                      {form.discount_type === 'percent'
                        ? 'มูลค่าส่วนลด (เปอร์เซ็นต์ %)'
                        : 'มูลค่าส่วนลด (บาท ฿)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={form.discount_type === 'percent' ? 100 : undefined}
                      disabled={form.discount_type === 'none'}
                      value={form.discount_value}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          discount_value: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--color-border)] text-xs disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-[var(--color-secondary)]">
                      วันที่เริ่มโปรโมชัน (ไม่บังคับ)
                    </label>
                    <input
                      type="date"
                      disabled={form.discount_type === 'none'}
                      value={form.promo_start_at}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, promo_start_at: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--color-border)] text-xs disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-[var(--color-secondary)]">
                      วันที่สิ้นสุดโปรโมชัน (ไม่บังคับ)
                    </label>
                    <input
                      type="date"
                      disabled={form.discount_type === 'none'}
                      value={form.promo_end_at}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, promo_end_at: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--color-border)] text-xs disabled:opacity-50"
                    />
                  </div>
                </div>

                {form.discount_type !== 'none' && form.discount_value > 0 && (
                  <p className="text-[11px] text-[var(--color-primary)] font-semibold">
                    💡 ราคาขายหลังหักส่วนลดจะเหลือประมาณ: ฿
                    {form.discount_type === 'fixed'
                      ? Math.max(0, form.price - form.discount_value)
                      : Math.max(0, Math.round(form.price * (1 - form.discount_value / 100)))}{' '}
                    บาท
                  </p>
                )}
              </div>

              {/* อัปโหลดไฟล์ฟอนต์ขึ้น R2 */}
              <div>
                <label className="block text-xs font-semibold mb-1">
                  ไฟล์ฟอนต์ (.ttf, .otf, .woff2) ใน R2 *
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    required
                    value={form.file_url}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, file_url: e.target.value }))
                    }
                    placeholder="/r2/fonts/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                  />
                  <label className="px-4 py-2.5 rounded-xl bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ .ttf/.otf/.woff2'}
                    <input
                      type="file"
                      accept=".ttf,.otf,.woff2"
                      onChange={handleFontFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  ข้อความตัวอย่างเริ่มต้น
                </label>
                <input
                  type="text"
                  value={form.sample_text}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sample_text: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  ป้ายสไตล์ฟอนต์ (คั่นด้วยลูกน้ำ ,)
                </label>
                <input
                  type="text"
                  value={form.style_tags}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, style_tags: e.target.value }))
                  }
                  placeholder="หัวกลม,น่ารัก,อ่านง่าย"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">คำอธิบายฟอนต์</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                />
              </div>

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
                  เปิดแสดงฟอนต์นี้ในหน้าทดลองพิมพ์ฟอนต์
                </span>
              </label>

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
                  {saving ? 'กำลังบันทึก...' : 'บันทึกฟอนต์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
