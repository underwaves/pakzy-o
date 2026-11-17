import React, { useEffect, useState } from 'react';
import {
  Users,
  Gift,
  Award,
  Search,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Sliders,
  AlertCircle,
  History,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import type { MemberProfile, RewardItem, PointsLedgerItem, RedemptionItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../../components/ui/States';
import { CuteHeart, CuteFlower, CuteSparkle } from '../../components/ui/Decorations';

const LEDGER_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  earn: { label: 'ได้แต้มจากสั่งซื้อ', className: 'bg-green-100 text-green-800' },
  redeem: { label: 'แลกของรางวัล', className: 'bg-rose-100 text-rose-800' },
  adjust: { label: 'ปรับโดยแอดมิน', className: 'bg-purple-100 text-purple-800' },
  bonus: { label: 'โบนัสพิเศษ', className: 'bg-amber-100 text-amber-800' },
  expire: { label: 'แต้มหมดอายุ', className: 'bg-gray-100 text-gray-700' },
};

const REDEMPTION_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: 'รอดำเนินการ', className: 'bg-amber-100 text-amber-800' },
  fulfilled: { label: 'จัดส่งรางวัลแล้ว', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ยกเลิก / คืนแต้มแล้ว', className: 'bg-gray-100 text-gray-700' },
};

