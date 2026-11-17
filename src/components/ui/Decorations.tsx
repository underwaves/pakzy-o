import React, { useEffect, useRef, useState } from 'react';

/**
 * หัวใจ SVG Line Art แบบวาดมือ (เส้นน้ำตาลเข้ม เติมชมพูอ่อน)
 */
export const CuteHeart: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path
      d="M14 23.8C13.3 23.4 4.2 17.5 4.2 10.4C4.2 6.8 7 4.4 10.1 4.4C12.1 4.4 13.4 5.5 14 6.9C14.7 5.5 16 4.4 17.9 4.4C21.1 4.4 23.8 6.8 23.8 10.4C23.8 17.5 14.7 23.4 14 23.8Z"
      fill="#f8c8d8"
      stroke="#4a3228"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.2 8.8C7.4 9.6 7.2 10.9 7.4 11.8"
      stroke="#ffffff"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * ดอกไม้ 5 กลีบ SVG Line Art แบบวาดมือ (เส้นน้ำตาลเข้ม เติมชมพูอ่อน เกสรครีมอุ่น)
 */
export const CuteFlower: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path
      d="M14 3.5C16.2 3.5 17.7 5.4 17.1 7.6C19.1 6.7 21.6 7.8 22.1 9.9C22.6 12 20.9 14 18.8 14.1C20.6 15.4 20.9 18 19.3 19.6C17.8 21.1 15.2 20.7 14 18.9C12.8 20.7 10.2 21.1 8.7 19.6C7.1 18 7.4 15.4 9.2 14.1C7.1 14 5.4 12 5.9 9.9C6.4 7.8 8.9 6.7 10.9 7.6C10.3 5.4 11.8 3.5 14 3.5Z"
      fill="#fceef2"
      stroke="#4a3228"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="14"
      cy="12.8"
      r="3.2"
      fill="#f8c8d8"
      stroke="#4a3228"
      strokeWidth="1.7"
    />
  </svg>
);

/**
 * ดวงดาวประกาย SVG Line Art แบบวาดมือ (เส้นน้ำตาลเข้ม เติมชมพูอ่อน)
 */
export const CuteSparkle: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path
      d="M14 3L16.7 10.8L24.8 13.8L16.7 16.9L14 24.8L11.3 16.9L3.2 13.8L11.3 10.8L14 3Z"
      fill="#fceef2"
      stroke="#4a3228"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="14" cy="13.8" r="1.6" fill="#ec7a9a" />
  </svg>
);

export const CuteStar = CuteSparkle;

/**
 * โบว์ริบบิ้น SVG Line Art แบบวาดมือ (เส้นน้ำตาลเข้ม เติมชมพูอ่อน)
 */
export const CuteBow: React.FC<{ className?: string }> = ({
  className = 'w-6 h-6',
}) => (
  <svg
    viewBox="0 0 32 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path
      d="M16 11C12 5 4 4 4 10C4 15 11 15 16 12Z"
      fill="#f8c8d8"
      stroke="#4a3228"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M16 11C20 5 28 4 28 10C28 15 21 15 16 12Z"
      fill="#f8c8d8"
      stroke="#4a3228"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M14.5 13L10 21M17.5 13L22 21"
      stroke="#4a3228"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle
      cx="16"
      cy="11.5"
      r="2.6"
      fill="#fceef2"
      stroke="#4a3228"
      strokeWidth="1.8"
    />
  </svg>
);

/**
 * ดอกเดซี่วาดมือสองสี (กลีบชมพูอ่อน เส้นน้ำตาลเข้ม)
 */
