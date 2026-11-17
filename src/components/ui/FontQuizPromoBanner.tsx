import React from 'react';
import { Link } from 'react-router-dom';
import { Type, Wand2 } from 'lucide-react';
import { CuteFlower } from './Decorations';
import type { FontItem } from '../../types';

interface FontQuizPromoBannerProps {
  fonts?: FontItem[];
}

export const FontQuizPromoBanner: React.FC<FontQuizPromoBannerProps> = ({ fonts = [] }) => {
  return (
    <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-r from-[var(--color-primary-light)] via-[var(--color-surface)] to-[var(--color-primary-light)]/70 border-2 border-[var(--color-border)] p-6 sm:p-10 lg:p-12 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-border)]">
            <Type className="w-3.5 h-3.5" /> Interactive Font Playground & Quiz
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
            ยังไม่แน่ใจว่าฟอนต์ไหนเข้ากับร้านคุณใช่ไหมคะ? ♡
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-secondary-muted)] leading-relaxed">
            ลองทำแบบทดสอบสั้น ๆ 4 ข้อเพื่อหา “ฟอนต์ประจำตัวของคุณ” พร้อมรับการ์ดผลลัพธ์สุดคิวท์ไปแชร์ต่อ หรือเข้าไปพิมพ์ชื่อร้านของคุณเทียบฟอนต์แบบสด ๆ ได้เลยค่ะ
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/font-quiz"
              className="pkz-order-btn px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-2 shadow-xs"
            >
              <Wand2 className="w-4 h-4" />
              เล่นแบบทดสอบ “ฟอนต์ไหนคือคุณ”
            </Link>
            <Link
              to="/font-tester"
              className="px-6 py-3.5 rounded-full bg-[var(--color-secondary)] text-[var(--color-bg)] text-sm font-semibold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-2 shadow-xs"
            >
              <Type className="w-4 h-4" />
              ทดลองพิมพ์ฟอนต์
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-5 border-2 border-[var(--color-border)] shadow-xs space-y-3 pkz-paper-dots">
            <div className="flex items-center justify-between text-xs text-[var(--color-secondary-muted)] border-b border-dashed border-[var(--color-border)] pb-2">
              <span className="font-bold text-[var(--color-secondary)] flex items-center gap-1">
                <CuteFlower className="w-3.5 h-3.5" />
                ตัวอย่างฟอนต์ยอดฮิต
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold">
                เปรียบเทียบ A/B
              </span>
            </div>
            {fonts.slice(0, 2).map((f, idx) => (
              <div
                key={f.id}
                className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[var(--color-primary)]">
                    ฟอนต์ {idx === 0 ? 'A' : 'B'}: {f.name}
                  </span>
                  <span className="font-semibold text-[var(--color-secondary)]">
                    ฿{f.price}
                  </span>
                </div>
                <p
                  style={{ fontFamily: `'${f.family_name}', 'Mali', sans-serif` }}
                  className="text-base sm:text-lg text-[var(--color-secondary)] truncate"
                >
                  {f.sample_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
