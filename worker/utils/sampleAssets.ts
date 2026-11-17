/**
 * สร้างไฟล์ภาพ SVG ตัวอย่าง (โลโก้, รูปสินค้า, รูปตัวอย่างฟอนต์) และเตรียมไฟล์ฟอนต์เริ่มต้นใน R2
 * ออกแบบให้มีระยะขอบ (Padding) โปร่งสบายตา ลายเส้นวาดมือสีน้ำตาลเข้มเติมชมพูอ่อน ไม่ชนขอบการ์ดและไม่ทับป้ายกำกับ
 */

const SEED_SVGS: Record<string, string> = {
  'seed/logo-pakzy.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
    <defs>
      <linearGradient id="pkzGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fde8ef"/>
        <stop offset="100%" stop-color="#f9d2df"/>
      </linearGradient>
    </defs>
    <rect x="4" y="8" width="232" height="64" rx="32" fill="url(#pkzGrad)" stroke="#4a3228" stroke-width="2"/>
    <circle cx="42" cy="40" r="22" fill="#7c564a" stroke="#4a3228" stroke-width="1.8"/>
    <g transform="translate(42,40.5) rotate(-14) scale(0.36)">
      <g fill="#fcb7e8" stroke="#624136" stroke-width="1.2">
        <ellipse cx="0" cy="-20" rx="11.5" ry="20" transform="rotate(0)" />
        <ellipse cx="0" cy="-19" rx="12" ry="19" transform="rotate(56)" />
        <ellipse cx="0" cy="-21" rx="12" ry="21" transform="rotate(116)" />
        <ellipse cx="0" cy="-19" rx="11" ry="19" transform="rotate(174)" />
        <ellipse cx="0" cy="-22" rx="11.5" ry="22" transform="rotate(228)" />
        <ellipse cx="0" cy="-19" rx="12" ry="19" transform="rotate(292)" />
      </g>
      <circle cx="0" cy="0" r="11" fill="#fcb7e8" />
      <ellipse cx="1" cy="1" rx="5.5" ry="7.2" fill="#fff6bd" transform="rotate(12)" />
    </g>
    <text x="76" y="47" font-family="Prompt, Kanit, sans-serif" font-size="27" font-weight="700" fill="#4a3228">pakzy.o</text>
    <circle cx="192" cy="32" r="5" fill="#fcb7e8" stroke="#4a3228" stroke-width="1.5"/>
    <path d="M210 42 L212 47 L217 49 L212 51 L210 56 L208 51 L203 49 L208 47 Z" fill="#fceef2" stroke="#4a3228" stroke-width="1.4"/>
  </svg>`,

  'seed/product-banner.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#fff7f9"/>
    <circle cx="100" cy="90" r="120" fill="#fce4ec" opacity="0.65"/>
    <circle cx="710" cy="510" r="140" fill="#f5e6df" opacity="0.75"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <rect x="70" y="62" width="660" height="476" rx="28" fill="none" stroke="#f3c6d3" stroke-width="1.5" stroke-dasharray="6 6"/>
    <rect x="270" y="92" width="260" height="38" rx="19" fill="#fceef2" stroke="#4a3228" stroke-width="1.6"/>
    <text x="400" y="117" text-anchor="middle" font-family="Prompt, sans-serif" font-size="16" font-weight="700" fill="#4a3228">♥ ป้ายบัญชีแม่ค้าออนไลน์</text>
    <text x="400" y="195" text-anchor="middle" font-family="Prompt, sans-serif" font-size="33" font-weight="700" fill="#4a3228">ออกแบบป้ายบัญชี &amp; แบนเนอร์</text>
    <text x="400" y="238" text-anchor="middle" font-family="Prompt, sans-serif" font-size="19" fill="#7d5d50">โทนชมพู-น้ำตาล มินิมอล อ่านง่าย เพียงแจ้งข้อมูลร้าน</text>
    <rect x="145" y="276" width="510" height="175" rx="24" fill="#fffaf8" stroke="#4a3228" stroke-width="2"/>
    <circle cx="235" cy="364" r="44" fill="#fceef2" stroke="#4a3228" stroke-width="2"/>
    <text x="235" y="371" text-anchor="middle" font-family="Prompt, sans-serif" font-size="20" font-weight="700" fill="#ec7a9a">BANK</text>
    <text x="310" y="340" font-family="Prompt, sans-serif" font-size="22" font-weight="700" fill="#4a3228">123-4-56789-0</text>
    <text x="310" y="374" font-family="Prompt, sans-serif" font-size="17" fill="#7d5d50">ชื่อบัญชี: ร้าน pakzy.o สตูดิโอ</text>
    <text x="310" y="406" font-family="Prompt, sans-serif" font-size="15" font-weight="600" fill="#ec7a9a">✿ พร้อมใส่ QR Code รับเงินสุดคิวท์</text>
  </svg>`,

  'seed/product-banner-2.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#fdf8f5"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <text x="400" y="165" text-anchor="middle" font-family="Prompt, sans-serif" font-size="31" font-weight="700" fill="#4a3228">ตัวอย่างป้ายแจ้งเลขพัสดุ &amp; โปรโมชัน</text>
    <text x="400" y="212" text-anchor="middle" font-family="Prompt, sans-serif" font-size="18" fill="#7d5d50">ปรับขนาดได้ตามต้องการ ทั้งจัตุรัส 1:1 และสตอรี่ 9:16</text>
    <rect x="140" y="255" width="235" height="200" rx="24" fill="#fceef2" stroke="#4a3228" stroke-width="2"/>
    <text x="257" y="362" text-anchor="middle" font-family="Prompt, sans-serif" font-size="21" font-weight="700" fill="#4a3228">ป้ายแจ้งโอน ♥</text>
    <rect x="425" y="255" width="235" height="200" rx="24" fill="#f7ede8" stroke="#4a3228" stroke-width="2"/>
    <text x="542" y="362" text-anchor="middle" font-family="Prompt, sans-serif" font-size="21" font-weight="700" fill="#4a3228">ป้ายรีวิวลูกค้า ✿</text>
  </svg>`,

  'seed/product-richmenu.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#fff8fa"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <text x="400" y="132" text-anchor="middle" font-family="Prompt, sans-serif" font-size="31" font-weight="700" fill="#4a3228">LINE OA Rich Menu Design</text>
    <text x="400" y="170" text-anchor="middle" font-family="Prompt, sans-serif" font-size="18" fill="#7d5d50">เมนูหน้าแชตแยกหมวดหมู่ชัดเจน น่ารักน่ากด เพิ่มยอดขาย</text>
    <g transform="translate(135, 205)">
      <rect x="0" y="0" width="165" height="125" rx="20" fill="#fceef2" stroke="#4a3228" stroke-width="2"/>
      <circle cx="82" cy="48" r="16" fill="#ffffff" stroke="#4a3228" stroke-width="1.6"/>
      <text x="82" y="54" text-anchor="middle" font-size="16" fill="#ec7a9a">✿</text>
      <text x="82" y="94" text-anchor="middle" font-family="Prompt, sans-serif" font-size="17" font-weight="700" fill="#4a3228">ดูสินค้าทั้งหมด</text>

      <rect x="182" y="0" width="165" height="125" rx="20" fill="#fffaf8" stroke="#4a3228" stroke-width="2"/>
      <circle cx="264" cy="48" r="16" fill="#fceef2" stroke="#4a3228" stroke-width="1.6"/>
      <text x="264" y="54" text-anchor="middle" font-size="16" fill="#4a3228">✦</text>
      <text x="264" y="94" text-anchor="middle" font-family="Prompt, sans-serif" font-size="17" font-weight="700" fill="#4a3228">โปรโมชันเดือนนี้</text>

      <rect x="364" y="0" width="165" height="125" rx="20" fill="#fceef2" stroke="#4a3228" stroke-width="2"/>
      <circle cx="446" cy="48" r="16" fill="#ffffff" stroke="#4a3228" stroke-width="1.6"/>
      <text x="446" y="54" text-anchor="middle" font-size="16" fill="#ec7a9a">♥</text>
      <text x="446" y="94" text-anchor="middle" font-family="Prompt, sans-serif" font-size="17" font-weight="700" fill="#4a3228">รีวิวจากลูกค้า</text>

      <rect x="0" y="142" width="165" height="125" rx="20" fill="#f7ede8" stroke="#4a3228" stroke-width="2"/>
      <circle cx="82" cy="190" r="16" fill="#ffffff" stroke="#4a3228" stroke-width="1.6"/>
      <text x="82" y="196" text-anchor="middle" font-size="15" font-weight="700" fill="#4a3228">01</text>
      <text x="82" y="236" text-anchor="middle" font-family="Prompt, sans-serif" font-size="17" font-weight="700" fill="#4a3228">วิธีสั่งซื้อ</text>

      <rect x="182" y="142" width="165" height="125" rx="20" fill="#fceef2" stroke="#4a3228" stroke-width="2"/>
      <circle cx="264" cy="190" r="16" fill="#ffffff" stroke="#4a3228" stroke-width="1.6"/>
      <text x="264" y="196" text-anchor="middle" font-size="15" font-weight="700" fill="#ec7a9a">02</text>
      <text x="264" y="236" text-anchor="middle" font-family="Prompt, sans-serif" font-size="17" font-weight="700" fill="#4a3228">เช็กเลขพัสดุ</text>

      <rect x="364" y="142" width="165" height="125" rx="20" fill="#f7ede8" stroke="#4a3228" stroke-width="2"/>
      <circle cx="446" cy="190" r="16" fill="#ffffff" stroke="#4a3228" stroke-width="1.6"/>
      <text x="446" y="196" text-anchor="middle" font-size="15" font-weight="700" fill="#4a3228">LINE</text>
      <text x="446" y="236" text-anchor="middle" font-family="Prompt, sans-serif" font-size="17" font-weight="700" fill="#4a3228">คุยกับแอดมิน</text>
    </g>
  </svg>`,

  'seed/product-retouch.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#fffaf8"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <circle cx="255" cy="310" r="120" fill="#fceef2" stroke="#4a3228" stroke-width="2"/>
    <rect x="215" y="220" width="80" height="175" rx="24" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <rect x="233" y="190" width="44" height="30" rx="8" fill="#f8c8d8" stroke="#4a3228" stroke-width="2"/>
    <text x="255" y="315" text-anchor="middle" font-family="Prompt, sans-serif" font-size="16" font-weight="700" fill="#4a3228">GLOW</text>
    <text x="415" y="225" font-family="Prompt, sans-serif" font-size="30" font-weight="700" fill="#4a3228">แต่งรูปสินค้ามินิมอล</text>
    <text x="415" y="275" font-family="Prompt, sans-serif" font-size="19" fill="#7d5d50">✦ ไดคัทพื้นหลังเนียนกริบ</text>
    <text x="415" y="315" font-family="Prompt, sans-serif" font-size="19" fill="#7d5d50">✦ ปรับแสงละมุนคุมโทนไอจี</text>
    <text x="415" y="355" font-family="Prompt, sans-serif" font-size="19" fill="#7d5d50">✦ ใส่ข้อความจุดเด่นอ่านง่าย</text>
    <text x="415" y="395" font-family="Prompt, sans-serif" font-size="19" font-weight="600" fill="#ec7a9a">♥ ตกแต่งดอกไม้ &amp; หัวใจพองาม</text>
  </svg>`,

  'seed/product-watermark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#fdf6f8"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <ellipse cx="400" cy="270" rx="225" ry="112" fill="#fffaf8" stroke="#4a3228" stroke-width="2.5" stroke-dasharray="10 6"/>
    <text x="400" y="262" text-anchor="middle" font-family="Prompt, sans-serif" font-size="38" font-weight="700" fill="#4a3228">My Sweet Shop</text>
    <text x="400" y="308" text-anchor="middle" font-family="Prompt, sans-serif" font-size="18" font-weight="600" fill="#ec7a9a">✿ HANDMADE &amp; BAKERY STUDIO ✿</text>
    <text x="400" y="455" text-anchor="middle" font-family="Prompt, sans-serif" font-size="22" font-weight="700" fill="#4a3228">ออกแบบลายน้ำ &amp; โลโก้ตัวอักษรพื้นหลังใส (.PNG)</text>
  </svg>`,

  'seed/font-baitoey.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#fff5f8"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <rect x="280" y="96" width="240" height="38" rx="19" fill="#fceef2" stroke="#4a3228" stroke-width="1.6"/>
    <text x="400" y="121" text-anchor="middle" font-family="Prompt, sans-serif" font-size="15" font-weight="700" fill="#4a3228">✿ PKZ FONT SERIES 01</text>
    <text x="400" y="210" text-anchor="middle" font-family="Mali, Prompt, sans-serif" font-size="38" font-weight="700" fill="#4a3228">PKZ Baitoey (ใบเตย)</text>
    <text x="400" y="265" text-anchor="middle" font-family="Mali, Prompt, sans-serif" font-size="22" font-weight="600" fill="#ec7a9a">ฟอนต์ลายมือกลมปุ๊กปิ๊ก อ่านง่าย สระไม่ลอย ♡</text>
    <rect x="115" y="315" width="570" height="160" rx="24" fill="#fffaf8" stroke="#4a3228" stroke-width="1.8" stroke-dasharray="6 5"/>
    <text x="400" y="378" text-anchor="middle" font-family="Mali, Prompt, sans-serif" font-size="22" font-weight="600" fill="#4a3228">"ฝากร้านหน่อยนะคะ ขอบคุณทุกออเดอร์เลยน้า"</text>
    <text x="400" y="428" text-anchor="middle" font-family="Mali, Prompt, sans-serif" font-size="20" fill="#7d5d50">Aa Bb Cc 1234567890 ๑๒๓๔๕ ♥ ✿ ✦</text>
  </svg>`,

  'seed/font-chocopink.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#fdf8f5"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <rect x="280" y="96" width="240" height="38" rx="19" fill="#f7ede8" stroke="#4a3228" stroke-width="1.6"/>
    <text x="400" y="121" text-anchor="middle" font-family="Prompt, sans-serif" font-size="15" font-weight="700" fill="#4a3228">✦ PKZ FONT SERIES 02</text>
    <text x="400" y="210" text-anchor="middle" font-family="Itim, Prompt, sans-serif" font-size="36" font-weight="700" fill="#4a3228">PKZ Choco Pink (ช็อกโกพิงค์)</text>
    <text x="400" y="265" text-anchor="middle" font-family="Itim, Prompt, sans-serif" font-size="22" font-weight="600" fill="#ec7a9a">ลายมือเส้นคลีนมินิมอล สไตล์คาเฟ่เกาหลี ✿</text>
    <rect x="115" y="315" width="570" height="160" rx="24" fill="#fffaf8" stroke="#4a3228" stroke-width="1.8" stroke-dasharray="6 5"/>
    <text x="400" y="378" text-anchor="middle" font-family="Itim, Prompt, sans-serif" font-size="22" font-weight="600" fill="#4a3228">"เมนูใหม่ประจำสัปดาห์ หอมกรุ่นจากเตาทุกวัน"</text>
    <text x="400" y="428" text-anchor="middle" font-family="Itim, Prompt, sans-serif" font-size="20" fill="#7d5d50">Sweet Cafe &amp; Bakery Studio 2026 ♡</text>
  </svg>`,

  'seed/font-milkystar.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#fff7fa"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <rect x="280" y="96" width="240" height="38" rx="19" fill="#fceef2" stroke="#4a3228" stroke-width="1.6"/>
    <text x="400" y="121" text-anchor="middle" font-family="Prompt, sans-serif" font-size="15" font-weight="700" fill="#4a3228">★ PKZ FONT SERIES 03</text>
    <text x="400" y="210" text-anchor="middle" font-family="Sriracha, Prompt, sans-serif" font-size="36" font-weight="700" fill="#4a3228">PKZ Milky Star (มิลกี้สตาร์)</text>
    <text x="400" y="265" text-anchor="middle" font-family="Sriracha, Prompt, sans-serif" font-size="22" font-weight="600" fill="#ec7a9a">ฟอนต์พาดหัวสดใส โดดเด่นสะดุดตา ☆</text>
    <rect x="115" y="315" width="570" height="160" rx="24" fill="#fffaf8" stroke="#4a3228" stroke-width="1.8" stroke-dasharray="6 5"/>
    <text x="400" y="378" text-anchor="middle" font-family="Sriracha, Prompt, sans-serif" font-size="22" font-weight="600" fill="#4a3228">"โปรโมชันลดพิเศษ ส่งฟรีทุกออเดอร์วันนี้!"</text>
    <text x="400" y="428" text-anchor="middle" font-family="Sriracha, Prompt, sans-serif" font-size="20" fill="#7d5d50">Special Promotion 50% OFF ✦</text>
  </svg>`,

  'seed/font-brownienote.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#faf5f2"/>
    <rect x="56" y="48" width="688" height="504" rx="36" fill="#ffffff" stroke="#4a3228" stroke-width="2.5"/>
    <rect x="280" y="96" width="240" height="38" rx="19" fill="#f7ede8" stroke="#4a3228" stroke-width="1.6"/>
    <text x="400" y="121" text-anchor="middle" font-family="Prompt, sans-serif" font-size="15" font-weight="700" fill="#4a3228">♥ PKZ FONT SERIES 04</text>
    <text x="400" y="210" text-anchor="middle" font-family="Kodchasan, Prompt, sans-serif" font-size="34" font-weight="700" fill="#4a3228">PKZ Brownie Note (บราวนี่โน้ต)</text>
    <text x="400" y="265" text-anchor="middle" font-family="Kodchasan, Prompt, sans-serif" font-size="22" font-weight="600" fill="#ec7a9a">ลายมือจดสรุปเรียบร้อย อ่านสบายตาทุกย่อหน้า</text>
    <rect x="115" y="315" width="570" height="160" rx="24" fill="#fffaf8" stroke="#4a3228" stroke-width="1.8" stroke-dasharray="6 5"/>
    <text x="400" y="378" text-anchor="middle" font-family="Kodchasan, Prompt, sans-serif" font-size="21" font-weight="600" fill="#4a3228">"แจ้งเลขพัสดุและรายละเอียดการดูแลรักษาสินค้า"</text>
    <text x="400" y="428" text-anchor="middle" font-family="Kodchasan, Prompt, sans-serif" font-size="19" fill="#7d5d50">Thank you for supporting our small business ♡</text>
  </svg>`,
};

