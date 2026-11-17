import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { CuteFlower } from '../../components/ui/Decorations';

export const AdminLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      showToast('ยินดีต้อนรับเข้าสู่ระบบจัดการร้าน qokhims ค่ะ ♡', 'success');
      navigate('/admin', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-primary-light)]/70 to-[var(--color-bg)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.2rem] border-2 border-[var(--color-border)] p-7 sm:p-9 shadow-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] border-2 border-[var(--color-border)] p-1 flex items-center justify-center mx-auto shadow-xs">
            <img
              src="/qokhims-profile.png"
              alt="qokhims"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
            <CuteFlower className="w-3.5 h-3.5" /> Admin Portal
          </span>
          <h1 className="text-2xl font-bold text-[var(--color-secondary)]">
            เข้าสู่ระบบหลังบ้าน qokhims
          </h1>
          <p className="text-xs text-[var(--color-secondary-muted)]">
            ป้องกันด้วยรหัสผ่าน PBKDF2 Hash และ JWT ใน httpOnly Cookie
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1.5">
              ชื่อผู้ดูแลระบบ (Username)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--color-secondary-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-secondary)] mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--color-secondary-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[var(--color-secondary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)] transition shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? 'กำลังตรวจสอบรหัสผ่าน...' : 'เข้าสู่ระบบจัดการร้าน'}
          </button>
        </form>

        <div className="pt-4 border-t border-[var(--color-border)]/70 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secondary-muted)] hover:text-[var(--color-primary)] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            กลับไปหน้าเว็บไซต์หลัก
          </Link>
        </div>
      </div>
    </div>
  );
};
