import React from 'react';
import { Link } from 'react-router-dom';
import {
  Instagram,
  MessageCircle,
  Facebook,
  Globe,
  Mail,
  Phone,
  Clock,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import {
  CuteHeart,
  CuteFlower,
  CuteSectionDivider,
} from '../components/ui/Decorations';

export const ContactPage: React.FC = () => {
  const { settings } = useSite();

  const igHandle = (settings.contact_ig || 'qokhims').replace(/^@/, '').trim();
  const lineHandle = (settings.contact_line || '@280npxvj').trim();
  const lineUrlHandle = lineHandle.startsWith('@') ? lineHandle : `@${lineHandle}`;
  const facebookValue = settings.contact_facebook?.trim() || '';
  const tiktokValue = settings.contact_tiktok?.trim() || '';
  const emailValue = settings.contact_email?.trim() || '';
  const phoneValue = settings.contact_phone?.trim() || '';

  const orderSteps = [
    {
      step: '01',
      title: 'เลือกบริการหรือฟอนต์ที่ถูกใจ',
      desc: 'เลือกชมบริการออกแบบหรือทดลองพิมพ์ฟอนต์ของร้านบนหน้าเว็บได้ตามต้องการ',
    },
    {
      step: '02',
      title: 'กรอกบรีฟงานในหน้าสั่งซื้อ',
      desc: 'ระบุรายการ จำนวน และรายละเอียดเพิ่มเติม ระบบจะสรุปยอดประเมินให้อัตโนมัติ',
    },
    {
      step: '03',
      title: 'กดส่งสรุปคำสั่งซื้อเข้า LINE ร้าน',
      desc: `ระบบจะเปิดแชต LINE (${lineHandle}) พร้อมข้อความสรุปเพื่อให้แอดมินแจ้งคิวและยอดโอนค่ะ`,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
      {/* หัวข้อหน้าติดต่อ */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)]">
          <CuteFlower className="w-3.5 h-3.5" /> Contact Us
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-secondary)]">
          ช่องทางติดต่อร้าน {settings.site_name || 'qokhims'}
        </h1>
        <CuteSectionDivider />
        <p className="text-sm sm:text-base text-[var(--color-secondary-muted)]">
          สามารถติดต่อสอบถามคิวงาน ส่งบรีฟงานออกแบบ หรือสั่งซื้อฟอนต์ผ่านช่องทางทางการด้านล่างนี้ได้เลยนะคะ ♡
        </p>
      </div>

      {/* การ์ดช่องทางติดต่อ (ซ่อนช่องทางที่ว่างอัตโนมัติ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {lineHandle && (
          <a
            href={`https://line.me/R/ti/p/${lineUrlHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-3xl border-2 border-[var(--color-border)] hover:border-[#06C755] shadow-2xs hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#06C755] block">
                ช่องทางหลัก (ตอบไวที่สุด)
              </span>
              <h2 className="text-lg font-bold text-[var(--color-secondary)]">
                LINE Official: {lineHandle}
              </h2>
              <p className="text-xs text-[var(--color-secondary-muted)] mt-0.5">
                คลิกเพื่อแอดไลน์และแชตกับแอดมินโดยตรง
              </p>
            </div>
          </a>
        )}

        {igHandle && (
          <a
            href={`https://instagram.com/${igHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-3xl border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] shadow-2xs hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Instagram className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-primary)] block">
                อัปเดตผลงานใหม่ทุกสัปดาห์
              </span>
              <h2 className="text-lg font-bold text-[var(--color-secondary)]">
                Instagram: {igHandle}
              </h2>
              <p className="text-xs text-[var(--color-secondary-muted)] mt-0.5">
                คลิกเพื่อชมตัวอย่างงานป้ายและรีวิวในไอจี
              </p>
            </div>
          </a>
        )}

        {facebookValue && (
          <a
            href={
              facebookValue.startsWith('http')
                ? facebookValue
                : `https://facebook.com/${facebookValue}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-3xl border-2 border-[var(--color-border)] hover:border-blue-500 shadow-2xs hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Facebook className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-blue-600 block">
                Facebook Page
              </span>
              <h2 className="text-lg font-bold text-[var(--color-secondary)]">
                {facebookValue}
              </h2>
              <p className="text-xs text-[var(--color-secondary-muted)] mt-0.5">
                คลิกเพื่อไปที่เพจ Facebook ของร้าน
              </p>
            </div>
          </a>
        )}

        {tiktokValue && (
          <a
            href={
              tiktokValue.startsWith('http')
                ? tiktokValue
                : `https://tiktok.com/@${tiktokValue.replace(/^@/, '')}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-3xl border-2 border-[var(--color-border)] hover:border-[var(--color-secondary)] shadow-2xs hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg)] text-[var(--color-secondary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-primary)] block">
                TikTok Channel
              </span>
              <h2 className="text-lg font-bold text-[var(--color-secondary)]">
                {tiktokValue}
              </h2>
              <p className="text-xs text-[var(--color-secondary-muted)] mt-0.5">
                ชมคลิปเบื้องหลังการออกแบบและรีวิวฟอนต์
              </p>
            </div>
          </a>
        )}

        {emailValue && (
          <a
            href={`mailto:${emailValue}`}
            className="group bg-white p-6 rounded-3xl border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] shadow-2xs hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-primary)] block">
                ติดต่องานผ่านอีเมล
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[var(--color-secondary)]">
                {emailValue}
              </h2>
            </div>
          </a>
        )}

        {phoneValue && (
          <a
            href={`tel:${phoneValue}`}
            className="group bg-white p-6 rounded-3xl border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] shadow-2xs hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Phone className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-primary)] block">
                เบอร์โทรศัพท์
              </span>
              <h2 className="text-lg font-bold text-[var(--color-secondary)]">
                {phoneValue}
              </h2>
            </div>
          </a>
        )}
      </div>

      {/* ขั้นตอนการสั่งงานง่าย ๆ */}
      <div className="bg-white rounded-[2rem] border border-[var(--color-border)] p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
            <CuteHeart className="w-5 h-5 text-[var(--color-primary)]" />
            ขั้นตอนการสั่งงานกับร้าน qokhims
          </h2>
          <span className="text-xs font-medium text-[var(--color-secondary-muted)] inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[var(--color-primary)]" />
            เวลาทำการตอบแชต: 09:30 – 22:00 น. (ทุกวัน)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {orderSteps.map((s) => (
            <div
              key={s.step}
              className="p-5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2"
            >
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
                STEP {s.step}
              </span>
              <h3 className="text-base font-bold text-[var(--color-secondary)]">
                {s.title}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)] leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)]/70">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-secondary)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>มีหน้าสรุปคำสั่งซื้อให้ตรวจสอบก่อนส่งเข้าแชต LINE อัตโนมัติ</span>
          </div>
          <Link
            to="/order"
            className="px-6 py-3 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            ไปที่หน้าสั่งซื้อเลย
          </Link>
        </div>
      </div>
    </div>
  );
};
