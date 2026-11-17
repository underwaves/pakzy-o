import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Gift,
  Sparkles,
  Search,
  UserPlus,
  Download,
  Copy,
  Check,
  MessageCircle,
  Clock,
  History,
  ShieldCheck,
  Award,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type {
  LoyaltyRules,
  RewardItem,
  MemberProfile,
  PointsLedgerItem,
  RedemptionItem,
} from '../types';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import {
  CuteHeart,
  CuteFlower,
  CuteStar,
  CuteSparkle,
  CuteSectionDivider,
  CardCornerDoodle,
  CuteWashiTape,
  BrandWordmark,
} from '../components/ui/Decorations';
import { LoadingState, EmptyState } from '../components/ui/States';

interface ExpiringBatch {
  id: number;
  points: number;
  expires_at: string;
  created_at: string;
}

interface RedemptionSuccessResult {
  id: number;
  reward_id: number;
  reward_name: string;
  points_spent: number;
  remaining_points: number;
  status: string;
  summary_text: string;
  line_id: string;
  line_deep_link: string;
}

const LEDGER_TYPE_BADGE: Record<
  PointsLedgerItem['type'],
  { label: string; className: string }
> = {
  earn: { label: 'ได้รับแต้มจากออเดอร์', className: 'bg-emerald-100 text-emerald-800' },
  bonus: { label: 'โบนัสพิเศษ', className: 'bg-pink-100 text-pink-800' },
  redeem: { label: 'แลกของรางวัล', className: 'bg-amber-100 text-amber-800' },
  adjust: { label: 'ปรับปรุงยอดแต้ม', className: 'bg-blue-100 text-blue-800' },
  expire: { label: 'แต้มหมดอายุ', className: 'bg-gray-100 text-gray-600' },
};

const REDEMPTION_STATUS_BADGE: Record<
  RedemptionItem['status'],
  { label: string; className: string }
