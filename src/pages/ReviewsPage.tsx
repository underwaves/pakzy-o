import React, { useState, useEffect } from 'react';
import { Star, Send, MessageSquareHeart, Gift } from 'lucide-react';
import type { ReviewItem, ReviewStats } from '../types';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import {
  CuteHeart,
  CuteFlower,
  CuteSectionDivider,
  CardCornerDoodle,
  RevealOnScroll,
} from '../components/ui/Decorations';
import { LoadingState, EmptyState } from '../components/ui/States';

export const ReviewsPage: React.FC = () => {
  const { products, settings, refreshSiteData } = useSite();
  const { showToast } = useToast();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total_count: 0,
    average_rating: 5,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState(true);

  const [reviewerName, setReviewerName] = useState('');
  const [serviceName, setServiceName] = useState('ออกแบบป้าย / กราฟิก');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [poppedStar, setPoppedStar] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.stats) setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSelectRating = (star: number) => {
    setRating(star);
    setPoppedStar(star);
    setTimeout(() => setPoppedStar(null), 500);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewerName.trim().length < 2) {
      showToast('กรุณากรอกชื่อหรือชื่อเล่นของคุณลูกค้าด้วยนะคะ', 'error');
      return;
    }
    if (comment.trim().length < 5) {
      showToast('กรุณาเขียนข้อความรีวิวอย่างน้อย 5 ตัวอักษรนะคะ', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_name: reviewerName.trim(),
          service_name: serviceName.trim(),
          rating,
          comment: comment.trim(),
          member_code: memberCode.trim().toUpperCase() || undefined,
          order_code: orderCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งรีวิวได้ในขณะนี้');
      }

      setReviewerName('');
      setComment('');
      setMemberCode('');
      setOrderCode('');
      setRating(5);
      showToast(data.message || 'ขอบคุณสำหรับรีวิวน่ารัก ๆ นะคะ ♡', 'success');
      if (data.review) {
        setReviews((prev) => [data.review, ...prev]);
      }
      if (data.stats) {
        setStats(data.stats);
      }
      refreshSiteData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งรีวิว',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
      {/* ส่วนหัวหน้ารีวิว */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-border)]">
          <CuteFlower className="w-3.5 h-3.5" /> Customer Love & Reviews
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-secondary)]">
          รีวิวและความประทับใจจากลูกค้า
        </h1>
        <CuteSectionDivider />
        <p className="text-sm sm:text-base text-[var(--color-secondary-muted)]">
          ทุกเสียงตอบรับคือกำลังใจสำคัญของร้าน qokhims ขอบคุณที่ให้เราดูแลงานดีไซน์และฟอนต์ให้แบรนด์ของคุณนะคะ ♡
        </p>
      </div>

      {/* ภาพรวมคะแนนเฉลี่ย + ฟอร์มเขียนรีวิว */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ซ้าย: สรุปคะแนนเฉลี่ย & ฟอร์มให้คะแนน */}
        <div className="lg:col-span-5 space-y-6">
          {/* การ์ดคะแนนเฉลี่ย */}
          <div className="relative bg-white rounded-[2rem] border-2 border-[var(--color-border)] p-6 shadow-xs space-y-5 overflow-hidden">
            <CardCornerDoodle corner="top-right" variant="star" />
            <div className="flex items-center gap-5">
              <div className="text-center px-4 py-3 rounded-2xl bg-[var(--color-primary-light)]/70 border border-[var(--color-border)]">
                <div className="text-3xl sm:text-4xl font-bold text-[var(--color-secondary)]">
                  {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '5.0'}
                </div>
                <div className="flex items-center justify-center gap-0.5 my-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>
                <div className="text-[11px] text-[var(--color-secondary-muted)]">
                  จาก {stats.total_count} รีวิว
                </div>
              </div>

              {/* แถบสัดส่วนดาว 5 ถึง 1 */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution?.[star] || 0;
                  const pct =
                    stats.total_count > 0
                      ? Math.round((count / stats.total_count) * 100)
                      : star === 5
                      ? 100
                      : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-semibold text-[var(--color-secondary)]">
                        {star} ★
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--color-bg)] overflow-hidden border border-[var(--color-border)]/60">
                        <div
                          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-7 text-right text-[var(--color-secondary-muted)]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ฟอร์มเขียนรีวิว */}
          <form
            onSubmit={handleSubmitReview}
            className="relative bg-white rounded-[2rem] border-2 border-[var(--color-border)] p-6 shadow-xs space-y-4 overflow-hidden"
          >
            <CardCornerDoodle corner="top-right" variant="heart" />
            <h2 className="text-lg font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-[var(--color-primary)]" />
              เขียนรีวิวให้ร้าน qokhims
            </h2>

            {/* เลือกดาว 1-5 (เด้งและเรืองแสงตอนกด) */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1.5">
                ให้คะแนนความพึงพอใจ (กดที่ดวงดาว):
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  const isPopping = poppedStar !== null && star <= poppedStar;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleSelectRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className={`p-1.5 rounded-xl hover:bg-[var(--color-primary-light)] transition cursor-pointer ${
                        isPopping ? 'animate-star-pop' : ''
                      }`}
                      aria-label={`ให้คะแนน ${star} ดาว`}
                    >
                      <Star
                        className={`w-7 h-7 transition-transform duration-200 ${
                          active
                            ? 'text-amber-400 fill-amber-400 scale-110'
                            : 'text-gray-300'
                        }`}
                        style={
                          active
                            ? {
                                filter:
                                  'drop-shadow(0 0 8px rgba(251, 191, 36, 0.65)) drop-shadow(0 0 12px rgba(236, 122, 154, 0.35))',
                              }
                            : undefined
                        }
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs font-bold text-[var(--color-primary)] px-2.5 py-1 rounded-full bg-[var(--color-primary-light)]">
                  {rating} / 5 ดาว
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                ชื่อของคุณ / ชื่อร้าน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="เช่น คุณพลอย (ร้านเสื้อผ้า)"
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                บริการหรือฟอนต์ที่สั่งซื้อ
              </label>
              <select
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="บริการออกแบบ / ฟอนต์">บริการออกแบบ / ฟอนต์ทั่วไป</option>
                {products.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                ข้อความรีวิว <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="เล่าความประทับใจเกี่ยวกับงานดีไซน์หรือฟอนต์ของเราได้เลยนะคะ ♡"
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {settings.loyalty_enabled !== 'false' &&
              Number(settings.review_bonus_points || 0) > 0 && (
                <div className="p-3.5 rounded-2xl bg-[var(--color-primary-light)]/60 border border-[var(--color-border)] space-y-2 text-xs">
                  <div className="font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span>
                      รับโบนัสสะสมแต้มพิเศษ +{settings.review_bonus_points} แต้ม (ตัวเลือก)
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-secondary-muted)] leading-relaxed">
                    หากคุณเป็นสมาชิกและมีรหัสคำสั่งซื้อ สามารถกรอกด้านล่างเพื่อรับแต้มโบนัสรีวิวเข้าบัญชีได้เลยค่ะ
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <input
                        type="text"
                        placeholder="รหัสสมาชิก PZ-XXXX"
                        value={memberCode}
                        onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border)] text-xs font-mono uppercase"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="รหัสออเดอร์ PKZ-xxxx"
                        value={orderCode}
                        onChange={(e) => setOrderCode(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border)] text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

            <button
              type="submit"
              disabled={submitting}
              className="pkz-order-btn w-full py-3 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'กำลังส่งรีวิว...' : 'ส่งรีวิวความประทับใจ'}
            </button>
          </form>
        </div>

        {/* ขวา: รายการรีวิวทั้งหมด */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <LoadingState message="กำลังโหลดรีวิวจากลูกค้า..." />
          ) : reviews.length === 0 ? (
            <EmptyState
              title="ยังไม่มีรีวิวในขณะนี้"
              description="มาเป็นคนแรกที่เขียนรีวิวน่ารัก ๆ ให้ร้าน qokhims กันนะคะ"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reviews.map((rev) => (
                <RevealOnScroll key={rev.id}>
                  <div className="relative bg-white p-5 rounded-3xl border border-[var(--color-border)] shadow-2xs flex flex-col justify-between space-y-4 h-full overflow-hidden">
                    <CardCornerDoodle corner="bottom-right" variant="flower" />
                    <div className="space-y-2.5">
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
                        <CuteHeart className="w-4 h-4" />
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
                        <div className="text-[11px] font-medium text-[var(--color-primary)]">
                          {rev.service_name}
                        </div>
                      </div>
                      <span className="text-[11px] text-[var(--color-secondary-muted)]">
                        {new Date(rev.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