export const CuteDaisy: React.FC<{ className?: string }> = ({
  className = 'w-6 h-6',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="16" cy="8" r="5" fill="#fceef2" stroke="#4a3228" strokeWidth="1.7" />
    <circle cx="23.6" cy="13.5" r="5" fill="#fceef2" stroke="#4a3228" strokeWidth="1.7" />
    <circle cx="20.7" cy="22.5" r="5" fill="#fceef2" stroke="#4a3228" strokeWidth="1.7" />
    <circle cx="11.3" cy="22.5" r="5" fill="#fceef2" stroke="#4a3228" strokeWidth="1.7" />
    <circle cx="8.4" cy="13.5" r="5" fill="#fceef2" stroke="#4a3228" strokeWidth="1.7" />
    <circle cx="16" cy="16" r="4.2" fill="#f8c8d8" stroke="#4a3228" strokeWidth="1.7" />
  </svg>
);

/**
 * ลายเส้น SVG Line Art ประดับมุมการ์ดแบบมินิมอล
 */
export const CardCornerDoodle: React.FC<{
  variant?: 'heart' | 'flower' | 'star';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  corner?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}> = ({ variant = 'flower', position, corner, className = '' }) => {
  const actualPos = corner || position || 'top-right';
  const posClass =
    actualPos === 'top-left'
      ? 'top-3 left-3'
      : actualPos === 'bottom-right'
      ? 'bottom-3 right-3'
      : actualPos === 'bottom-left'
      ? 'bottom-3 left-3'
      : 'top-3 right-3';

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none select-none absolute ${posClass} opacity-75 ${className}`}
    >
      {variant === 'heart' ? (
        <CuteHeart className="w-4 h-4" />
      ) : variant === 'star' ? (
        <CuteSparkle className="w-4 h-4" />
      ) : (
        <CuteFlower className="w-4 h-4" />
      )}
    </span>
  );
};

/**
 * แบรนด์เวิร์ดมาร์กเอกลักษณ์ของร้าน: จุด (.) ใน "pakzy.o" เป็นหัวใจหรือดาวเล็ก ๆ
 * ใช้สม่ำเสมอเป็นโลโก้, ตัวโหลด, ตัวคั่นหัวข้อ และจุดเน้นแบรนด์
 */
export const BrandWordmark: React.FC<{
  name?: string;
  dotVariant?: 'dot' | 'heart' | 'star';
  dotClassName?: string;
  className?: string;
}> = ({
  name = 'pakzy.o',
  dotVariant = 'dot',
  dotClassName = 'w-3.5 h-3.5 mx-0.5 -translate-y-0.5',
  className = '',
}) => {
  const dotIdx = name.indexOf('.');
  if (dotIdx === -1) {
    return (
      <span className={`inline-flex items-baseline ${className}`}>
        <span>{name}</span>
      </span>
    );
  }

  const prefix = name.slice(0, dotIdx);
  const suffix = name.slice(dotIdx + 1);

  return (
    <span className={`inline-flex items-baseline ${className}`} aria-label={name}>
      <span>{prefix}</span>
      {dotVariant === 'dot' ? (
        <span className="text-[var(--color-primary)] font-bold">.</span>
      ) : dotVariant === 'star' ? (
        <CuteSparkle className={dotClassName} />
      ) : (
        <CuteHeart className={dotClassName} />
      )}
      <span>{suffix}</span>
    </span>
  );
};

/**
 * เส้นคั่นหัวข้อแบบมินิมอล ใช้เอกลักษณ์จุดหัวใจ/ดาวของ pakzy.o (ไม่เกิน 3 ไอคอน ไม่รก)
 */
export const CuteSectionDivider: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    className={`flex items-center justify-center gap-2.5 my-3 ${className}`}
    aria-hidden="true"
  >
    <svg width="52" height="8" viewBox="0 0 52 8" fill="none">
      <path
        d="M2 4C14 1.8 26 6.2 38 4C44 2.8 48 4 50 4"
        stroke="#4a3228"
        strokeOpacity="0.32"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
    <CuteSparkle className="w-3.5 h-3.5" />
    <span className="inline-flex items-baseline text-xs font-bold tracking-tight text-[var(--color-secondary-muted)] px-1.5 py-0.5 rounded-full bg-[var(--color-primary-light)]/80 border border-[var(--color-border)]">
      <span>pakzy</span>
      <CuteHeart className="w-3 h-3 mx-0.5 -translate-y-0.5" />
      <span>o</span>
    </span>
    <CuteSparkle className="w-3.5 h-3.5" />
    <svg width="52" height="8" viewBox="0 0 52 8" fill="none">
      <path
        d="M2 4C14 6.2 26 1.8 38 4C44 5.2 48 4 50 4"
        stroke="#4a3228"
        strokeOpacity="0.32"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

/**
 * แถบเทปกระดาษแปะหัวการ์ด (Washi Tape Decoration — วางตรง ไม่เอียง)
 */
export const CuteWashiTape: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none select-none w-24 h-5 rounded-md pkz-washi-tape mx-auto -mt-8 mb-3 shadow-2xs ${className}`}
  />
);

