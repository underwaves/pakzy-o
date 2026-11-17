import React, { useState, useEffect } from 'react';
import {
  Save,
  Upload,
  Palette,
  MessageCircle,
  Store,
  KeyRound,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Send,
  HelpCircle,
  ExternalLink,
  Gift,
  Coins,
  CreditCard,
  FolderOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';

const THEME_PRESETS = [
  {
    name: 'ชมพูพาสเทล + น้ำตาลช็อกโก (ค่าเริ่มต้น qokhims)',
    primary: '#ec7a9a',
    primaryLight: '#fceef2',
    secondary: '#4a3228',
    bg: '#fffaf8',
  },
  {
    name: 'ชมพูพีชละมุน + น้ำตาลมอคค่า',
    primary: '#f08080',
    primaryLight: '#fff0f0',
    secondary: '#3e2723',
    bg: '#fffdf9',
  },
  {
    name: 'ชมพูโรสโกลด์ + น้ำตาลเอสเพรสโซ',
    primary: '#d87093',
    primaryLight: '#faebf0',
    secondary: '#2d1e18',
    bg: '#fcf8f7',
  },
];

export const AdminSettingsPage: React.FC = () => {
  const { settings, refreshSiteData } = useSite();
  const { showToast } = useToast();

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
  const [showLineToken, setShowLineToken] = useState(false);
  const [testingLine, setTestingLine] = useState(false);
  const [showLineGuide, setShowLineGuide] = useState(true);
  const [envLineStatus, setEnvLineStatus] = useState<{
    has_env_token: boolean;
    has_env_user_id: boolean;
  }>({ has_env_token: false, has_env_user_id: false });

  // ระบบตรวจสอบสลิปอัตโนมัติ
  const [showSlipApiKey, setShowSlipApiKey] = useState(false);
  const [testingSlip, setTestingSlip] = useState(false);
  const [slipTestResult, setSlipTestResult] = useState<{
    success: boolean;
    message: string;
    quota?: any;
  } | null>(null);
  const [showSlipGuide, setShowSlipGuide] = useState(false);

  // เปลี่ยนรหัสผ่านแอดมิน
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...settings,
      line_channel_access_token: prev.line_channel_access_token || '',
      line_admin_user_id: prev.line_admin_user_id || '',
    }));
  }, [settings]);

  useEffect(() => {
    fetch('/api/admin/line-config', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setForm((prev) => ({
          ...prev,
          enable_line_messaging_api:
            data.enable_line_messaging_api || prev.enable_line_messaging_api || 'false',
          line_channel_access_token: data.line_channel_access_token || '',
          line_admin_user_id: data.line_admin_user_id || '',
        }));
        setEnvLineStatus({
          has_env_token: Boolean(data.has_env_token),
          has_env_user_id: Boolean(data.has_env_user_id),
        });
      })
      .catch(() => {});

    // โหลดการตั้งค่าระบบตรวจสอบสลิปอัตโนมัติ
    fetch('/api/admin/slip-config', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setForm((prev) => ({
          ...prev,
          slip_verify_enabled: data.slip_verify_enabled || prev.slip_verify_enabled || 'false',
          slip_verify_provider: data.slip_verify_provider || prev.slip_verify_provider || 'slipok',
          slip_verify_api_key: data.slip_verify_api_key || prev.slip_verify_api_key || '',
          slip_verify_branch_id: data.slip_verify_branch_id || prev.slip_verify_branch_id || '',
          slip_verify_auto_confirm: data.slip_verify_auto_confirm || prev.slip_verify_auto_confirm || 'true',
          slip_verify_check_receiver:
            data.slip_verify_check_receiver !== undefined
              ? String(data.slip_verify_check_receiver)
              : prev.slip_verify_check_receiver || 'true',
        }));
      })
      .catch(() => {});
  }, []);

  const handleTestLinePush = async () => {
    setTestingLine(true);
    try {
      const res = await fetch('/api/admin/line-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          line_channel_access_token: form.line_channel_access_token || '',
          line_admin_user_id: form.line_admin_user_id || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ส่งข้อความทดสอบไม่สำเร็จ');
      }
      updateField('enable_line_messaging_api', 'true');
      showToast(
        data.message || 'ส่งข้อความทดสอบเข้า LINE แอดมินสำเร็จแล้วค่ะ ♡',
        'success'
      );
      await refreshSiteData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'ไม่สามารถส่งข้อความทดสอบได้',
        'error'
      );
    } finally {
      setTestingLine(false);
    }
  };

  const handleTestSlip = async () => {
    setTestingSlip(true);
    setSlipTestResult(null);
    try {
      const res = await fetch('/api/admin/slip-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slip_verify_provider: form.slip_verify_provider || 'slipok',
          slip_verify_api_key: form.slip_verify_api_key || '',
          slip_verify_branch_id: form.slip_verify_branch_id || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ทดสอบการเชื่อมต่อ API สลิปไม่สำเร็จ');
      }
      setSlipTestResult({ success: true, message: data.message, quota: data.quota });
      showToast(data.message, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      setSlipTestResult({ success: false, message: msg });
      showToast(msg, 'error');
    } finally {
      setTestingSlip(false);
    }
  };

  const updateField = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'branding');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'อัปโหลดโลโก้ไม่สำเร็จ');

      const nextForm = { ...form, logo_url: data.url };
      setForm(nextForm);
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: nextForm }),
      });
      await refreshSiteData();
      showToast('อัปโหลดและบันทึกโลโก้ใหม่เรียบร้อยแล้วค่ะ ♡', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeroImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'branding');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'อัปโหลดรูปร้านไม่สำเร็จ');

      const nextForm = { ...form, hero_image_url: data.url };
      setForm(nextForm);
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: nextForm }),
      });
      await refreshSiteData();
      showToast('อัปโหลดและบันทึกรูปโชว์หน้าร้านเรียบร้อยแล้วค่ะ ♡', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ', 'error');
    } finally {
      setUploadingHeroImage(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: form }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');

      showToast(data.message || 'บันทึกการตั้งค่าเว็บไซต์เรียบร้อยแล้วค่ะ ♡', 'success');
      await refreshSiteData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPw(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');

      setCurrentPassword('');
      setNewPassword('');
      showToast(data.message || 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้วค่ะ', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'error');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">
          ตั้งค่าเว็บไซต์ ป้ายคิวงาน ช่องทางติดต่อ & ธีมสี
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-secondary-muted)]">
          ปรับเปลี่ยนข้อมูลร้าน ป้ายสถานะคิวงานหน้าแรก โลโก้ ช่องทางโซเชียล และโทนสีได้ตลอดเวลา
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-sm">
        {/* 1. ข้อมูลร้านและข้อความหน้าแรก + ป้ายสถานะคิวงาน */}
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Store className="w-4 h-4 text-[var(--color-primary)]" />
            1. ข้อมูลร้าน โลโก้ และป้ายสถานะคิวงานหน้าแรก
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">ชื่อร้าน</label>
              <input
                type="text"
                value={form.site_name || ''}
                onChange={(e) => updateField('site_name', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">สโลแกนร้าน</label>
              <input
                type="text"
                value={form.site_tagline || ''}
                onChange={(e) => updateField('site_tagline', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              />
            </div>
          </div>

          {/* ป้ายสถานะคิวงานหน้าแรก (Hero Queue Status Badge) */}
          <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/50 border border-[var(--color-border)] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)]">
              <Sparkles className="w-4 h-4" />
              ป้ายสถานะคิวงานบนหน้าแรก (Queue Status Badge)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  สถานะไฟสัญญาณคิวงาน
                </label>
                <select
                  value={form.queue_status_state || 'open'}
                  onChange={(e) => updateField('queue_status_state', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-xs font-semibold"
                >
                  <option value="open">🟢 เปิดรับคิวปกติ (สีเขียว)</option>
                  <option value="busy">🟡 คิวเริ่มแน่น / รอคิวเล็กน้อย (สีเหลือง)</option>
                  <option value="closed">🔴 ปิดรับคิวออกแบบชั่วคราว (สีชมพูเข้ม)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">
                  ข้อความบนป้ายคิวงาน (แสดงใต้ปุ่มสั่งซื้อในหน้าแรก)
                </label>
                <input
                  type="text"
                  value={form.queue_status_text || ''}
                  onChange={(e) => updateField('queue_status_text', e.target.value)}
                  placeholder="เช่น คิวว่างพร้อมรับงานค่ะ (รอคิวประมาณ 1–3 วัน)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-xs"
                />
              </div>
            </div>
          </div>

          {/* โลโก้ร้าน */}
          <div>
            <label className="block text-xs font-semibold mb-1">
              โลโก้ร้าน (อัปโหลดขึ้น R2 หรือใส่ URL)
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {form.logo_url && (
                <img
                  src={form.logo_url}
                  alt="Logo Preview"
                  className="h-12 w-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1"
                />
              )}
              <input
                type="text"
                value={form.logo_url || ''}
                onChange={(e) => updateField('logo_url', e.target.value)}
                className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
              />
              <label className="px-4 py-2.5 rounded-xl bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                {uploadingLogo ? 'กำลังอัปโหลด...' : 'อัปโหลดโลโก้ใหม่'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* รูปโชว์หน้าร้านบนการ์ดหน้าแรก (Hero Showcase Image) */}
          <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/35 border border-[var(--color-border)] space-y-2.5">
            <label className="block text-xs font-bold text-[var(--color-secondary)]">
              รูปโชว์หน้าร้านบนการ์ดหน้าแรก (Hero Showcase Image — กรอบขวาบนหน้าแรก)
            </label>
            <p className="text-[11px] text-[var(--color-secondary-muted)]">
              อัปโหลดรูปภาพร้านหรือผลงานเด่นเพื่อแสดงในกรอบขวาบนหน้าแรกได้ทันที (บันทึกอัตโนมัติเมื่อเลือกรูป) หรือกดปุ่มรีเซ็ตเพื่อแสดงการ์ดโปรไฟล์ @qokhims ค่ะ
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <img
                src={
                  form.hero_image_url &&
                  form.hero_image_url !== '/r2/seed/product-banner.svg'
                    ? form.hero_image_url
                    : '/qokhims-profile.png'
                }
                alt="Hero Showcase Preview"
                className="h-16 w-16 object-cover rounded-2xl border border-[var(--color-border)] bg-white shrink-0"
              />
              <input
                type="text"
                value={form.hero_image_url || ''}
                onChange={(e) => updateField('hero_image_url', e.target.value)}
                placeholder="เว้นว่างหรือใส่ /r2/seed/product-banner.svg เพื่อแสดงการ์ดโปรไฟล์ @qokhims"
                className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-xs"
              />
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <label className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-95 transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingHeroImage ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปร้านหน้าแรก'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroImageUpload}
                    className="hidden"
                  />
                </label>
                {form.hero_image_url &&
                  form.hero_image_url !== '/r2/seed/product-banner.svg' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const nextForm = {
                          ...form,
                          hero_image_url: '/r2/seed/product-banner.svg',
                        };
                        setForm(nextForm);
                        await fetch('/api/admin/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ settings: nextForm }),
                        });
                        await refreshSiteData();
                        showToast('สลับกลับเป็นการ์ดโปรไฟล์ @qokhims เรียบร้อยค่ะ ♡', 'info');
                      }}
                      className="px-3 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-[var(--color-secondary)] text-xs font-semibold hover:bg-[var(--color-bg)] transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      ใช้การ์ดโปรไฟล์ @qokhims
                    </button>
                  )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              ข้อความพาดหัวหลักหน้าแรก (Hero Title)
            </label>
            <input
              type="text"
              value={form.hero_title || ''}
              onChange={(e) => updateField('hero_title', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              คำอธิบายรองหน้าแรก (Hero Subtitle)
            </label>
            <textarea
              rows={2}
              value={form.hero_subtitle || ''}
              onChange={(e) => updateField('hero_subtitle', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              ข้อความแนะนำร้านในส่วนท้ายเว็บ (Footer About)
            </label>
            <textarea
              rows={2}
              value={form.about_text || ''}
              onChange={(e) => updateField('about_text', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
            />
          </div>
        </div>

        {/* 2. ช่องทางติดต่อ (ถ้าว่างหน้าบ้านจะซ่อนไอคอนอัตโนมัติ) */}
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <MessageCircle className="w-4 h-4 text-[var(--color-primary)]" />
            2. ช่องทางติดต่อร้าน (ช่องไหนเว้นว่างไว้ หน้าเว็บจะซ่อนไอคอนให้อัตโนมัติ)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                LINE Official Account ID (เช่น @280npxvj)
              </label>
              <input
                type="text"
                value={form.contact_line || ''}
                onChange={(e) => updateField('contact_line', e.target.value)}
                placeholder="@280npxvj"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Instagram (เช่น qokhims)
              </label>
              <input
                type="text"
                value={form.contact_ig || ''}
                onChange={(e) => updateField('contact_ig', e.target.value)}
                placeholder="qokhims"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Facebook Page (เว้นว่างได้หากยังไม่เปิดใช้)
              </label>
              <input
                type="text"
                value={form.contact_facebook || ''}
                onChange={(e) => updateField('contact_facebook', e.target.value)}
                placeholder="ชื่อเพจ หรือลิงก์ https://facebook.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                TikTok (เว้นว่างได้หากยังไม่เปิดใช้)
              </label>
              <input
                type="text"
                value={form.contact_tiktok || ''}
                onChange={(e) => updateField('contact_tiktok', e.target.value)}
                placeholder="@qokhims"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                อีเมลติดต่อ (เว้นว่างได้)
              </label>
              <input
                type="email"
                value={form.contact_email || ''}
                onChange={(e) => updateField('contact_email', e.target.value)}
                placeholder="contact@qokhims.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                เบอร์โทรศัพท์ (เว้นว่างได้)
              </label>
              <input
                type="text"
                value={form.contact_phone || ''}
                onChange={(e) => updateField('contact_phone', e.target.value)}
                placeholder="08x-xxx-xxxx"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              />
            </div>
          </div>

          {/* ตั้งค่าแจ้งเตือนคำสั่งซื้อเข้า LINE แอดมินอัตโนมัติ (LINE Messaging API) */}
          <div className="pt-4 border-t border-[var(--color-border)]/70 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enable_line_messaging_api === 'true'}
                  onChange={(e) =>
                    updateField(
                      'enable_line_messaging_api',
                      e.target.checked ? 'true' : 'false'
                    )
                  }
                  className="w-4 h-4 accent-[var(--color-primary)]"
                />
                <span className="text-xs sm:text-sm font-bold text-[var(--color-secondary)]">
                  เปิดใช้งานส่ง Push Message แจ้งเตือนคำสั่งซื้อผ่าน LINE Messaging API อัตโนมัติ
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowLineGuide((prev) => !prev)}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showLineGuide ? 'ซ่อนวิธีตั้งค่า' : 'ดูวิธีนำค่าจาก LINE มาใส่'}
              </button>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-primary-light)]/40 border border-[var(--color-border)] space-y-4">
              <p className="text-xs text-[var(--color-secondary-muted)] leading-relaxed">
                ร้านสามารถกรอกหรือเปลี่ยนค่า <strong>Channel Access Token</strong> และ <strong>Admin User ID</strong> ในช่องด้านล่างนี้ได้เองตลอดเวลา (ระบบเก็บเป็นความลับเฉพาะแอดมิน ไม่แสดงออกหน้าเว็บ) หรือจะตั้งผ่าน <code>wrangler secret</code> ก็ได้ค่ะ
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                    1. LINE Channel Access Token (Long-lived)
                    {envLineStatus.has_env_token && !form.line_channel_access_token && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">
                        มีค่าใน wrangler secret แล้ว
                      </span>
                    )}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showLineToken ? 'text' : 'password'}
                      value={form.line_channel_access_token || ''}
                      onChange={(e) =>
                        updateField('line_channel_access_token', e.target.value)
                      }
                      placeholder="วาง Channel Access Token (long-lived) จากหน้า LINE Developers ที่นี่..."
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLineToken((prev) => !prev)}
                      className="absolute right-2.5 p-1.5 text-[var(--color-secondary-muted)] hover:text-[var(--color-secondary)] cursor-pointer"
                      title={showLineToken ? 'ซ่อนรหัส Token' : 'แสดงรหัส Token'}
                    >
                      {showLineToken ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                    2. LINE Admin User ID (รหัสผู้รับแจ้งเตือน)
                    {envLineStatus.has_env_user_id && !form.line_admin_user_id && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">
                        มีค่าใน wrangler secret แล้ว
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.line_admin_user_id || ''}
                    onChange={(e) => updateField('line_admin_user_id', e.target.value)}
                    placeholder="เช่น U1234567890abcdef1234567890abcdef"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-xs font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleTestLinePush}
                    disabled={testingLine}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#06C755] text-white text-xs font-bold hover:opacity-95 transition inline-flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testingLine
                      ? 'กำลังทดสอบส่งเข้า LINE...'
                      : 'บันทึกค่า & ทดสอบส่งเข้า LINE แอดมิน'}
                  </button>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-[var(--color-border)]/50">
                  <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                    3. อีเมลแจ้งเตือนออเดอร์ของร้าน (Fallback Notification Email)
                  </label>
                  <input
                    type="email"
                    value={form.notification_email || ''}
                    onChange={(e) => updateField('notification_email', e.target.value)}
                    placeholder="เช่น contact@qokhims.com หรือ yourname@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-xs"
                  />
                  <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                    ระบบจะใช้อีเมลนี้เป็นช่องทางแจ้งเตือนสำรองอัตโนมัติ เมื่อยังไม่ได้ตั้งค่า LINE Messaging API หรือเกิดเหตุขัดข้อง
                  </p>
                </div>
              </div>

              {showLineGuide && (
                <div className="p-4 rounded-2xl bg-white border border-[var(--color-border)] text-xs space-y-2.5">
                  <div className="font-bold text-[var(--color-secondary)] flex items-center justify-between gap-2">
                    <span>📌 วิธีนำค่าจาก LINE มาใส่ด้วยตัวเอง (ทำตามทีละขั้นได้เลยค่ะ)</span>
                    <a
                      href="https://developers.line.biz/console/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      เปิด LINE Developers <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[var(--color-secondary-muted)] leading-relaxed">
                    <li>
                      เข้าเว็บ{' '}
                      <a
                        href="https://manager.line.biz/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] font-semibold underline"
                      >
                        LINE Official Account Manager
                      </a>{' '}
                      ของร้าน (<code>@280npxvj</code>) → ไปที่ <strong>ตั้งค่า (Settings)</strong> → เมนู <strong>Messaging API</strong> → กด <strong>เปิดใช้งาน Messaging API</strong> (หากเปิดไว้แล้วข้ามขั้นนี้ได้เลยค่ะ)
                    </li>
                    <li>
                      เข้าเว็บ{' '}
                      <a
                        href="https://developers.line.biz/console/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] font-semibold underline"
                      >
                        LINE Developers Console
                      </a>{' '}
                      คลิกเลือก Provider และ Channel ของร้าน
                    </li>
                    <li>
                      <strong>วิธีเอา LINE Admin User ID:</strong> ดูที่แท็บ <strong>Basic settings</strong> เลื่อนลงมาล่างสุดที่หัวข้อ <strong>Your user ID</strong> จะเห็นรหัสที่ขึ้นต้นด้วยตัว <code>U...</code> (เช่น <code>U89a1b2c3...</code>) คัดลอกมาวางในช่องที่ 2 ด้านบน <em>(อย่าลืมใช้ไลน์ส่วนตัวของแอดมินแอดเพื่อนกับ LINE ร้าน @280npxvj ด้วยนะคะ)</em>
                    </li>
                    <li>
                      <strong>วิธีเอา Channel Access Token:</strong> ไปที่แท็บ <strong>Messaging API</strong> เลื่อนลงมาล่างสุดที่หัวข้อ <strong>Channel access token (long-lived)</strong> กดปุ่ม <strong>Issue</strong> แล้วคัดลอกรหัสยาว ๆ มาวางในช่องที่ 1 ด้านบน
                    </li>
                    <li>
                      กดปุ่มสีเขียว <strong>"บันทึกค่า & ทดสอบส่งเข้า LINE แอดมิน"</strong> ระบบจะบันทึกค่าและยิงข้อความทดสอบเข้าแชต LINE ของแอดมินทันทีค่ะ ♡
                    </li>
                  </ol>
                  <div className="pt-2 border-t border-dashed border-[var(--color-border)] text-[11px] text-[var(--color-secondary-muted)]">
                    💡 <strong>ทางเลือกสำหรับนักพัฒนา (CLI):</strong> หากต้องการตั้งผ่าน Cloudflare Secret โดยตรง สามารถรันคำสั่ง{' '}
                    <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-secondary)]">
                      npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
                    </code>{' '}
                    และ{' '}
                    <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-secondary)]">
                      npx wrangler secret put LINE_ADMIN_USER_ID
                    </code>{' '}
                    ในเทอร์มินัลได้เช่นกันค่ะ
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. ข้อมูลรับชำระเงิน & โฟลเดอร์ผลงาน Google Drive */}
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-4">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--color-primary)]" />
              3. ข้อมูลรับชำระเงิน & โฟลเดอร์รวมผลงาน (Google Drive)
            </h2>
            <p className="text-xs text-[var(--color-secondary-muted)] mt-1">
              ใช้สำหรับสร้าง QR Code พร้อมเพย์ให้ลูกค้าสแกนจ่ายบนเว็บ และปุ่มเปิดโฟลเดอร์ Google Drive รวมผลงาน
            </p>
          </div>

          <div className="space-y-4">
            {/* โฟลเดอร์ Google Drive รวมผลงาน */}
            <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/40 border border-[var(--color-border)] space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[var(--color-primary)]" />
                <label className="text-xs font-bold text-[var(--color-secondary)]">
                  ลิงก์ Google Drive รวมผลงานออกแบบของร้าน (Portfolio)
                </label>
              </div>
              <input
                type="url"
                value={form.portfolio_drive_url || ''}
                onChange={(e) => updateField('portfolio_drive_url', e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-xs font-mono"
              />
              <p className="text-[11px] text-[var(--color-secondary-muted)]">
                ปุ่ม "เปิดดูโฟลเดอร์ผลงานทั้งหมด" บนหน้าแรกจะเปิดไปยังลิงก์นี้ (สามารถแชร์สิทธิ์เป็น Anyone with the link can view ได้เลยค่ะ)
              </p>
            </div>

            {/* บัญชีธนาคาร & PromptPay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                  เบอร์โทรศัพท์ หรือเลขบัตร ปชช. สำหรับ PromptPay (QR Code) *
                </label>
                <input
                  type="text"
                  value={form.promptpay_number || ''}
                  onChange={(e) => updateField('promptpay_number', e.target.value)}
                  placeholder="เช่น 0812345678 หรือ 1234567890123"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-mono font-bold"
                />
                <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                  ระบบจะนำเบอร์นี้ไปสร้างเป็น QR Code PromptPay พร้อมยอดเงินในหน้าชำระเงินอัตโนมัติ
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                  ชื่อธนาคาร *
                </label>
                <input
                  type="text"
                  value={form.bank_name || ''}
                  onChange={(e) => updateField('bank_name', e.target.value)}
                  placeholder="เช่น กสิกรไทย (KBANK), ไทยพาณิชย์ (SCB), กรุงไทย"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                  เลขที่บัญชีธนาคาร *
                </label>
                <input
                  type="text"
                  value={form.bank_account_number || ''}
                  onChange={(e) => updateField('bank_account_number', e.target.value)}
                  placeholder="เช่น 123-4-56789-0"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                  ชื่อบัญชีธนาคาร *
                </label>
                <input
                  type="text"
                  value={form.bank_account_name || ''}
                  onChange={(e) => updateField('bank_account_name', e.target.value)}
                  placeholder="เช่น น.ส. ภัคจิรา..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3.1 ระบบตรวจสอบสลิปอัตโนมัติ (Slip Verification System) */}
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
              ระบบตรวจสอบสลิปอัตโนมัติ (Slip Verification)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-border)]">
              รองรับ SlipOK / EasySlip
            </span>
          </div>

          <p className="text-xs text-[var(--color-secondary-muted)] leading-relaxed">
            ระบบตรวจสอบสลิปโอนเงินอัตโนมัติทันทีที่ลูกค้าอัปโหลดสลิป ช่วยเช็คความถูกต้องของยอดเงิน, ป้องกันลูกค้านำสลิปเดิมมาใช้ซ้ำ (Anti-Fraud), ตรวจสอบบัญชีผู้รับเงิน และเปลี่ยนสถานะคำสั่งซื้อให้อัตโนมัติโดยที่ร้านไม่ต้องรอเช็คเองทุกยอดค่ะ ♡
          </p>

          {/* สวิตช์เปิด/ปิดระบบตรวจสอบสลิป */}
          <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[var(--color-secondary)] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                เปิดใช้งานระบบตรวจสอบสลิปอัตโนมัติ
              </p>
              <p className="text-[11px] text-[var(--color-secondary-muted)] mt-0.5">
                เมื่อเปิดใช้งาน ลูกค้าที่แนบสลิปจะได้รับการตรวจยอดเงินและยืนยันออเดอร์ทันที
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.slip_verify_enabled === 'true'}
                onChange={(e) =>
                  updateField('slip_verify_enabled', e.target.checked ? 'true' : 'false')
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>

          {/* ตัวเลือกการตั้งค่าผู้ให้บริการ */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                  ผู้ให้บริการตรวจสอบสลิป (Provider) *
                </label>
                <select
                  value={form.slip_verify_provider || 'slipok'}
                  onChange={(e) => updateField('slip_verify_provider', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-secondary)]"
                >
                  <option value="slipok">SlipOK (แนะนำสำหรับร้านค้าไทย - ตรวจได้ทุกธนาคาร)</option>
                  <option value="easyslip">EasySlip (developer.easyslip.com)</option>
                  <option value="mock">โหมดจำลองสำหรับทดสอบ (Sandbox/Mock - ไม่ตัดเครดิต)</option>
                </select>
                <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                  {form.slip_verify_provider === 'mock'
                    ? 'โหมดจำลอง: จะจำลองว่าสลิปถูกต้องเสมอ เหมาะสำหรับทดสอบการทำงานของระบบสั่งซื้อ'
                    : 'แนะนำ SlipOK สำหรับการใช้งานจริงในประเทศไทย มีความแม่นยำสูงและคิดค่าบริการตามจริง'}
                </p>
              </div>

              {form.slip_verify_provider !== 'easyslip' && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--color-secondary)]">
                    Branch ID / รหัสสาขา (สำหรับ SlipOK) *
                  </label>
                  <input
                    type="text"
                    value={form.slip_verify_branch_id || ''}
                    onChange={(e) => updateField('slip_verify_branch_id', e.target.value)}
                    placeholder="เช่น 1234 (ดูได้จากเมนูสาขาใน SlipOK)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-mono"
                  />
                  <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                    รหัสสาขาตัวเลขที่ได้จากแดชบอร์ด SlipOK (หน้ารายการสาขา)
                  </p>
                </div>
              )}
            </div>

            {form.slip_verify_provider !== 'mock' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--color-secondary)]">
                    API Key / Secret Key *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSlipApiKey(!showSlipApiKey)}
                    className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showSlipApiKey ? (
                      <>
                        <EyeOff className="w-3 h-3" /> ซ่อนรหัส
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> แสดงรหัส
                      </>
                    )}
                  </button>
                </div>
                <input
                  type={showSlipApiKey ? 'text' : 'password'}
                  value={form.slip_verify_api_key || ''}
                  onChange={(e) => updateField('slip_verify_api_key', e.target.value)}
                  placeholder="เช่น slp_xxxxxxxxxxxx หรือคีย์ที่ได้รับจากผู้ให้บริการ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-mono"
                />
                <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                  คีย์นี้จะถูกเก็บรักษาอย่างปลอดภัยใน Cloudflare D1/R2 และจะไม่เปิดเผยแก่ผู้ใช้ทั่วไปหน้าเว็บ
                </p>
              </div>
            )}

            {/* ตัวเลือกเงื่อนไขการตรวจ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] transition">
                <input
                  type="checkbox"
                  checked={form.slip_verify_auto_confirm !== 'false'}
                  onChange={(e) =>
                    updateField('slip_verify_auto_confirm', e.target.checked ? 'true' : 'false')
                  }
                  className="mt-0.5 rounded text-[var(--color-primary)] focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-[var(--color-secondary)] block">
                    ยืนยันคำสั่งซื้ออัตโนมัติ
                  </span>
                  <span className="text-[11px] text-[var(--color-secondary-muted)]">
                    เมื่อสลิปผ่านการตรวจสอบ จะเปลี่ยนสถานะออเดอร์เป็น "ยืนยันแล้ว" ทันที
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] transition">
                <input
                  type="checkbox"
                  checked={form.slip_verify_check_receiver !== 'false'}
                  onChange={(e) =>
                    updateField('slip_verify_check_receiver', e.target.checked ? 'true' : 'false')
                  }
                  className="mt-0.5 rounded text-[var(--color-primary)] focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-[var(--color-secondary)] block">
                    ตรวจสอบบัญชีผู้รับเงิน
                  </span>
                  <span className="text-[11px] text-[var(--color-secondary-muted)]">
                    ตรวจว่าเลขบัญชีหรือเบอร์พร้อมเพย์ในสลิปตรงกับบัญชีของร้าน qokhims
                  </span>
                </div>
              </label>
            </div>

            {/* ผลการทดสอบ API สลิป */}
            {slipTestResult && (
              <div
                className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                  slipTestResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {slipTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  {slipTestResult.success ? 'เชื่อมต่อ API สลิปสำเร็จ' : 'การเชื่อมต่อล้มเหลว'}
                </div>
                <p className="text-[11px]">{slipTestResult.message}</p>
              </div>
            )}

            {/* ปุ่มทดสอบการเชื่อมต่อ API */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]/70">
              <button
                type="button"
                onClick={() => setShowSlipGuide(!showSlipGuide)}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showSlipGuide ? 'ซ่อนคำแนะนำการสมัคร SlipOK' : 'ดูวิธีสมัครและรับ API Key ของ SlipOK'}
              </button>

              <button
                type="button"
                onClick={handleTestSlip}
                disabled={testingSlip}
                className="px-5 py-2.5 rounded-full bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-primary)] border border-[var(--color-border)] text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingSlip ? 'animate-spin' : ''}`} />
                {testingSlip ? 'กำลังทดสอบการเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อ API สลิป'}
              </button>
            </div>

            {/* คู่มือแนะนำการสมัคร SlipOK */}
            {showSlipGuide && (
              <div className="p-4 rounded-2xl bg-[var(--color-primary-light)]/40 border border-[var(--color-border)] text-xs text-[var(--color-secondary)] space-y-2 animate-fade-in">
                <div className="font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  วิธีเริ่มต้นใช้งาน SlipOK สำหรับร้านค้า:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-[var(--color-secondary)] pl-1">
                  <li>
                    สมัครบัญชีใช้งานที่{' '}
                    <a
                      href="https://slipok.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] underline font-bold"
                    >
                      slipok.com
                    </a>{' '}
                    (มีเครดิตฟรีให้ทดลองใช้งาน)
                  </li>
                  <li>
                    ไปที่เมนู <strong>"สาขา" (Branch)</strong> กดสร้างสาขาใหม่ แล้วคัดลอกตัวเลข <strong>Branch ID</strong> มาใส่ในช่องด้านบน
                  </li>
                  <li>
                    ไปที่เมนู <strong>"API Key"</strong> กดสร้างคีย์ และคัดลอก <strong>API Key</strong> มาวางในช่องด้านบน
                  </li>
                  <li>
                    กดปุ่ม <strong>"ทดสอบการเชื่อมต่อ API สลิป"</strong> เพื่อยืนยันว่าระบบเชื่อมต่อสำเร็จ
                  </li>
                  <li>
                    กดปุ่ม <strong>"บันทึกการตั้งค่าเว็บไซต์"</strong> ที่ด้านบนสุดของหน้าเพื่อเริ่มใช้งานจริงค่ะ ♡
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* 4. ตั้งค่าสีและธีม (CSS Variables) */}
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--color-primary)]" />
              4. สีและธีมของเว็บไซต์ (ชมพู + น้ำตาลเข้ม)
            </h2>
            <button
              type="button"
              onClick={() => {
                const def = THEME_PRESETS[0];
                updateField('theme_primary', def.primary);
                updateField('theme_primary_light', def.primaryLight);
                updateField('theme_secondary', def.secondary);
                updateField('theme_bg', def.bg);
                updateField('theme_font', 'Prompt');
              }}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              คืนค่าสีเริ่มต้น
            </button>
          </div>

          {/* ปุ่มเลือกโทนสีสำเร็จรูป */}
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  updateField('theme_primary', preset.primary);
                  updateField('theme_primary_light', preset.primaryLight);
                  updateField('theme_secondary', preset.secondary);
                  updateField('theme_bg', preset.bg);
                }}
                className="px-3.5 py-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <span
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: preset.primary }}
                />
                <span
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: preset.secondary }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                สีหลัก (ชมพู Primary)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.theme_primary || '#ec7a9a'}
                  onChange={(e) => updateField('theme_primary', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[var(--color-border)] cursor-pointer"
                />
                <input
                  type="text"
                  value={form.theme_primary || '#ec7a9a'}
                  onChange={(e) => updateField('theme_primary', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                สีรอง (น้ำตาลเข้ม Secondary)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.theme_secondary || '#4a3228'}
                  onChange={(e) => updateField('theme_secondary', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[var(--color-border)] cursor-pointer"
                />
                <input
                  type="text"
                  value={form.theme_secondary || '#4a3228'}
                  onChange={(e) => updateField('theme_secondary', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                สีพื้นหลังอ่อน (Primary Light)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.theme_primary_light || '#fceef2'}
                  onChange={(e) => updateField('theme_primary_light', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[var(--color-border)] cursor-pointer"
                />
                <input
                  type="text"
                  value={form.theme_primary_light || '#fceef2'}
                  onChange={(e) => updateField('theme_primary_light', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                ฟอนต์หลักของเว็บไซต์
              </label>
              <select
                value={form.theme_font || 'Prompt'}
                onChange={(e) => updateField('theme_font', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              >
                <option value="Prompt">Prompt (อ่านง่าย ทันสมัย)</option>
                <option value="Kanit">Kanit (สะอาดตา มินิมอล)</option>
                <option value="Mali">Mali (ลายมือกลมปุ๊กปิ๊ก)</option>
                <option value="Kodchasan">Kodchasan (วัยรุ่น น่ารัก)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. ตั้งค่าระบบสะสมแต้ม (Loyalty Points) */}
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <Gift className="w-4 h-4 text-[var(--color-primary)]" />
              5. ตั้งค่าระบบสะสมแต้ม (Loyalty Points & Rewards)
            </h2>
            <a
              href="/admin/members"
              className="text-xs font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
            >
              ไปที่หน้าจัดการสมาชิก & ของรางวัล →
            </a>
          </div>

          <div className="space-y-4">
            {/* สวิตช์เปิด/ปิดระบบแต้มทั้งหมด */}
            <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--color-secondary)] block">
                  เปิดใช้งานระบบสะสมแต้มบนเว็บไซต์
                </span>
                <span className="text-xs text-[var(--color-secondary-muted)]">
                  หากปิดสวิตช์นี้ เมนูสะสมแต้ม การ์ดแสตมป์ และช่องใส่รหัสสมาชิกตอนสั่งซื้อจะถูกซ่อนออกจากหน้าบ้านทั้งหมด
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.loyalty_enabled !== 'false'}
                  onChange={(e) =>
                    updateField('loyalty_enabled', e.target.checked ? 'true' : 'false')
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  อัตราได้แต้ม (ยอดคำสั่งซื้อทุกกี่บาท = 1 แต้ม)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={form.baht_per_point || '10'}
                    onChange={(e) => updateField('baht_per_point', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] font-bold text-[var(--color-secondary)]"
                  />
                  <span className="text-xs font-semibold text-[var(--color-secondary-muted)] shrink-0">
                    บาท/แต้ม
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                  เช่น ใส่ 10 หมายถึง สั่งซื้อ 100 บาท ได้รับ 10 แต้ม
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  อายุของแต้มสะสม (เดือน)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.points_expiry_months || '0'}
                    onChange={(e) => updateField('points_expiry_months', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] font-bold text-[var(--color-secondary)]"
                  />
                  <span className="text-xs font-semibold text-[var(--color-secondary-muted)] shrink-0">
                    เดือน
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                  ใส่ 0 หมายถึง "ไม่มีวันหมดอายุ" (แต้มคงอยู่ตลอดไป)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  แต้มโบนัสเมื่อเขียนรีวิว
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.review_bonus_points || '0'}
                    onChange={(e) => updateField('review_bonus_points', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] font-bold text-[var(--color-secondary)]"
                  />
                  <span className="text-xs font-semibold text-[var(--color-secondary-muted)] shrink-0">
                    แต้ม
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-secondary-muted)] mt-1">
                  ใส่ 0 เพื่อปิดโบนัสรีวิว หรือใส่ตัวเลขเช่น 5 แต้ม/รีวิว
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm hover:opacity-95 transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่าทั้งหมด'}
          </button>
        </div>
      </form>

      {/* 7. เปลี่ยนรหัสผ่านผู้ดูแลระบบ */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-2xs space-y-4 text-sm"
      >
        <h2 className="text-base font-bold text-[var(--color-secondary)] flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <KeyRound className="w-4 h-4 text-[var(--color-primary)]" />
          7. เปลี่ยนรหัสผ่านแอดมิน (PBKDF2 Hash)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">รหัสผ่านปัจจุบัน</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={changingPw}
            className="px-6 py-2.5 rounded-full bg-[var(--color-secondary)] text-white text-xs font-semibold hover:bg-[var(--color-primary)] transition cursor-pointer"
          >
            {changingPw ? 'กำลังอัปเดตรหัสผ่าน...' : 'เปลี่ยนรหัสผ่านแอดมิน'}
          </button>
        </div>
      </form>
    </div>
  );
};
