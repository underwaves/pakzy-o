import React, { useState, useRef } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { CuteHeart, CuteFlower, CuteSparkle, BrandWordmark } from './Decorations';

interface BeforeAfterPreset {
  id: string;
  label: string;
  caption: string;
}

const PRESETS: BeforeAfterPreset[] = [
  {
    id: 'retouch',
    label: 'แต่งรูปสินค้า & ไดคัทฉากละมุน',
    caption: 'ลากตัวแบ่งซ้าย-ขวาเพื่อดูความต่างระหว่างภาพถ่ายสินค้าเดิม กับภาพที่ไดคัทปรับแสงและจัดวางข้อความด้วยฟอนต์ของร้าน',
  },
  {
    id: 'watermark',
    label: 'ใส่ลายน้ำ & โลโก้ตัวอักษรประจำร้าน',
    caption: 'เปรียบเทียบภาพสินค้าก่อนและหลังแปะลายน้ำโปร่งใส (.PNG) ดีไซน์มินิมอล ป้องกันการนำรูปไปใช้และเพิ่มการจดจำแบรนด์',
  },
];

export const BeforeAfterSlider: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('retouch');
  const [sliderPos, setSliderPos] = useState<number>(52);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updatePositionFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(8, Math.min(92, rawPct));
    setSliderPos(clamped);
  };

  const activePreset = PRESETS.find((p) => p.id === activeTab) || PRESETS[0];

  return (
    <div className="pkz-card rounded-[2.2rem] p-5 sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)] mb-1.5">
            <CuteSparkle className="w-3.5 h-3.5" />
            Before / After เปรียบเทียบผลงาน
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-secondary)]">
            ลองลากดูความละมุนก่อน & หลังแต่งรูป
          </h3>
        </div>

        {/* ปุ่มสลับโหมดตัวอย่าง */}
        <div className="inline-flex p-1 rounded-full bg-[var(--color-primary-light)]/80 border border-[var(--color-border)] self-start">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setActiveTab(preset.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === preset.id
                  ? 'bg-[var(--color-secondary)] text-[var(--color-bg)] shadow-2xs'
                  : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* กรอบเปรียบเทียบ Before / After */}
      <div
        ref={containerRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          updatePositionFromClientX(e.clientX);
        }}
        onMouseMove={(e) => {
          if (isDragging) updatePositionFromClientX(e.clientX);
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={(e) => {
          setIsDragging(true);
          if (e.touches[0]) updatePositionFromClientX(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) updatePositionFromClientX(e.touches[0].clientX);
        }}
        onTouchEnd={() => setIsDragging(false)}
        className="relative aspect-[16/10] sm:aspect-[16/8] rounded-3xl overflow-hidden border-2 border-[var(--color-border)] select-none cursor-ew-resize bg-[var(--color-bg)]"
      >
        {/* เลเยอร์หลัง (AFTER: แต่งรูปเสร็จ / ใส่ลายน้ำแล้ว — อยู่เต็มกรอบด้านล่าง) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#fff6f9] via-[#fceef2] to-[#f7e8e0] flex items-center justify-center p-6">
          {activeTab === 'retouch' ? (
            <div className="w-full max-w-lg rounded-3xl bg-white/95 border-2 border-[#4a3228] p-5 sm:p-6 shadow-sm flex items-center gap-5 relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#fceef2] border-2 border-[#4a3228] flex flex-col items-center justify-center shrink-0 relative">
                <CuteFlower className="w-7 h-7 mb-1" />
                <span className="text-xs font-bold text-[#4a3228]">GLOW SERUM</span>
                <span className="text-[10px] font-semibold text-[#ec7a9a]">30 ml ♡</span>
                <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-[#ec7a9a] text-white text-[10px] font-bold">
                  ขายดี
                </span>
              </div>
              <div className="space-y-1.5 text-left">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fceef2] text-[10px] font-bold text-[#ec7a9a]">
                  <CuteHeart className="w-2.5 h-2.5" /> ไดคัทเนียน + จัดวางฟอนต์ร้าน
                </span>
                <h4
                  className="text-lg sm:text-xl font-bold text-[#4a3228]"
                  style={{ fontFamily: "'PKZ Baitoey', 'Mali', sans-serif" }}
                >
                  เซรั่มบำรุงผิวใส สูตรอ่อนโยน ♡
                </h4>
                <p className="text-xs text-[#7d5d50]">
                  ซึมไว ไม่เหนียวเหนอะหนะ ผิวอิ่มน้ำตั้งแต่คืนแรก
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#4a3228] text-[#fffaf8] text-xs font-bold">
                    เพียง ฿290.- ส่งฟรี!
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg rounded-3xl bg-white/95 border-2 border-[#4a3228] p-6 shadow-sm text-center relative overflow-hidden">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#7d5d50]">
                  ภาพสินค้าพร้อมลายน้ำโปร่งใส (.PNG) ประจำร้าน
                </span>
                <div className="py-5 px-4 rounded-2xl bg-[#fffaf8] border border-dashed border-[#ec7a9a] flex flex-col items-center justify-center gap-1.5">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#fceef2]/90 border border-[#4a3228] shadow-2xs">
                    <CuteFlower className="w-4 h-4" />
                    <BrandWordmark
                      name="qokhims"
                      dotVariant="heart"
                      className="text-base font-bold text-[#4a3228]"
                    />
                    <span className="text-xs text-[#ec7a9a] font-semibold">Official Store</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#7d5d50]">
                    ห้ามนำรูปภาพไปใช้โดยไม่ได้รับอนุญาต • LINE: @280npxvj
                  </span>
                </div>
              </div>
            </div>
          )}

          <span className="absolute top-3.5 right-3.5 px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold shadow-xs">
            AFTER • หลังแต่งโดย qokhims ♡
          </span>
        </div>

        {/* เลเยอร์หน้า (BEFORE: ภาพดิบก่อนแต่ง — ถูก clip ตาม sliderPos) */}
        <div
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          className="absolute inset-0 bg-[#e9e2de] flex items-center justify-center p-6"
        >
          {activeTab === 'retouch' ? (
            <div className="w-full max-w-lg rounded-3xl bg-[#dcd4cf] border-2 border-[#9e8e85] p-5 sm:p-6 flex items-center gap-5 opacity-90">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#c9bfb8] border border-[#8c7b72] flex flex-col items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-[#5c4d46]">ภาพถ่ายดิบ</span>
                <span className="text-[10px] text-[#6e5e56]">แสงมืด / พื้นหลังรก</span>
              </div>
              <div className="space-y-1.5 text-left">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#c9bfb8] text-[10px] font-semibold text-[#4a3228]">
                  ก่อนแต่งรูป (Raw Photo)
                </span>
                <h4 className="text-base sm:text-lg font-semibold text-[#5c4d46]">
                  ยังไม่ได้ไดคัทและยังไม่มีป้ายข้อมูลสินค้า
                </h4>
                <p className="text-xs text-[#6e5e56]">
                  ลูกค้าต้องทักถามราคาและรายละเอียดเองเพราะยังไม่มีฟอนต์บอกจุดเด่นบนภาพ
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg rounded-3xl bg-[#dcd4cf] border-2 border-[#9e8e85] p-6 text-center opacity-90">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#5c4d46]">
                  ภาพสินค้าเปล่า (ยังไม่มีลายน้ำร้าน)
                </span>
                <div className="py-6 px-4 rounded-2xl bg-[#cec4be] border border-dashed border-[#8c7b72] flex flex-col items-center justify-center gap-1">
                  <span className="text-sm font-bold text-[#5c4d46]">
                    ไม่มีโลโก้หรือลายน้ำระบุชื่อร้าน
                  </span>
                  <span className="text-xs text-[#6e5e56]">
                    เสี่ยงถูกก๊อปรูปไปใช้ และลูกค้าจำชื่อร้านไม่ได้เวลาเห็นภาพผ่านโซเชียล
                  </span>
                </div>
              </div>
            </div>
          )}

          <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-[#4a3228] text-white text-xs font-bold shadow-xs">
            BEFORE • ก่อนแต่ง
          </span>
        </div>

        {/* เส้นแบ่งตรงกลางและปุ่มจับลาก */}
        <div
          style={{ left: `${sliderPos}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-secondary)] z-20 pointer-events-none"
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border-2 border-[var(--color-secondary)] shadow-md flex items-center justify-center text-[var(--color-primary)]">
            <MoveHorizontal className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-secondary-muted)]">
        <span>{activePreset.caption}</span>
        <input
          type="range"
          min={8}
          max={92}
          value={Math.round(sliderPos)}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          aria-label="ปรับสัดส่วนเปรียบเทียบภาพก่อนและหลัง"
          className="w-36 accent-[var(--color-primary)] cursor-pointer"
        />
      </div>
    </div>
  );
};
