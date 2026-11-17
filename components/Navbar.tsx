'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell, User, LogOut, ShieldCheck, Database, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );

    if (pathname === '/login') return;

    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.authenticated) {
          setCurrentUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (pathname === '/login') return null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث سريع برقم المركبة، اللوحة، أمر الصيانة..."
            className="w-full pl-4 pr-10 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fleet-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Date / Server indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-600" />
          <span>{formattedDate || 'جاري التحميل...'}</span>
        </div>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative p-2 text-slate-600 hover:text-fleet-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="التنبيهات"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </Link>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3 border-r border-slate-200 pr-4">
          <div className="w-9 h-9 rounded-full bg-fleet-100 border border-fleet-200 flex items-center justify-center text-fleet-700 font-bold text-sm">
            {currentUser?.fullName?.charAt(0) || <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {currentUser?.fullName || 'المستخدم'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {currentUser?.roles?.[0] || 'مدير النظام'}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mr-2"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