> = {
  pending: { label: 'รอแอดมินยืนยันใน LINE', className: 'bg-amber-100 text-amber-800' },
  fulfilled: { label: 'รับของรางวัลแล้ว', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ยกเลิก / คืนแต้มแล้ว', className: 'bg-gray-100 text-gray-600' },
};

export const PointsPage: React.FC = () => {
  const { settings } = useSite();
  const { showToast } = useToast();

  const [rules, setRules] = useState<LoyaltyRules>({
    loyalty_enabled: settings.loyalty_enabled !== 'false',
    baht_per_point: Number(settings.baht_per_point) || 10,
    points_expiry_months: Number(settings.points_expiry_months) || 0,
    review_bonus_points: Number(settings.review_bonus_points) || 0,
    contact_line: settings.contact_line || '@280npxvj',
  });
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // แท็บระหว่าง "เช็กแต้ม / บัตรสะสมแต้ม" กับ "สมัครรับรหัสสมาชิกใหม่"
  const [activeTab, setActiveTab] = useState<'lookup' | 'register'>('lookup');

  // ฟอร์มเช็กแต้ม
  const [lookupCode, setLookupCode] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('qokhims_member_code') ||
        localStorage.getItem('pakzy_member_code') ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [lookupPin, setLookupPin] = useState<string>('');
  const [lookingUp, setLookingUp] = useState(false);

  // ข้อมูลสมาชิกที่เปิดดูอยู่ (เก็บ PIN ไว้ใน state เฉพาะ session ปัจจุบันเพื่อใช้กดแลกของรางวัล ไม่เก็บลง localStorage)
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [sessionPin, setSessionPin] = useState<string>('');
  const [ledger, setLedger] = useState<PointsLedgerItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<ExpiringBatch[]>([]);

  // ฟอร์มสมัครสมาชิก
  const [regName, setRegName] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConsent, setRegConsent] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [newlyRegisteredMember, setNewlyRegisteredMember] = useState<MemberProfile | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal ยืนยันแลกของรางวัล & ผลลัพธ์การแลก
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState<RewardItem | null>(null);
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const [redeemPinInput, setRedeemPinInput] = useState('');
  const [redeemNoteInput, setRedeemNoteInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<RedemptionSuccessResult | null>(null);
  const [copiedRedemptionSummary, setCopiedRedemptionSummary] = useState(false);

  const fetchRewardsAndRules = async () => {
    setLoadingInitial(true);
    try {
      const res = await fetch('/api/rewards');
      if (res.ok) {
        const data = await res.json();
        if (data.rules) setRules(data.rules);
        setRewards(data.rewards || []);
      }
    } catch {
      // fallback to site settings
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchRewardsAndRules();
  }, []);

  const isLoyaltyEnabled =
    settings.loyalty_enabled !== 'false' &&
    settings.loyalty_enabled !== '0' &&
    rules.loyalty_enabled;

  // ฟังก์ชันเช็กแต้มและประวัติ
  const handleLookup = async (e?: React.FormEvent, overrideCode?: string, overridePin?: string) => {
    if (e) e.preventDefault();
    const code = (overrideCode ?? lookupCode).trim().toUpperCase();
    const pin = (overridePin ?? lookupPin).trim();

    if (code.length < 4 || !/^\d{4,6}$/.test(pin)) {
      showToast('กรุณากรอกรหัสสมาชิก (เช่น PZ-XXXX) และรหัส PIN 4–6 หลักค่ะ', 'error');
      return;
    }

    setLookingUp(true);
    try {
      const res = await fetch('/api/points/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_code: code, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถตรวจสอบข้อมูลสมาชิกได้');
      }

      setMember(data.member);
      setSessionPin(pin);
      setLedger(data.ledger || []);
      setRedemptions(data.redemptions || []);
      setExpiringSoon(data.expiring_soon || []);
      if (data.rules) setRules(data.rules);

      try {
        localStorage.setItem('qokhims_member_code', data.member.member_code);
        localStorage.setItem('pakzy_member_code', data.member.member_code);
      } catch {
        // ignore
      }

      if (!overrideCode) {
        showToast(`ยินดีต้อนรับคุณ ${data.member.display_name} ค่ะ ♡`, 'success');
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'รหัสสมาชิกหรือรหัส PIN ไม่ถูกต้องค่ะ',
        'error'
      );
    } finally {
      setLookingUp(false);
    }
  };

  // ฟังก์ชันสมัครรับรหัสสมาชิกใหม่
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regName.trim().length < 2) {
      showToast('กรุณากรอกชื่อเล่นอย่างน้อย 2 ตัวอักษรค่ะ', 'error');
      return;
    }
    if (regContact.trim().length < 2) {
      showToast('กรุณากรอกช่องทางติดต่อ (LINE / IG / เบอร์โทร) ค่ะ', 'error');
      return;
    }
    if (!/^\d{4,6}$/.test(regPin.trim())) {
      showToast('กรุณาตั้งรหัส PIN เป็นตัวเลข 4 ถึง 6 หลักค่ะ', 'error');
      return;
    }
    if (!regConsent) {
      showToast('กรุณาติ๊กยินยอมให้ร้านเก็บข้อมูลเพื่อใช้สะสมแต้มค่ะ', 'error');
      return;
    }

    setRegistering(true);
    try {
      const res = await fetch('/api/points/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: regName.trim(),
          contact: regContact.trim(),
          pin: regPin.trim(),
          consent: regConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'สมัครสมาชิกไม่สำเร็จ');
      }

      const createdMember: MemberProfile = data.member;
      const usedPin = regPin.trim();

      setNewlyRegisteredMember(createdMember);
      setMember(createdMember);
      setLookupCode(createdMember.member_code);
      setLookupPin(usedPin);
      setSessionPin(usedPin);
      setLedger([]);
      setRedemptions([]);
      setExpiringSoon([]);

      try {
        localStorage.setItem('qokhims_member_code', createdMember.member_code);
        localStorage.setItem('pakzy_member_code', createdMember.member_code);
      } catch {
        // ignore
      }

      setRegName('');
      setRegContact('');
      setRegPin('');
      setRegConsent(false);
      showToast(data.message || 'สมัครรับรหัสสมาชิกสำเร็จแล้วค่ะ ♡', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสมัคร', 'error');
    } finally {
      setRegistering(false);
    }
  };

  // เปิดหน้าต่างยืนยันแลกของรางวัล
  const handleOpenRedeemModal = (reward: RewardItem) => {
    setRedemptionResult(null);
    setSelectedRewardToRedeem(reward);
    setRedeemCodeInput(member?.member_code || lookupCode || '');
    setRedeemPinInput(sessionPin || '');
    setRedeemNoteInput('');
  };

  // ยืนยันแลกของรางวัล
  const handleConfirmRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRewardToRedeem) return;

    const code = redeemCodeInput.trim().toUpperCase();
    const pin = redeemPinInput.trim();
    if (code.length < 4 || !/^\d{4,6}$/.test(pin)) {
      showToast('กรุณากรอกรหัสสมาชิกและรหัส PIN 4–6 หลักเพื่อยืนยันการแลกของรางวัลค่ะ', 'error');
      return;
    }

    setRedeeming(true);
    try {
      const res = await fetch('/api/points/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_code: code,
          pin,
          reward_id: selectedRewardToRedeem.id,
          note: redeemNoteInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถแลกของรางวัลได้');
      }

      setRedemptionResult(data.redemption);
      await fetchRewardsAndRules();
      await handleLookup(undefined, code, pin);

      if (data.redemption?.summary_text && navigator.clipboard) {
        navigator.clipboard
          .writeText(data.redemption.summary_text)
          .then(() => setCopiedRedemptionSummary(true))
          .catch(() => {});
      }

      showToast(
        'แลกของรางวัลสำเร็จและคัดลอกข้อความสรุปแล้ว กำลังเปิด LINE ร้านค่ะ ♡',
        'success'
      );

      // เปิดแชต LINE ร้าน (@280npxvj) อัตโนมัติเหมือน flow สั่งซื้อ
      const rawLine = (data.redemption?.line_id || rules.contact_line || '@280npxvj').trim();
      const targetUrl = /^https?:\/\//i.test(rawLine)
        ? rawLine
        : `https://line.me/R/ti/p/${rawLine.startsWith('@') ? rawLine : `@${rawLine}`}`;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'แลกของรางวัลไม่สำเร็จ', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyMemberCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      showToast(`คัดลอกรหัสสมาชิก ${code} แล้วค่ะ ♡`, 'success');
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      showToast('กรุณาจดรหัสสมาชิกไว้ใช้งานนะคะ', 'info');
    }
  };

  // สร้างและบันทึกรูปบัตรสะสมแต้ม (Stamp Card .PNG) ด้วย HTML5 Canvas
  const handleDownloadStampCardImage = (targetMember: MemberProfile) => {
    const canvas = document.createElement('canvas');
    const width = 800;
    const height = 500;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // พื้นหลังครีมชมพูอ่อน
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#fceef2');
    grad.addColorStop(0.5, '#fffaf8');
    grad.addColorStop(1, '#f8e5ec');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // กรอบการ์ดขาวขอบน้ำตาล
    const cx = 36;
    const cy = 32;
    const cw = width - 72;
    const ch = height - 64;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4a3228';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cw, ch, 28);
    ctx.fill();
    ctx.stroke();

    // แถบหัวบัตรสีชมพูพาสเทล
    ctx.fillStyle = '#fceef2';
    ctx.beginPath();
    ctx.roundRect(cx + 20, cy + 20, cw - 40, 100, 20);
    ctx.fill();

    ctx.fillStyle = '#ec7a9a';
    ctx.font = 'bold 28px "Prompt", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`✿ ${settings.site_name || 'qokhims'} — LOYALTY STAMP CARD`, cx + 42, cy + 64);

    ctx.fillStyle = '#4a3228';
    ctx.font = '600 16px "Prompt", sans-serif';
    ctx.fillText(
      `ชื่อสมาชิก: ${targetMember.display_name}   •   สะสมครบแลกส่วนลดและของแถมสุดคิวท์ ♡`,
      cx + 42,
      cy + 98
    );

    // กล่องรหัสสมาชิกมุมขวาบน
    ctx.fillStyle = '#4a3228';
    ctx.beginPath();
    ctx.roundRect(cx + cw - 230, cy + 34, 190, 72, 16);
    ctx.fill();

    ctx.fillStyle = '#fceef2';
    ctx.font = '600 12px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEMBER CODE (รหัสสมาชิก)', cx + cw - 135, cy + 58);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Prompt", sans-serif';
    ctx.fillText(targetMember.member_code, cx + cw - 135, cy + 90);

    // วาดช่องแสตมป์ 10 ดวง (2 แถว แถวละ 5 ดวง)
    const filledCount = Math.min(10, targetMember.points_balance % 10 === 0 && targetMember.points_balance > 0 ? 10 : targetMember.points_balance % 10);
    const startX = cx + 85;
    const startY = cy + 185;
    const gapX = 138;
    const gapY = 105;

    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const sx = startX + col * gapX;
      const sy = startY + row * gapY;
      const isStamped = i < filledCount;

      ctx.beginPath();
      ctx.arc(sx, sy, 38, 0, Math.PI * 2);
      ctx.fillStyle = isStamped ? '#ec7a9a' : '#fffaf8';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isStamped ? '#4a3228' : '#e9d5dc';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isStamped) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px "Prompt", sans-serif';
        ctx.fillText(i % 2 === 0 ? '♥' : '★', sx, sy + 2);
      } else {
        ctx.fillStyle = '#cbb2ba';
        ctx.font = 'bold 16px "Prompt", sans-serif';
        ctx.fillText(String(i + 1), sx, sy + 2);
      }
    }
    ctx.textBaseline = 'alphabetic';

    // แถบสรุปแต้มด้านล่างบัตร
    const footerY = cy + ch - 42;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a3228';
    ctx.font = 'bold 20px "Prompt", sans-serif';
    ctx.fillText(
      `💖 แต้มสะสมคงเหลือ: ${targetMember.points_balance.toLocaleString('th-TH')} แต้ม (สะสมทั้งหมด ${targetMember.lifetime_points.toLocaleString('th-TH')} แต้ม)`,
      cx + 42,
      footerY
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#7c5d51';
    ctx.font = '600 14px "Prompt", sans-serif';
    ctx.fillText(
      `LINE: ${settings.contact_line || '@280npxvj'} • IG: ${settings.contact_ig || 'qokhims'}`,
      cx + cw - 42,
      footerY
    );

    const link = document.createElement('a');
    link.download = `qokhims-member-card-${targetMember.member_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('บันทึกรูปบัตรสะสมแต้มเรียบร้อยแล้วค่ะ เก็บไว้ดูรหัสสมาชิกได้เลย ♡', 'success');
  };

  if (loadingInitial) {
    return <LoadingState message="กำลังโหลดหน้าบัตรสะสมแต้มและของรางวัล qokhims ♡" />;
  }

  // กรณีปิดสวิตช์ระบบสะสมแต้มจากหลังบ้าน
  if (!isLoyaltyEnabled) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-[2rem] border-2 border-[var(--color-border)] p-8 space-y-4 shadow-xs">
          <CuteHeart className="w-10 h-10 mx-auto" />
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-secondary)]">
            ระบบสะสมแต้มปิดให้บริการชั่วคราวค่ะ
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
            คุณลูกค้ายังสามารถเลือกชมบริการออกแบบป้าย Rich Menu และฟอนต์ลายมือได้ตามปกติเลยนะคะ ♡
          </p>
          <div className="pt-2">
            <Link
              to="/products"
              className="pkz-order-btn inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold"
            >
              ดูบริการ & ฟอนต์ทั้งหมด
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // คำนวณความคืบหน้าไปยังของรางวัลถัดไป
  const sortedActiveRewards = [...rewards].sort((a, b) => a.cost_points - b.cost_points);
  const currentBalance = member?.points_balance ?? 0;
  const nextReward =
    sortedActiveRewards.find((r) => r.cost_points > currentBalance) ||
    sortedActiveRewards[sortedActiveRewards.length - 1] ||
    null;
  const progressPercent = nextReward
    ? Math.min(100, Math.round((currentBalance / Math.max(1, nextReward.cost_points)) * 100))
    : 100;
  const pointsNeededForNext = nextReward ? Math.max(0, nextReward.cost_points - currentBalance) : 0;

  // จำนวนแสตมป์ที่เติมสีในหน้าบัตร 10 ช่อง
  const totalSlots = 10;
  const targetGoalPoints = nextReward ? nextReward.cost_points : 10;
  const filledStampsCount = member
    ? Math.min(
        totalSlots,
        targetGoalPoints <= 10
          ? currentBalance
          : Math.floor((currentBalance / Math.max(1, targetGoalPoints)) * totalSlots)
      )
    : 0;

  const rawLineHandle = (
    redemptionResult?.line_id ||
    rules.contact_line ||
    settings.contact_line ||
    '@280npxvj'
  ).trim();
  const cleanLineHandle = rawLineHandle.startsWith('@') ? rawLineHandle : `@${rawLineHandle}`;
  const lineOaUrl = /^https?:\/\//i.test(rawLineHandle)
    ? rawLineHandle
    : `https://line.me/R/ti/p/${cleanLineHandle}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
      {/* 1. หัวข้อหน้าสะสมแต้ม & กติกาสั้น ๆ */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-border)]">
          <CuteHeart className="w-3.5 h-3.5" /> Loyalty Stamp Card & Rewards
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-secondary)]">
          บัตรสะสมแต้ม & แลกของรางวัล{' '}
          <BrandWordmark name={settings.site_name || 'qokhims'} dotVariant="heart" />
        </h1>
        <CuteSectionDivider />
        <p className="text-sm sm:text-base text-[var(--color-secondary-muted)] leading-relaxed">
          ไม่ต้องสมัครสมาชิกล็อกอินให้ยุ่งยาก! เพียงรับ{' '}
          <strong className="text-[var(--color-secondary)]">“รหัสสมาชิก (PZ-XXXX)”</strong>{' '}
          แล้วกรอกตอนสั่งซื้อ เมื่อแอดมินส่งงานเสร็จสิ้น แต้มจะเข้าบัตรอัตโนมัติทันทีค่ะ ♡
        </p>

        {/* แถบสรุปกติกาแต้ม (ดึงจากตั้งค่าหลังบ้านทั้งหมด) */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-xs">
          <span className="px-3.5 py-2 rounded-2xl bg-white border border-[var(--color-border)] font-semibold text-[var(--color-secondary)] inline-flex items-center gap-1.5 shadow-2xs">
            <CuteSparkle className="w-4 h-4" />
            อัตราได้แต้ม: ทุก <strong className="text-[var(--color-primary)]">{rules.baht_per_point} บาท = 1 แต้ม</strong>
          </span>
          <span className="px-3.5 py-2 rounded-2xl bg-white border border-[var(--color-border)] font-semibold text-[var(--color-secondary)] inline-flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ได้แต้มเมื่อสถานะออเดอร์ “ส่งงานเรียบร้อย”
          </span>
          <span className="px-3.5 py-2 rounded-2xl bg-white border border-[var(--color-border)] font-semibold text-[var(--color-secondary)] inline-flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            อายุแต้ม:{' '}
            <strong>
              {rules.points_expiry_months > 0
                ? `${rules.points_expiry_months} เดือนนับจากวันที่ได้รับ`
                : 'ไม่มีวันหมดอายุ ♡'}
            </strong>
          </span>
          {rules.review_bonus_points > 0 && (
            <span className="px-3.5 py-2 rounded-2xl bg-[var(--color-primary-light)] border border-[var(--color-border)] font-bold text-[var(--color-primary)] inline-flex items-center gap-1.5 shadow-2xs">
              <CuteHeart className="w-3.5 h-3.5" />
              โบนัสรีวิวหลังรับงาน +{rules.review_bonus_points} แต้ม/ออเดอร์
            </span>
          )}
        </div>
      </div>

      {/* 2. โซนหลัก: ซ้าย (เช็กแต้ม / สมัครสมาชิก) + ขวา (บัตรสะสมแสตมป์ SVG สุดน่ารัก) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* คอลัมน์ซ้าย: ฟอร์มเช็กรหัสสมาชิก+PIN หรือ สมัครรับรหัสใหม่ */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-[2rem] border-2 border-[var(--color-border)] p-5 sm:p-6 shadow-xs space-y-5 relative overflow-hidden">
            <CardCornerDoodle corner="top-right" variant="flower" />

            {/* ปุ่มสลับโหมด */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setActiveTab('lookup')}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'lookup'
                    ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                    : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
                }`}
              >
                <Search className="w-4 h-4" />
                เช็กแต้มของฉัน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                    : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                สมัครรับรหัสสมาชิก
              </button>
            </div>

            {/* แจ้งเตือนเมื่อเพิ่งสมัครรับรหัสสมาชิกสำเร็จ */}
            {newlyRegisteredMember && (
              <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/90 border-2 border-[var(--color-primary)] space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> สมัครสำเร็จ! โปรดจดรหัสสมาชิกไว้
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyMemberCode(newlyRegisteredMember.member_code)}
                    className="px-2.5 py-1 rounded-full bg-white text-[11px] font-bold text-[var(--color-secondary)] border border-[var(--color-border)] inline-flex items-center gap-1 hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedCode ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}
                  </button>
                </div>
                <div className="text-2xl font-bold text-[var(--color-secondary)] tracking-wider text-center py-2 bg-white rounded-xl border border-[var(--color-border)]">
                  {newlyRegisteredMember.member_code}
                </div>
                <p className="text-[11px] text-[var(--color-secondary-muted)] text-center">
                  แนะนำให้กดปุ่ม <strong>“บันทึกบัตรเป็นรูป (.PNG)”</strong> บนบัตรด้านขวาเก็บไว้ในมือถือนะคะ ♡
                </p>
              </div>
            )}

            {activeTab === 'lookup' ? (
              <form onSubmit={(e) => handleLookup(e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1.5">
                    รหัสสมาชิก (Member Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                    placeholder="เช่น PZ-4K9M"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-bold uppercase tracking-wider text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1.5">
                    รหัส PIN ส่วนตัว (ตัวเลข 4–6 หลัก) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    maxLength={6}
                    required
                    value={lookupPin}
                    onChange={(e) => setLookupPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm tracking-widest text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={lookingUp}
                  className="pkz-order-btn w-full py-3 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  {lookingUp ? 'กำลังตรวจสอบแต้ม...' : 'เปิดดูบัตรสะสมแต้ม & ประวัติ'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                  >
                    ยังไม่มีรหัสสมาชิกใช่ไหมคะ? กดสมัครรับรหัสฟรีที่นี่ →
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                    ชื่อเล่นของคุณลูกค้า <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="เช่น คุณพลอย (ร้านเบเกอรี)"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                    ช่องทางติดต่อหลัก (LINE / IG / เบอร์โทร) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regContact}
                    onChange={(e) => setRegContact(e.target.value)}
                    placeholder="เช่น LINE: ploy.sweet หรือ 089-xxx-xxxx"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                    ตั้งรหัส PIN ส่วนตัว (ตัวเลข 4–6 หลัก) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    maxLength={6}
                    required
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="ตัวเลข 4 ถึง 6 หลักสำหรับเช็กแต้มและแลกของรางวัล"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* ข้อความยินยอม PDPA */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer text-xs text-[var(--color-secondary-muted)] leading-relaxed">
                  <input
                    type="checkbox"
                    checked={regConsent}
                    onChange={(e) => setRegConsent(e.target.checked)}
                    className="mt-0.5 accent-[var(--color-primary)] w-4 h-4 rounded shrink-0"
                  />
                  <span>
                    ยินยอมให้ร้าน <strong>{settings.site_name || 'qokhims'}</strong> เก็บข้อมูลชื่อเล่นและช่องทางติดต่อเพื่อใช้อ้างอิงการสะสมแต้มและแลกของรางวัลเท่านั้น (สามารถแจ้งแอดมินทาง LINE เพื่อขอลบข้อมูลได้ตลอดเวลาตามแนวทาง PDPA ค่ะ)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={registering}
                  className="pkz-order-btn w-full py-3 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-95 transition shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {registering ? 'กำลังสร้างรหัสสมาชิก...' : 'รับรหัสสมาชิกทันที (ฟรี)'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* คอลัมน์ขวา: บัตรสะสมแสตมป์ (Cute SVG Stamp Card) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="relative bg-white rounded-[2.2rem] border-2 border-[var(--color-secondary)]/85 p-6 sm:p-8 shadow-md overflow-hidden">
            <CuteWashiTape />
            <CardCornerDoodle corner="top-right" variant="heart" />
            <CardCornerDoodle corner="bottom-left" variant="flower" />

            {/* ส่วนหัวบัตร */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b-2 border-dashed border-[var(--color-border)]">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold border border-[var(--color-border)]">
                  <Award className="w-3.5 h-3.5" />
                  QOKHIMS STAMP CARD
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
                  <span>
                    {member ? `บัตรของคุณ ${member.display_name}` : 'ตัวอย่างบัตรสะสมแต้มร้าน qokhims'}
                  </span>
                  <CuteHeart className="w-5 h-5" />
                </h2>
                <p className="text-xs text-[var(--color-secondary-muted)]">
                  {member
                    ? `ช่องทางติดต่อ: ${member.contact} • สะสมตลอดชีพ ${member.lifetime_points.toLocaleString('th-TH')} แต้ม`
                    : 'กรอกรหัสสมาชิก + PIN ด้านซ้ายเพื่อเปิดดูแสตมป์และแต้มสะสมของคุณนะคะ'}
                </p>
              </div>

              {/* ป้ายรหัสสมาชิกบนบัตร */}
              <div className="px-4 py-2.5 rounded-2xl bg-[var(--color-secondary)] text-white text-center shadow-xs min-w-[140px]">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-primary-light)] block">
                  MEMBER CODE
                </span>
                <div className="text-lg sm:text-xl font-bold tracking-wider flex items-center justify-center gap-1.5">
                  <span>{member ? member.member_code : 'PZ-XXXX'}</span>
                  {member && (
                    <button
                      type="button"
                      onClick={() => handleCopyMemberCode(member.member_code)}
                      title="คัดลอกรหัสสมาชิก"
                      className="p-1 rounded-lg bg-white/15 hover:bg-white/25 transition cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ช่องแสตมป์ 10 ดวง (หัวใจสลับดาว เติมสีเมื่อได้แต้ม ทำด้วย SVG) */}
            <div className="py-6">
              <div className="grid grid-cols-5 gap-2.5 sm:gap-4">
                {Array.from({ length: totalSlots }).map((_, idx) => {
                  const isFilled = idx < filledStampsCount;
                  const isHeart = idx % 2 === 0;
                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 transition-all duration-300 ${
                        isFilled
                          ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-2xs scale-100'
                          : 'bg-[var(--color-bg)]/70 border-dashed border-[var(--color-border)] opacity-75'
                      }`}
                    >
                      {isFilled ? (
                        <div className="flex flex-col items-center gap-1">
                          {isHeart ? (
                            <CuteHeart className="w-6 h-6 sm:w-8 sm:h-8" />
                          ) : (
                            <CuteStar className="w-6 h-6 sm:w-8 sm:h-8" />
                          )}
                          <span className="text-[10px] font-bold text-[var(--color-primary)]">
                            STAMP #{idx + 1}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[var(--color-secondary-muted)]/60">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            aria-hidden="true"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeDasharray="3 3"
                            />
                          </svg>
                          <span className="text-[10px] font-semibold">#{idx + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* แถบความคืบหน้าไปยังของรางวัลถัดไป */}
            <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                  <CuteFlower className="w-4 h-4" />
                  แต้มคงเหลือปัจจุบัน:{' '}
                  <strong className="text-lg sm:text-xl text-[var(--color-primary)]">
                    {currentBalance.toLocaleString('th-TH')} แต้ม
                  </strong>
                </span>
                {nextReward && (
                  <span className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                    {pointsNeededForNext > 0
                      ? `อีก ${pointsNeededForNext} แต้ม แลก “${nextReward.name}” ได้เลย!`
                      : `🎉 แต้มถึงเกณฑ์แลก “${nextReward.name}” แล้วค่ะ!`}
                  </span>
                )}
              </div>

              <div className="w-full h-3 rounded-full bg-white border border-[var(--color-border)] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[#f39ab3] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* แจ้งเตือนแต้มที่ใกล้หมดอายุ (ถ้ามี) */}
              {expiringSoon.length > 0 && (
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    มีแต้มจำนวน {expiringSoon[0].points} แต้ม ที่จะหมดอายุในวันที่{' '}
                    {new Date(expiringSoon[0].expires_at).toLocaleDateString('th-TH', {
                      dateStyle: 'medium',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* ปุ่มบันทึกบัตรเป็นรูป (.PNG) และปุ่มออกจากเซสชัน */}
            <div className="pt-5 flex flex-wrap items-center justify-between gap-3">
              {member ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDownloadStampCardImage(member)}
                    className="px-5 py-2.5 rounded-full bg-[var(--color-secondary)] text-white text-xs sm:text-sm font-semibold hover:bg-[var(--color-primary)] transition inline-flex items-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    บันทึกบัตรสะสมแต้มเป็นรูป (.PNG)
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      to="/order"
                      className="px-4 py-2.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-secondary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition"
                    >
                      ไปที่ตะกร้าสินค้าพร้อมรหัสนี้ →
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMember(null);
                        setSessionPin('');
                        setLookupPin('');
                        setNewlyRegisteredMember(null);
                      }}
                      className="p-2.5 rounded-full border border-[var(--color-border)] text-[var(--color-secondary-muted)] hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                      title="ปิดข้อมูลบัตร"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--color-secondary-muted)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
                  ปลอดภัยด้วยรหัส PIN เข้ารหัส PBKDF2 ไม่ต้องใช้รหัสผ่านโซเชียลของคุณลูกค้าค่ะ
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. รายการของรางวัลที่แลกได้ (Rewards Catalog) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" /> Redeem Cute Rewards
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)] mt-1">
              ของรางวัล & ส่วนลดสำหรับสมาชิก
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
            กดแลกของรางวัลแล้วส่งข้อความสรุปเข้าแชต LINE ร้าน{' '}
            <strong className="text-[var(--color-secondary)]">{cleanLineHandle}</strong> ได้เลยค่ะ ♡
          </p>
        </div>

        {rewards.length === 0 ? (
          <EmptyState
            title="ยังไม่มีรายการของรางวัลในขณะนี้"
            description="แอดมินกำลังเตรียมของรางวัลน่ารัก ๆ มาอัปเดตเร็ว ๆ นี้นะคะ"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((rw) => {
              const outOfStock = rw.stock !== null && rw.stock <= 0;
              const canAfford = member ? member.points_balance >= rw.cost_points : true;
              return (
                <div
                  key={rw.id}
                  className="relative pkz-card rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-all"
                >
                  <CardCornerDoodle corner="top-right" variant="star" />
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold border border-[var(--color-border)]">
                        <CuteHeart className="w-3.5 h-3.5" />
                        ใช้ {rw.cost_points.toLocaleString('th-TH')} แต้ม
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--color-secondary-muted)]">
                        {rw.stock === null
                          ? 'ไม่จำกัดจำนวน'
                          : outOfStock
                          ? 'หมดชั่วคราว'
                          : `คงเหลือ ${rw.stock} สิทธิ์`}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-[var(--color-secondary)]">
                      {rw.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)] leading-relaxed">
                      {rw.description || 'ใช้เป็นส่วนลดหรือรับของแถมพิเศษเมื่อสั่งงานกับร้าน qokhims'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={outOfStock || (Boolean(member) && !canAfford)}
                    onClick={() => handleOpenRedeemModal(rw)}
                    className={`w-full py-3 rounded-full text-xs sm:text-sm font-bold transition inline-flex items-center justify-center gap-2 cursor-pointer ${
                      outOfStock
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : member && !canAfford
                        ? 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-secondary-muted)] cursor-not-allowed'
                        : 'bg-[var(--color-primary)] text-white hover:opacity-95 shadow-xs'
                    }`}
                  >
                    <Gift className="w-4 h-4" />
                    {outOfStock
                      ? 'ของรางวัลหมดชั่วคราว'
                      : member && !canAfford
                      ? `ขาดอีก ${rw.cost_points - member.points_balance} แต้ม`
                      : 'แลกของรางวัลนี้'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. ประวัติการได้รับ/ใช้แต้ม (Points Ledger) & ประวัติการแลกของรางวัล (แสดงเมื่อเปิดดูบัตรสมาชิกแล้ว) */}
      {member && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 animate-fade-in">
          {/* ประวัติสมุดบัญชีแต้ม (Ledger) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--color-primary)]" />
              ประวัติการได้รับและใช้แต้ม ({ledger.length})
            </h3>

            {ledger.length === 0 ? (
              <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)] py-8 text-center">
                ยังไม่มีประวัติรายการแต้ม เมื่อสั่งซื้อและแอดมินส่งงานเสร็จสิ้น แต้มจะแสดงที่นี่ค่ะ ♡
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]/60 max-h-96 overflow-y-auto pr-1">
                {ledger.map((item) => {
                  const badge = LEDGER_TYPE_BADGE[item.type] || LEDGER_TYPE_BADGE.adjust;
                  const isPositive = item.points > 0;
                  return (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-[var(--color-secondary-muted)]">
                            {new Date(item.created_at).toLocaleString('th-TH', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-[var(--color-secondary)] font-medium">{item.note}</p>
                        {item.expires_at && item.points > 0 && (
                          <p className="text-[11px] text-[var(--color-secondary-muted)]">
                            หมดอายุ:{' '}
                            {new Date(item.expires_at).toLocaleDateString('th-TH', {
                              dateStyle: 'medium',
                            })}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-sm sm:text-base font-bold shrink-0 ${
                          isPositive ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {isPositive ? `+${item.points}` : item.points} แต้ม
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ประวัติการแลกของรางวัล */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <Gift className="w-5 h-5 text-[var(--color-primary)]" />
              รายการแลกของรางวัลของคุณ ({redemptions.length})
            </h3>

            {redemptions.length === 0 ? (
              <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)] py-8 text-center">
                ยังไม่มีประวัติการแลกของรางวัลค่ะ
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {redemptions.map((rd) => {
                  const st =
                    REDEMPTION_STATUS_BADGE[rd.status] || REDEMPTION_STATUS_BADGE.pending;
                  return (
                    <div
                      key={rd.id}
                      className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[var(--color-secondary)]">
                          #RDM-{String(rd.id).padStart(4, '0')} • {rd.reward_name || 'ของรางวัล'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.className}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[var(--color-secondary-muted)]">
                        <span>ใช้ {rd.points_spent} แต้ม</span>
                        <span>
                          {new Date(rd.created_at).toLocaleDateString('th-TH', {
                            dateStyle: 'medium',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal ยืนยันแลกของรางวัล & ส่งเข้าแชต LINE ร้าน */}
      {selectedRewardToRedeem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border-2 border-[var(--color-border)] max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            {!redemptionResult ? (
              <form onSubmit={handleConfirmRedeem} className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-lg font-bold text-[var(--color-secondary)] flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[var(--color-primary)]" />
                    ยืนยันการแลกของรางวัล
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedRewardToRedeem(null)}
                    className="text-xs font-semibold text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)] cursor-pointer"
                  >
                    ปิด ✕
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/70 border border-[var(--color-border)] space-y-1">
                  <span className="text-xs font-bold text-[var(--color-primary)]">
                    รายการที่เลือกแลก:
                  </span>
                  <div className="text-base font-bold text-[var(--color-secondary)]">
                    {selectedRewardToRedeem.name}
                  </div>
                  <div className="text-xs text-[var(--color-secondary-muted)]">
                    ใช้แต้มสะสม:{' '}
                    <strong className="text-[var(--color-primary)]">
                      {selectedRewardToRedeem.cost_points} แต้ม
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                      รหัสสมาชิก (PZ-XXXX) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={redeemCodeInput}
                      onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
                      placeholder="PZ-XXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                      รหัส PIN (4–6 หลัก) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="\d{4,6}"
                      maxLength={6}
                      required
                      value={redeemPinInput}
                      onChange={(e) => setRedeemPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm tracking-widest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1">
                    หมายเหตุถึงแอดมิน (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={redeemNoteInput}
                    onChange={(e) => setRedeemNoteInput(e.target.value)}
                    placeholder="เช่น ใช้ลดกับออเดอร์ป้ายบัญชีวันนี้ค่ะ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs sm:text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRewardToRedeem(null)}
                    className="px-5 py-2.5 rounded-full border border-[var(--color-border)] text-xs sm:text-sm font-semibold text-[var(--color-secondary)] cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={redeeming}
                    className="pkz-order-btn px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-xs sm:text-sm font-bold hover:opacity-95 transition cursor-pointer disabled:opacity-60"
                  >
                    {redeeming
                      ? 'กำลังหักแต้มและสร้างใบแลก...'
                      : `ยืนยันใช้ ${selectedRewardToRedeem.cost_points} แต้มแลก`}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--color-secondary)]">
                  แลกของรางวัลสำเร็จแล้วค่ะ ♡
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
                  ระบบคัดลอกข้อความสรุปการแลกให้แล้ว กดปุ่มสีเขียวด้านล่างเพื่อส่งแจ้งแอดมินใน LINE{' '}
                  <strong>{cleanLineHandle}</strong> ได้เลยนะคะ
                </p>

                <pre className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-left text-[var(--color-secondary)] whitespace-pre-wrap font-sans leading-relaxed">
                  {redemptionResult.summary_text}
                </pre>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <a
                    href={lineOaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(redemptionResult.summary_text).catch(() => {});
                      }
                    }}
                    className="pkz-order-btn flex-1 py-3 px-4 rounded-full bg-[#06C755] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    ส่งแจ้งแลกเข้า LINE ({cleanLineHandle})
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(redemptionResult.summary_text);
                        setCopiedRedemptionSummary(true);
                        showToast('คัดลอกข้อความสรุปการแลกแล้วค่ะ ♡', 'success');
                      } catch {
                        // ignore
                      }
                    }}
                    className="py-3 px-4 rounded-full bg-[var(--color-secondary)] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedRedemptionSummary ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    คัดลอกข้อความสำรอง
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRewardToRedeem(null);
                    setRedemptionResult(null);
                  }}
                  className="text-xs font-semibold text-[var(--color-secondary-muted)] hover:underline pt-1 cursor-pointer"
                >
                  กลับไปหน้าบัตรสะสมแต้ม
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
