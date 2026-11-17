'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, ShieldCheck, Lock, User, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل في تسجيل الدخول');
        setLoading(false);
        return;
      }

      setSuccess('تم تسجيل الدخول بنجاح! جاري تحويلك إلى لوحة التحكم...');
      setTimeout(() => {
        router.push('/');
      }, 600);
    } catch {
      setError('تعذر الاتصال بخادم النظام الداخلي');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden font-cairo" dir="rtl">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-fleet-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fleet-600 to-fleet-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-fleet-500/20 mb-4">
            <Truck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">نظام إدارة أسطول المركبات</h1>
          <p className="text-sm text-slate-400">منظومة الإدارة المتكاملة On-Premises ERP</p>
        </div>

        {/* Error / Success alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">اسم المستخدم</label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-4 pr-11 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-fleet-500 focus:border-transparent transition-all"
                placeholder="أدخل اسم المستخدم"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-4 pr-11 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-fleet-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-fleet-600 to-fleet-500 hover:from-fleet-500 hover:to-fleet-400 text-white font-bold rounded-xl shadow-lg shadow-fleet-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جاري التحقق من الصلاحيات...</span>
              </span>
            ) : (
              <>
                <span>تسجيل الدخول إلى النظام</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
            <ShieldCheck className="w-4 h-4 text-fleet-400" />
            <span>بيانات حساب مدير النظام الافتراضي (تجريبي):</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono text-[11px] flex justify-between items-center text-slate-300">
            <span>المستخدم: <strong className="text-fleet-300">admin</strong></span>
            <span>كلمة المرور: <strong className="text-fleet-300">admin123456</strong></span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500 text-center">
        نظام أسطول النقل الداخلي المرخص • شبكة LAN / VPN الداخلية • إصدار الخادم 2026
      </p>
    </div>
  );
}
