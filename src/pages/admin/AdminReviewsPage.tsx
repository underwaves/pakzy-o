import React, { useEffect, useState } from 'react';
import { Star, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { ReviewItem } from '../../types';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../../components/ui/States';

export const AdminReviewsPage: React.FC = () => {
  const { refreshSiteData } = useSite();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleToggleVisibility = async (rev: ReviewItem) => {
    const nextVisible = rev.is_visible ? 0 : 1;
    try {
      const res = await fetch(`/api/admin/reviews/${rev.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_visible: nextVisible }),
      });
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === rev.id ? { ...r, is_visible: nextVisible } : r))
        );
        showToast(
          nextVisible ? 'เปิดแสดงรีวิวบนหน้าเว็บแล้วค่ะ' : 'ซ่อนรีวิวจากหน้าเว็บแล้วค่ะ',
          'info'
        );
        refreshSiteData();
      }
    } catch {
      showToast('ไม่สามารถเปลี่ยนสถานะรีวิวได้', 'error');
    }
  };

  const handleDelete = async (rev: ReviewItem) => {
    if (!window.confirm(`ยืนยันการลบรีวิวของ "${rev.reviewer_name}" ใช่หรือไม่คะ?`))
      return;
    try {
      const res = await fetch(`/api/admin/reviews/${rev.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== rev.id));
        showToast('ลบรีวิวเรียบร้อยแล้ว', 'info');
        refreshSiteData();
      }
    } catch {
      showToast('ลบรีวิวไม่สำเร็จ', 'error');
    }
  };

  if (loading) {
    return <LoadingState message="กำลังโหลดรายการรีวิวทั้งหมด..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">
          จัดการรีวิวลูกค้า ({reviews.length})
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
          ตรวจสอบรีวิวที่ลูกค้าส่งเข้ามา สามารถกดซ่อนหรือเปิดแสดงบนหน้าเว็บได้ทันที
        </p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState title="ยังไม่มีรีวิวในระบบ" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className={`bg-white rounded-3xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 ${
                rev.is_visible
                  ? 'border-[var(--color-border)]'
                  : 'border-gray-200 opacity-65'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rev.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-[var(--color-secondary-muted)]">
                    {new Date(rev.created_at).toLocaleString('th-TH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                <p className="text-sm text-[var(--color-secondary)] leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-[var(--color-secondary)]">
                    {rev.reviewer_name}
                  </div>
                  <div className="text-[11px] text-[var(--color-primary)]">
                    {rev.service_name}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleVisibility(rev)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                      rev.is_visible
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rev.is_visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" /> แสดงบนเว็บ
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> ซ่อนอยู่
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(rev)}
                    className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="ลบรีวิว"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