export const AdminMembersPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'members' | 'redemptions' | 'rewards'>('members');

  // Members Tab State
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Member for details/ledger modal
  const [selectedMember, setSelectedMember] = useState<{
    customer: MemberProfile;
    ledger: PointsLedgerItem[];
    redemptions: RedemptionItem[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Manual Adjust Modal
  const [adjustModalMember, setAdjustModalMember] = useState<MemberProfile | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(10);
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Reset PIN Modal
  const [pinModalMember, setPinModalMember] = useState<MemberProfile | null>(null);
  const [newPin, setNewPin] = useState('');
  const [resettingPin, setResettingPin] = useState(false);

  // Redemptions Tab State
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [redemptionFilter, setRedemptionFilter] = useState<string>('all');

  // Rewards Tab State
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [rewardForm, setRewardForm] = useState<{
    name: string;
    description: string;
    cost_points: number;
    stock: string;
    is_active: boolean;
    sort_order: number;
  }>({
    name: '',
    description: '',
    cost_points: 10,
    stock: '',
    is_active: true,
    sort_order: 0,
  });
  const [savingReward, setSavingReward] = useState(false);

  // Load Members
  const loadMembers = async (q = '') => {
    setMembersLoading(true);
    try {
      const url = q ? `/api/admin/members?q=${encodeURIComponent(q)}` : '/api/admin/members';
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } finally {
      setMembersLoading(false);
    }
  };

  // Load Redemptions
  const loadRedemptions = async (status = 'all') => {
    setRedemptionsLoading(true);
    try {
      const url =
        status !== 'all'
          ? `/api/admin/redemptions?status=${encodeURIComponent(status)}`
          : '/api/admin/redemptions';
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRedemptions(data.redemptions || []);
      }
    } finally {
      setRedemptionsLoading(false);
    }
  };

  // Load Rewards
  const loadRewards = async () => {
    setRewardsLoading(true);
    try {
      const res = await fetch('/api/admin/rewards', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRewards(data.rewards || []);
      }
    } finally {
      setRewardsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'members') loadMembers(searchQuery);
    if (activeTab === 'redemptions') loadRedemptions(redemptionFilter);
    if (activeTab === 'rewards') loadRewards();
  }, [activeTab]);

  // Open Member Details Modal
  const openMemberDetails = async (member: MemberProfile) => {
    setDetailLoading(true);
    setSelectedMember({ customer: member, ledger: [], redemptions: [] });
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSelectedMember({
          customer: data.customer,
          ledger: data.ledger || [],
          redemptions: data.redemptions || [],
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle Manual Adjust Points
  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalMember) return;
    if (!adjustNote.trim()) {
      showToast('กรุณาระบุหมายเหตุการปรับแต้มทุกครั้งนะคะ', 'error');
      return;
    }
    if (adjustPoints === 0) {
      showToast('จำนวนแต้มต้องไม่เท่ากับ 0', 'error');
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch('/api/admin/points/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: adjustModalMember.id,
          points: Number(adjustPoints),
          note: adjustNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ปรับแต้มไม่สำเร็จ');

      showToast(`ปรับแต้มเรียบร้อยแล้ว ยอดคงเหลือใหม่คือ ${data.new_balance} แต้ม`, 'success');
      setAdjustModalMember(null);
      setAdjustNote('');
      loadMembers(searchQuery);
      if (selectedMember && selectedMember.customer.id === adjustModalMember.id) {
        openMemberDetails(adjustModalMember);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ปรับแต้มไม่สำเร็จ', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  // Handle Reset PIN
  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalMember) return;
    if (!/^\d{4,6}$/.test(newPin)) {
      showToast('PIN ต้องเป็นตัวเลข 4-6 หลักเท่านั้น', 'error');
      return;
    }

    setResettingPin(true);
    try {
      const res = await fetch(`/api/admin/members/${pinModalMember.id}/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'รีเซ็ต PIN ไม่สำเร็จ');

      showToast('ตั้งรหัส PIN ใหม่เรียบร้อยแล้วค่ะ ♡', 'success');
      setPinModalMember(null);
      setNewPin('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'รีเซ็ต PIN ไม่สำเร็จ', 'error');
    } finally {
      setResettingPin(false);
    }
  };

  // Handle Delete Member (PDPA)
  const handleDeleteMember = async (member: MemberProfile) => {
    if (
      !window.confirm(
        `ยืนยันการลบข้อมูลสมาชิก ${member.member_code} (${member.display_name}) ใช่หรือไม่?\n\nการดำเนินการนี้จะลบข้อมูลส่วนบุคคลและประวัติแต้มทั้งหมดตามมาตรฐาน PDPA และไม่สามารถกู้คืนได้ค่ะ`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบสมาชิกไม่สำเร็จ');

      showToast('ลบข้อมูลสมาชิกเรียบร้อยแล้วค่ะ', 'info');
      setSelectedMember(null);
      loadMembers(searchQuery);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ลบสมาชิกไม่สำเร็จ', 'error');
    }
  };

  // Handle Redemption Status Change
  const handleUpdateRedemptionStatus = async (
    redemption: RedemptionItem,
    nextStatus: 'fulfilled' | 'cancelled'
  ) => {
    if (nextStatus === 'cancelled') {
      const ok = window.confirm(
        `ยืนยันการยกเลิกคำขอแลกของรางวัล ${redemption.reward_name} หรือไม่?\n\nระบบจะคืนแต้ม ${redemption.points_spent} แต้มกลับเข้าบัญชีลูกค้า ${redemption.member_code} และคืนสต็อกของรางวัลให้อัตโนมัติค่ะ`
      );
      if (!ok) return;
    }

    try {
      const res = await fetch(`/api/admin/redemptions/${redemption.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'อัปเดตสถานะไม่สำเร็จ');

      showToast(data.message || 'อัปเดตสถานะเรียบร้อยแล้วค่ะ', 'success');
      loadRedemptions(redemptionFilter);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
    }
  };

  // Open Add/Edit Reward Modal
  const openRewardModal = (reward?: RewardItem) => {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        name: reward.name,
        description: reward.description || '',
        cost_points: reward.cost_points,
        stock: reward.stock !== null && reward.stock !== undefined ? String(reward.stock) : '',
        is_active: reward.is_active === 1,
        sort_order: reward.sort_order || 0,
      });
    } else {
      setEditingReward(null);
      setRewardForm({
        name: '',
        description: '',
        cost_points: 10,
        stock: '',
        is_active: true,
        sort_order: (rewards.length + 1) * 10,
      });
    }
    setRewardModalOpen(true);
  };

  // Save Reward (Create or Update)
  const handleSaveRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.name.trim()) {
      showToast('กรุณาระบุชื่อของรางวัล', 'error');
      return;
    }
    if (rewardForm.cost_points < 1) {
      showToast('จำนวนแต้มที่ใช้แลกต้องอย่างน้อย 1 แต้ม', 'error');
      return;
    }

    setSavingReward(true);
    try {
      const payload = {
        name: rewardForm.name.trim(),
        description: rewardForm.description.trim() || undefined,
        cost_points: Number(rewardForm.cost_points),
        stock: rewardForm.stock.trim() !== '' ? Number(rewardForm.stock) : null,
        is_active: rewardForm.is_active ? 1 : 0,
        sort_order: Number(rewardForm.sort_order),
      };

      const url = editingReward
        ? `/api/admin/rewards/${editingReward.id}`
        : '/api/admin/rewards';
      const method = editingReward ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกของรางวัลไม่สำเร็จ');

      showToast(editingReward ? 'แก้ไขของรางวัลเรียบร้อยแล้วค่ะ' : 'เพิ่มของรางวัลใหม่สำเร็จค่ะ ♡', 'success');
      setRewardModalOpen(false);
      loadRewards();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSavingReward(false);
    }
  };

  // Delete Reward
  const handleDeleteReward = async (reward: RewardItem) => {
    if (!window.confirm(`ต้องการลบของรางวัล "${reward.name}" ใช่หรือไม่คะ?`)) return;
    try {
      const res = await fetch(`/api/admin/rewards/${reward.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบไม่สำเร็จ');

      showToast('ลบของรางวัลเรียบร้อยแล้วค่ะ', 'info');
      loadRewards();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ลบไม่สำเร็จ', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ส่วนหัวหน้า */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
            ระบบสมาชิก & สะสมแต้ม (Loyalty Points)
            <CuteHeart className="w-5 h-5 text-[var(--color-primary)]" />
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
            จัดการบัญชีลูกค้า บันทึกการได้/ตัดแต้ม (Ledger) คำขอแลกรางวัล และแคตตาล็อกของรางวัล
          </p>
        </div>

        {/* แท็บเมนู */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[var(--color-border)] shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'members'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>สมาชิก ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('redemptions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'redemptions'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>คำขอแลกรางวัล</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rewards'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>ของรางวัล ({rewards.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: สมาชิก (Members) */}
      {/* ============================================================== */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* ช่องค้นหาสมาชิก */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[var(--color-border)] shadow-2xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[var(--color-secondary-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาด้วยรหัส PZ-XXXX, ชื่อลูกค้า หรือช่องทางติดต่อ..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  loadMembers(e.target.value);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-secondary)] placeholder:text-[var(--color-secondary-muted)]/70 focus:outline-hidden focus:border-[var(--color-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={() => loadMembers(searchQuery)}
              className="px-4 py-2 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-secondary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
            >
              รีเฟรชข้อมูล
            </button>
          </div>

          {membersLoading ? (
            <LoadingState message="กำลังโหลดรายชื่อสมาชิกสะสมแต้ม..." />
          ) : members.length === 0 ? (
            <EmptyState
              title="ยังไม่มีสมาชิกในระบบ"
              description="ลูกค้าสามารถเปิดบัตรสะสมแต้มได้ฟรีที่หน้า /points และจะได้รับรหัส PZ-XXXX ทันทีค่ะ"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl border border-[var(--color-border)] p-5 shadow-2xs space-y-4 hover:border-[var(--color-primary)] transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold tracking-wide">
                        {m.member_code}
                      </span>
                      <span className="text-[11px] text-[var(--color-secondary-muted)]">
                        สมัครเมื่อ{' '}
                        {new Date(m.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-[var(--color-secondary)]">
                        {m.display_name}
                      </h3>
                      <p className="text-xs text-[var(--color-secondary-muted)] mt-0.5">
                        💬 ติดต่อ: {m.contact}
                      </p>
                    </div>

                    {/* แสดงแต้มปัจจุบันและสะสมตลอดชีพ */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]/70 text-center">
                      <div>
                        <div className="text-[10px] font-semibold text-[var(--color-secondary-muted)]">
                          แต้มคงเหลือปัจจุบัน
                        </div>
                        <div className="text-lg font-black text-[var(--color-primary)]">
                          {m.points_balance.toLocaleString('th-TH')}{' '}
                          <span className="text-xs font-semibold">แต้ม</span>
                        </div>
                      </div>
                      <div className="border-l border-[var(--color-border)]/70">
                        <div className="text-[10px] font-semibold text-[var(--color-secondary-muted)]">
                          แต้มสะสมทั้งหมด
                        </div>
                        <div className="text-lg font-bold text-[var(--color-secondary)]">
                          {m.lifetime_points.toLocaleString('th-TH')}{' '}
                          <span className="text-xs font-semibold">แต้ม</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ปุ่มคำสั่งจัดการสมาชิก */}
                  <div className="pt-2 border-t border-[var(--color-border)]/70 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openMemberDetails(m)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-secondary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                      title="ดูประวัติแต้มและคำสั่งซื้อ"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>ประวัติแต้ม</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAdjustModalMember(m);
                        setAdjustPoints(10);
                        setAdjustNote('');
                      }}
                      className="py-1.5 px-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-secondary)] text-xs font-bold hover:bg-[var(--color-bg)] transition flex items-center gap-1 cursor-pointer"
                      title="ปรับแต้มด้วยตนเอง"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span>ปรับแต้ม</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPinModalMember(m);
                        setNewPin('');
                      }}
                      className="p-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)] hover:bg-[var(--color-bg)] transition cursor-pointer"
                      title="รีเซ็ตรหัส PIN ให้ลูกค้า"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m)}
                      className="p-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition cursor-pointer"
                      title="ลบข้อมูลสมาชิก (PDPA)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: คำขอแลกรางวัล (Redemptions) */}
      {/* ============================================================== */}
      {activeTab === 'redemptions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[var(--color-border)] shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-secondary)] mr-1">สถานะ:</span>
              {['all', 'pending', 'fulfilled', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setRedemptionFilter(st);
                    loadRedemptions(st);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    redemptionFilter === st
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-secondary-muted)]'
                  }`}
                >
                  {st === 'all'
                    ? 'ทั้งหมด'
                    : REDEMPTION_STATUS_BADGES[st]?.label || st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => loadRedemptions(redemptionFilter)}
              className="px-4 py-2 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-secondary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
            >
              รีเฟรชคำขอแลก
            </button>
          </div>

          {redemptionsLoading ? (
            <LoadingState message="กำลังโหลดรายการคำขอแลกของรางวัล..." />
          ) : redemptions.length === 0 ? (
            <EmptyState
              title="ไม่มีคำขอแลกรางวัลในสถานะนี้"
              description="เมื่อลูกค้ากดแลกของรางวัลจากหน้าสะสมแต้ม รายการจะแสดงขึ้นที่นี่เพื่อให้แอดมินตรวจสอบและจัดส่งค่ะ"
            />
          ) : (
            <div className="space-y-3">
              {redemptions.map((r) => {
                const badge = REDEMPTION_STATUS_BADGES[r.status] || REDEMPTION_STATUS_BADGES.pending;
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-3xl border border-[var(--color-border)] p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold">
                          {r.member_code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-[var(--color-secondary-muted)]">
                          แลกเมื่อ{' '}
                          {new Date(r.created_at).toLocaleString('th-TH', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[var(--color-secondary)]">
                          🎁 {r.reward_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-xs font-bold">
                          ใช้ {r.points_spent} แต้ม
                        </span>
                      </div>

                      <p className="text-xs text-[var(--color-secondary-muted)]">
                        ผู้แลก: <strong className="text-[var(--color-secondary)]">{r.display_name}</strong> (ช่องทางติดต่อ: {r.contact})
                      </p>

                      {r.note && (
                        <p className="text-xs text-[var(--color-secondary-muted)] bg-[var(--color-bg)] p-2 rounded-xl border border-[var(--color-border)]/60">
                          หมายเหตุ: {r.note}
                        </p>
                      )}
                    </div>

                    {/* ปุ่มเปลี่ยนสถานะคำขอ */}
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                          type="button"
                          onClick={() => handleUpdateRedemptionStatus(r, 'fulfilled')}
                          className="flex-1 md:flex-none px-4 py-2 rounded-2xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ส่งมอบรางวัลแล้ว</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRedemptionStatus(r, 'cancelled')}
                          className="flex-1 md:flex-none px-4 py-2 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>ยกเลิก (คืนแต้ม)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: จัดการของรางวัล (Rewards Catalog) */}
      {/* ============================================================== */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[var(--color-border)] shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-[var(--color-secondary)]">
                แคตตาล็อกของรางวัล ({rewards.length} รายการ)
              </h2>
              <p className="text-xs text-[var(--color-secondary-muted)]">
                เพิ่ม แก้ไข หรือซ่อนของรางวัลที่ลูกค้าสามารถนำแต้มสะสมมาแลกได้
              </p>
            </div>

            <button
              type="button"
              onClick={() => openRewardModal()}
              className="px-4 py-2.5 rounded-2xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มของรางวัลใหม่</span>
            </button>
          </div>

          {rewardsLoading ? (
            <LoadingState message="กำลังโหลดรายการของรางวัล..." />
          ) : rewards.length === 0 ? (
            <EmptyState
              title="ยังไม่มีของรางวัลในระบบ"
              description="กดปุ่ม 'เพิ่มของรางวัลใหม่' ด้านบนเพื่อกำหนดรางวัลให้ลูกค้าแลกแต้มค่ะ"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((rw) => (
                <div
                  key={rw.id}
                  className={`bg-white rounded-3xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 transition ${
                    rw.is_active === 1
                      ? 'border-[var(--color-border)]'
                      : 'border-dashed border-gray-300 opacity-60'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                        ใช้ {rw.cost_points} แต้ม
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          rw.is_active === 1
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rw.is_active === 1 ? 'เปิดแสดง' : 'ซ่อนอยู่'}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[var(--color-secondary)]">
                      {rw.name}
                    </h3>
                    {rw.description && (
                      <p className="text-xs text-[var(--color-secondary-muted)] leading-relaxed">
                        {rw.description}
                      </p>
                    )}

                    <div className="text-xs text-[var(--color-secondary-muted)] flex items-center justify-between pt-1">
                      <span>
                        คงเหลือ:{' '}
                        <strong className="text-[var(--color-secondary)]">
                          {rw.stock !== null && rw.stock !== undefined
                            ? `${rw.stock} ชิ้น`
                            : 'ไม่จำกัดจำนวน'}
                        </strong>
                      </span>
                      <span>ลำดับ: {rw.sort_order}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openRewardModal(rw)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-secondary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReward(rw)}
                      className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition cursor-pointer"
                      title="ลบของรางวัล"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ดูประวัติแต้มสมาชิก (Ledger Modal) */}
      {/* ============================================================== */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[var(--color-border)] max-w-2xl w-full p-6 shadow-xl space-y-5 my-8 animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold mr-2">
                  {selectedMember.customer.member_code}
                </span>
                <h3 className="inline text-lg font-bold text-[var(--color-secondary)]">
                  ประวัติแต้ม: {selectedMember.customer.display_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="w-8 h-8 rounded-full bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* สรุปยอดแต้ม */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[var(--color-bg)] text-center">
              <div>
                <div className="text-xs text-[var(--color-secondary-muted)]">แต้มคงเหลือปัจจุบัน</div>
                <div className="text-2xl font-black text-[var(--color-primary)]">
                  {selectedMember.customer.points_balance.toLocaleString('th-TH')}{' '}
                  <span className="text-xs font-medium">แต้ม</span>
                </div>
              </div>
              <div className="border-l border-[var(--color-border)]">
                <div className="text-xs text-[var(--color-secondary-muted)]">แต้มสะสมตลอดชีพ</div>
                <div className="text-2xl font-bold text-[var(--color-secondary)]">
                  {selectedMember.customer.lifetime_points.toLocaleString('th-TH')}{' '}
                  <span className="text-xs font-medium">แต้ม</span>
                </div>
              </div>
            </div>

            {/* รายการ Ledger */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-bold text-[var(--color-secondary)] sticky top-0 bg-white py-1">
                บันทึกการเคลื่อนไหวแต้ม (Points Ledger):
              </div>

              {detailLoading ? (
                <LoadingState message="กำลังดึงประวัติแต้ม..." />
              ) : selectedMember.ledger.length === 0 ? (
                <p className="text-xs text-[var(--color-secondary-muted)] text-center py-6">
                  ยังไม่มีประวัติการได้หรือใช้แต้ม
                </p>
              ) : (
                selectedMember.ledger.map((item) => {
                  const badge = LEDGER_TYPE_BADGES[item.type] || {
                    label: item.type,
                    className: 'bg-gray-100 text-gray-700',
                  };
                  const isPositive = item.points > 0;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]/60 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-[var(--color-secondary-muted)]">
                            {new Date(item.created_at).toLocaleString('th-TH', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-[var(--color-secondary)] font-medium">
                          {item.note || '-'}
                        </p>
                        {item.order_id && (
                          <p className="text-[10px] text-[var(--color-secondary-muted)]">
                            เชื่อมกับคำสั่งซื้อ ID #{item.order_id}
                          </p>
                        )}
                      </div>

                      <div
                        className={`text-sm font-black shrink-0 ${
                          isPositive ? 'text-green-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${item.points}` : item.points} แต้ม
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[var(--color-border)] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-5 py-2 rounded-full bg-[var(--color-secondary)] text-white text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ปรับแต้มด้วยตนเอง (Manual Adjust) */}
      {/* ============================================================== */}
      {adjustModalMember && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustPointsSubmit}
            className="bg-white rounded-3xl border border-[var(--color-border)] max-w-md w-full p-6 shadow-xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                ปรับแต้มสะสม: {adjustModalMember.member_code}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModalMember(null)}
                className="text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-bg)] text-xs text-[var(--color-secondary-muted)]">
              สมาชิก: <strong>{adjustModalMember.display_name}</strong> | แต้มปัจจุบัน:{' '}
              <strong className="text-[var(--color-primary)] font-bold">
                {adjustModalMember.points_balance} แต้ม
              </strong>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                จำนวนแต้มที่ต้องการปรับ (+ หรือ -)
              </label>
              <input
                type="number"
                step="1"
                required
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                placeholder="เช่น 10 (เพิ่ม) หรือ -5 (หักแต้ม)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-secondary)]"
              />
              <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                ใส่ตัวเลขบวกเพื่อเพิ่มแต้ม หรือใส่เครื่องหมายลบหน้าตัวเลขเพื่อหักแต้ม
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                หมายเหตุการปรับแต้ม (จำเป็น)
              </label>
              <textarea
                rows={2}
                required
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="เช่น ชดเชยออเดอร์ล่าช้า, แก้ไขข้อผิดพลาดระบบ..."
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setAdjustModalMember(null)}
                className="px-4 py-2 rounded-full border border-[var(--color-border)] text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="px-5 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 transition cursor-pointer"
              >
                {adjusting ? 'กำลังบันทึก...' : 'ยืนยันการปรับแต้ม'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: รีเซ็ตรหัส PIN สมาชิก */}
      {/* ============================================================== */}
      {pinModalMember && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleResetPinSubmit}
            className="bg-white rounded-3xl border border-[var(--color-border)] max-w-md w-full p-6 shadow-xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[var(--color-primary)]" />
                รีเซ็ตรหัส PIN: {pinModalMember.member_code}
              </h3>
              <button
                type="button"
                onClick={() => setPinModalMember(null)}
                className="text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--color-secondary-muted)]">
              หากลูกค้าลืมรหัส PIN แอดมินสามารถตั้งรหัสผ่านใหม่ (4-6 หลัก) ให้ลูกค้าได้ที่นี่
              รหัสจะถูก Hash ด้วย PBKDF2 ตามมาตรฐานความปลอดภัย
            </p>

            <div>
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                รหัส PIN ใหม่ (ตัวเลข 4-6 หลัก)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4,6}"
                maxLength={6}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="เช่น 1234 หรือ 888888"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm tracking-widest font-mono text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setPinModalMember(null)}
                className="px-4 py-2 rounded-full border border-[var(--color-border)] text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={resettingPin}
                className="px-5 py-2 rounded-full bg-[var(--color-secondary)] text-white text-xs font-bold hover:bg-[var(--color-primary)] transition cursor-pointer"
              >
                {resettingPin ? 'กำลังรีเซ็ต...' : 'บันทึก PIN ใหม่'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: เพิ่ม/แก้ไข ของรางวัล (Reward Form Modal) */}
      {/* ============================================================== */}
      {rewardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveRewardSubmit}
            className="bg-white rounded-3xl border border-[var(--color-border)] max-w-lg w-full p-6 shadow-xl space-y-4 my-8 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-[var(--color-primary)]" />
                {editingReward ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัลใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setRewardModalOpen(false)}
                className="text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                ชื่อของรางวัล *
              </label>
              <input
                type="text"
                required
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="เช่น ส่วนลด 50 บาท สำหรับสั่งทำป้าย, ฟอนต์ฟรี 1 รายการ..."
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                คำอธิบาย / เงื่อนไขการใช้
              </label>
              <textarea
                rows={2}
                value={rewardForm.description}
                onChange={(e) =>
                  setRewardForm({ ...rewardForm, description: e.target.value })
                }
                placeholder="เช่น ใช้เป็นส่วนลดในออเดอร์ถัดไป แจ้งรหัสแลกกับแอดมินทาง LINE"
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                  แต้มที่ใช้แลก *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={rewardForm.cost_points}
                  onChange={(e) =>
                    setRewardForm({
                      ...rewardForm,
                      cost_points: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                  จำนวนคงเหลือ (Stock)
                </label>
                <input
                  type="number"
                  min="0"
                  value={rewardForm.stock}
                  onChange={(e) => setRewardForm({ ...rewardForm, stock: e.target.value })}
                  placeholder="เว้นว่าง = ไม่จำกัด"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">
                  ลำดับการแสดงผล (Sort Order)
                </label>
                <input
                  type="number"
                  value={rewardForm.sort_order}
                  onChange={(e) =>
                    setRewardForm({
                      ...rewardForm,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--color-secondary)]">
                  <input
                    type="checkbox"
                    checked={rewardForm.is_active}
                    onChange={(e) =>
                      setRewardForm({ ...rewardForm, is_active: e.target.checked })
                    }
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                  <span>เปิดใช้งานให้ลูกค้าแลก</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setRewardModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[var(--color-border)] text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingReward}
                className="px-6 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 transition cursor-pointer"
              >
                {savingReward ? 'กำลังบันทึก...' : 'บันทึกของรางวัล'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
