'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  Gauge,
  Wrench,
  AlertTriangle,
  History,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  Receipt,
  Users,
  Droplet,
  Fuel,
  CreditCard,
  PieChart,
  FileText,
  Bell,
  UserCheck,
  ShieldAlert,
  Settings,
  ChevronDown,
  Building2,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'نظرة عامة والأسطول',
    items: [
      { title: 'لوحة التحكم الرئيسية', href: '/', icon: LayoutDashboard },
      { title: 'سجل المركبات', href: '/vehicles', icon: Truck },
      { title: 'الإدارات وأقسام الأسطول', href: '/departments', icon: Building2 },
      { title: 'سجل قراءات العداد', href: '/odometer', icon: Gauge },
      { title: 'التراخيص والمستندات', href: '/documents', icon: FileText },
    ],
  },
  {
    title: 'الصيانة والورش',
    items: [
      { title: 'أوامر الصيانة', href: '/maintenance/orders', icon: Wrench },
      { title: 'الأعطال والبلاغات الطارئة', href: '/maintenance/breakdowns', icon: AlertTriangle },
      { title: 'العمرات الكبرى والضمان', href: '/maintenance/overhauls', icon: History },
      { title: 'تغيير الزيوت والفلتر', href: '/lubricants', icon: Droplet },
    ],
  },
  {
    title: 'المخزون والمشتريات',
    items: [
      { title: 'مخزون قطع الغيار', href: '/inventory/parts', icon: Boxes },
      { title: 'حركات المخزون', href: '/inventory/movements', icon: ArrowLeftRight },
      { title: 'طلبات وأوامر الشراء', href: '/procurement/orders', icon: ShoppingCart },
      { title: 'الموردون والفواتير', href: '/procurement/suppliers', icon: Receipt },
    ],
  },
  {
    title: 'الوقود والمالية',
    items: [
      { title: 'تعبئة الوقود والكفاءة', href: '/fuel', icon: Fuel },
      { title: 'سجل المصروفات الموحد', href: '/expenses', icon: CreditCard },
      { title: 'الميزانيات ومراكز التكلفة', href: '/budgets', icon: PieChart },
      { title: 'التقارير والتحليلات', href: '/reports', icon: FileText },
    ],
  },
  {
    title: 'النظام والرقابة',
    items: [
      { title: 'مركز التنبيهات', href: '/notifications', icon: Bell },
      { title: 'المستخدمون والصلاحيات', href: '/admin/users', icon: UserCheck },
      { title: 'سجل التدقيق الرقابي', href: '/admin/audit-logs', icon: ShieldAlert },
      { title: 'إعدادات النظام والنسخ', href: '/admin/settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  // If on login page, don't show sidebar
  if (pathname === '/login') return null;

  return (
    <aside className="w-72 bg-slate-900 text-slate-200 min-h-screen flex flex-col border-l border-slate-800 shadow-xl z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fleet-600 to-fleet-400 flex items-center justify-center text-white shadow-lg shadow-fleet-500/20">
          <Truck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight">أسطول المركبات ERP</h1>
          <p className="text-xs text-slate-400 font-medium">On-Premises Fleet Engine</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-fleet-600 text-white shadow-md shadow-fleet-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>خادم محلي: LAN متصل</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">v1.0.0</span>
      </div>
    </aside>
  );
}
