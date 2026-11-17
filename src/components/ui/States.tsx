import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  CuteHeart,
  CuteFlower,
  PakzyMascotSticker,
  CardCornerDoodle,
  BrandWordmark,
} from './Decorations';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'กำลังจัดเตรียมผลงานน่ารัก ๆ รอแป๊บนึงน้า ♡',
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
    <div className="relative mb-2 animate-float-gentle">
      <PakzyMascotSticker mood="loading" className="w-22 h-22" />
    </div>
    <div className="text-xl font-bold text-[var(--color-secondary)] mb-1 animate-pulse-soft">
      <BrandWordmark name="pakzy.o" dotVariant="heart" dotClassName="w-4 h-4 mx-0.5 -translate-y-0.5" />
    </div>
    <p className="text-sm sm:text-base font-medium text-[var(--color-secondary-muted)] flex items-center gap-1.5">
      <CuteFlower className="w-4 h-4 animate-spin" />
      <span>{message}</span>
    </p>
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  title = 'ยังไม่มีรายการในมุมนี้เลยน้า ♡',
  description = 'ลองเลือกหมวดหมู่อื่น หรือทักแชตสอบถามแอดมินทาง LINE @280npxvj ได้ตลอดเลยนะคะ',
  actionLabel,
  onAction,
}) => (
  <div className="relative flex flex-col items-center justify-center py-14 px-6 text-center pkz-card rounded-3xl border-dashed animate-fade-in">
    <CardCornerDoodle variant="flower" position="top-right" />
    <CardCornerDoodle variant="heart" position="top-left" />
    <div className="mb-3 animate-float-gentle">
      <PakzyMascotSticker mood="empty" className="w-24 h-24" />
    </div>
    <h3 className="text-lg font-bold text-[var(--color-secondary)] mb-1 flex items-center gap-1.5">
      <span>{title}</span>
      <CuteHeart className="w-4 h-4" />
    </h3>
    <p className="text-sm text-[var(--color-secondary-muted)] max-w-md mb-5">
      {description}
    </p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="pkz-order-btn px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition shadow-xs cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'เกิดข้อผิดพลาดในการโหลดข้อมูลชั่วคราวค่ะ', onRetry }) => (
  <div className="relative flex flex-col items-center justify-center py-14 px-6 text-center pkz-card rounded-3xl animate-fade-in">
    <div className="mb-3">
      <PakzyMascotSticker mood="lost" className="w-22 h-22" />
    </div>
    <h3 className="text-base font-bold text-[var(--color-secondary)] mb-1">
      อุ๊ปส์! โหลดข้อมูลสะดุดนิดหน่อยค่ะ
    </h3>
    <p className="text-sm text-[var(--color-secondary-muted)] max-w-md mb-4">
      {message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-secondary)] text-sm font-semibold hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        ลองโหลดใหม่อีกครั้งนะคะ
      </button>
    )}
  </div>
);