/**
 * สติกเกอร์มาสคอตประจำร้าน pakzy.o (กระต่าย/เมฆหัวใจวาดมือ เส้นน้ำตาลเข้มเติมชมพูอ่อน)
 * สำหรับใช้ใน Loading, Empty state, Error state และหน้า 404
 */
export const PakzyMascotSticker: React.FC<{
  mood?: 'happy' | 'loading' | 'empty' | 'lost';
  className?: string;
}> = ({ mood = 'happy', className = 'w-24 h-24' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* พื้นหลังสติกเกอร์ขอบหยักเบา ๆ */}
    <circle
      cx="60"
      cy="62"
      r="48"
      fill="#fceef2"
      stroke="#4a3228"
      strokeWidth="2.2"
      strokeDasharray="6 4"
    />
    {/* หูกระต่ายวาดมือ */}
    <path
      d="M44 42C40 24 34 16 42 14C49 13 52 26 53 40"
      fill="#ffffff"
      stroke="#4a3228"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M43 36C41 25 38 20 42 19C45 18 47 25 48 35"
      fill="#f8c8d8"
    />
    <path
      d="M76 42C80 24 86 16 78 14C71 13 68 26 67 40"
      fill="#ffffff"
      stroke="#4a3228"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M77 36C79 25 82 20 78 19C75 18 73 25 72 35"
      fill="#f8c8d8"
    />
    {/* หน้ามาสคอตกลมปุ๊กปิ๊ก */}
    <ellipse
      cx="60"
      cy="66"
      rx="32"
      ry="27"
      fill="#ffffff"
      stroke="#4a3228"
      strokeWidth="2.5"
    />
    {/* แก้มชมพูอ่อน */}
    <ellipse cx="41" cy="69" rx="5.5" ry="3.5" fill="#f8c8d8" />
    <ellipse cx="79" cy="69" rx="5.5" ry="3.5" fill="#f8c8d8" />

    {/* ตาและปากตามอารมณ์ */}
    {mood === 'loading' ? (
      <>
        <path
          d="M45 62C47 59 51 59 53 62"
          stroke="#4a3228"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M67 62C69 59 73 59 75 62"
          stroke="#4a3228"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="60" cy="70" r="3" fill="#f8c8d8" stroke="#4a3228" strokeWidth="2" />
      </>
    ) : mood === 'lost' ? (
      <>
        <circle cx="48" cy="61" r="2.6" fill="#4a3228" />
        <circle cx="72" cy="61" r="2.6" fill="#4a3228" />
        <path
          d="M55 72C57 69 63 69 65 72"
          stroke="#4a3228"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <text x="86" y="42" fontSize="16" fontWeight="700" fill="#4a3228">
          ?
        </text>
      </>
    ) : (
      <>
        <circle cx="48" cy="61" r="2.6" fill="#4a3228" />
        <circle cx="72" cy="61" r="2.6" fill="#4a3228" />
        <path
          d="M55 68C57 71.5 60 71.5 60 69C60 71.5 63 71.5 65 68"
          stroke="#4a3228"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}

    {/* หัวใจเล็กบนแก้ม/มุมสติกเกอร์ */}
    <path
      d="M92 30C92 30 85 25 85 20.5C85 18 87 16.5 89 16.5C90.5 16.5 91.5 17.5 92 18.5C92.5 17.5 93.5 16.5 95 16.5C97 16.5 99 18 99 20.5C99 25 92 30 92 30Z"
      fill="#f8c8d8"
      stroke="#4a3228"
      strokeWidth="1.8"
    />
  </svg>
);

/**
 * Scroll Reveal Wrapper (Fade-up ด้วย IntersectionObserver และเคารพ prefers-reduced-motion)
 */
export const RevealOnScroll: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`pkz-reveal ${visible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Signature Marquee Strip:
 * แถบข้อความวิ่งช้า ๆ สีชมพู/น้ำตาล ข้อความเดียวกันเปลี่ยนฟอนต์วนจากฟอนต์ของร้าน
 * ใช้คั่นระหว่างส่วนหลัก (หยุดเมื่อ hover และเมื่อ prefers-reduced-motion)
 */
export const FontMarqueeStrip: React.FC<{
  fonts?: Array<{ id?: number; name: string; family_name: string }>;
  text?: string;
  variant?: 'pink' | 'brown';
}> = ({
  fonts = [],
  text = 'ตัวอักษรคือตัวเอกของร้าน • ออกแบบป้ายมินิมอล & ฟอนต์ลายมือไทยสุดคิวท์',
  variant = 'pink',
}) => {
  const fontList =
    fonts.length > 0
      ? fonts
      : [
          { name: 'PKZ Baitoey', family_name: 'PKZ Baitoey' },
          { name: 'PKZ Choco Pink', family_name: 'PKZ Choco Pink' },
          { name: 'PKZ Milky Star', family_name: 'PKZ Milky Star' },
          { name: 'PKZ Brownie Note', family_name: 'PKZ Brownie Note' },
        ];

  // ทำซ้ำให้ยาวพอสำหรับไร้รอยต่อ (2 ชุดเหมือนกันสำหรับ translate3d(-50%, 0, 0))
  const baseSequence = [...fontList, ...fontList];
  const fullTrack = [...baseSequence, ...baseSequence];

  const isBrown = variant === 'brown';

  return (
    <div
      className={`pkz-marquee-wrap overflow-hidden select-none py-3 border-y transition-colors ${
        isBrown
          ? 'bg-[var(--color-secondary)] text-[var(--color-bg)] border-[var(--color-secondary)]'
          : 'bg-[var(--color-primary-light)]/90 text-[var(--color-secondary)] border-[var(--color-border)]'
      }`}
      aria-label={text}
    >
      <div className="pkz-marquee-track items-center">
        {fullTrack.map((f, idx) => (
          <div
            key={`${f.family_name}-${idx}`}
            className="inline-flex items-center gap-3 px-5 whitespace-nowrap"
          >
            <span
              className="inline-flex items-baseline text-sm sm:text-base font-bold tracking-tight"
              style={{
                fontFamily: `'${f.family_name}', 'Prompt', sans-serif`,
              }}
            >
              <span>pakzy</span>
              {idx % 2 === 0 ? (
                <CuteHeart className="w-3.5 h-3.5 mx-0.5 -translate-y-0.5" />
              ) : (
                <CuteSparkle className="w-3.5 h-3.5 mx-0.5 -translate-y-0.5" />
              )}
              <span>o</span>
              <span className="mx-2 opacity-60">—</span>
              <span>{text}</span>
            </span>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isBrown
                  ? 'bg-white/15 text-[var(--color-bg)] border-white/25'
                  : 'bg-white text-[var(--color-primary)] border-[var(--color-border)]'
              }`}
            >
              ฟอนต์: {f.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * หน้าโหลดแรกเข้า (Initial Splash Loader):
 * ชื่อร้าน "pakzy.o" (จุดเป็นหัวใจ/ดาว) ถูกพิมพ์ทีละตัวพร้อมเปลี่ยนฟอนต์ แล้วนิ่ง
 * ไม่เกิน 1.5 วินาที แสดงครั้งเดียวต่อ session และกดข้ามได้ทันที
 */
export const InitialSplashLoader: React.FC<{
  siteName?: string;
  fonts?: Array<{ name: string; family_name: string }>;
}> = ({ siteName = 'pakzy.o', fonts = [] }) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    try {
      return sessionStorage.getItem('pkz_splash_seen') !== '1';
    } catch {
      return false;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);
  const [charCount, setCharCount] = useState(1);
  const [fontIdx, setFontIdx] = useState(0);

  const fontFamilies =
    fonts.length > 0
      ? fonts.map((f) => `'${f.family_name}', 'Prompt', sans-serif`)
      : [
          "'PKZ Baitoey', 'Mali', sans-serif",
          "'PKZ Choco Pink', 'Kodchasan', sans-serif",
          "'PKZ Milky Star', 'Sriracha', sans-serif",
          "'PKZ Brownie Note', 'Itim', sans-serif",
          "'Prompt', sans-serif",
        ];

  const finishSplash = () => {
    try {
      sessionStorage.setItem('pkz_splash_seen', '1');
    } catch {
      // ignore storage errors
    }
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
    }, 220);
  };

  useEffect(() => {
    if (!visible) return;

    const totalChars = siteName.length;
    const stepMs = Math.max(95, Math.floor(720 / totalChars));

    const typingInterval = window.setInterval(() => {
      setCharCount((prev) => {
        if (prev < totalChars) {
          setFontIdx((f) => (f + 1) % fontFamilies.length);
          return prev + 1;
        }
        return prev;
      });
    }, stepMs);

    // จบภายใน ~1.25 วินาที (ไม่เกิน 1.5 วินาทีตามโจทย์)
    const doneTimer = window.setTimeout(() => {
      finishSplash();
    }, 1250);

    return () => {
      window.clearInterval(typingInterval);
      window.clearTimeout(doneTimer);
    };
  }, [visible, siteName.length, fontFamilies.length]);

  if (!visible) return null;

  const typedSlice = siteName.slice(0, charCount);
  const settled = charCount >= siteName.length;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[var(--color-bg)] flex flex-col items-center justify-center p-6 transition-opacity duration-200 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <img
          src="/pakzy-profile.png"
          alt="pakzy.o"
          className="w-16 h-16 rounded-full object-cover border-2 border-[var(--color-border)] shadow-xs"
        />

        <div
          className="text-4xl sm:text-5xl font-bold text-[var(--color-secondary)] tracking-tight min-h-[3.5rem] flex items-center justify-center"
          style={{
            fontFamily: settled ? "'Prompt', sans-serif" : fontFamilies[fontIdx],
          }}
        >
          <BrandWordmark
            name={typedSlice}
            dotVariant="dot"
            dotClassName="w-6 h-6 mx-1 -translate-y-1"
          />
          {!settled && (
            <span className="inline-block w-0.5 h-9 bg-[var(--color-primary)] ml-1 animate-pulse" />
          )}
        </div>

        <p className="text-xs font-medium text-[var(--color-secondary-muted)]">
          ตัวอักษรคือตัวเอกของร้าน ♡
        </p>

        <button
          type="button"
          onClick={finishSplash}
          className="mt-2 px-4 py-1.5 rounded-full text-xs font-semibold text-[var(--color-secondary-muted)] hover:text-[var(--color-primary)] bg-[var(--color-primary-light)]/70 border border-[var(--color-border)] transition cursor-pointer"
        >
          ข้าม (Skip) →
        </button>
      </div>
    </div>
  );
};