/**
 * แหล่งไฟล์ฟอนต์ภาษาไทย (.ttf) สำหรับสร้างไฟล์เริ่มต้นใส่ใน R2 อัตโนมัติเมื่อเรียกใช้งานครั้งแรก
 * ทำให้ฟอนต์ตัวอย่างทั้ง 4 แบบโหลดผ่าน Worker R2 Route (/r2/fonts/*) ด้วย @font-face ได้จริงทันที
 */
const SEED_FONT_SOURCES: Record<string, string> = {
  'fonts/pkz-baitoey.woff2':
    'https://raw.githubusercontent.com/google/fonts/main/ofl/mali/Mali-Regular.ttf',
  'fonts/pkz-chocopink.woff2':
    'https://raw.githubusercontent.com/google/fonts/main/ofl/itim/Itim-Regular.ttf',
  'fonts/pkz-milkystar.woff2':
    'https://raw.githubusercontent.com/google/fonts/main/ofl/sriracha/Sriracha-Regular.ttf',
  'fonts/pkz-brownienote.woff2':
    'https://raw.githubusercontent.com/google/fonts/main/ofl/kodchasan/Kodchasan-Regular.ttf',
};

export function getSeedSvg(key: string): string | null {
  return SEED_SVGS[key] ?? null;
}

export function getSeedFontSourceUrl(key: string): string | null {
  return SEED_FONT_SOURCES[key] ?? null;
}
