import React from 'react';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { AlertTriangle, Plus, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BreakdownsPage() {
  const breakdowns = await prisma.maintenanceOrder.findMany({
    where: { orderType: 'BREAKDOWN' },
    include: { vehicle: true, parts: true },
    orderBy: { openedAt: 'desc' },
  });

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <span>الأعطال والبلاغات الطارئة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل ومتابعة الأعطال الميدانية المفاجئة وسرعة الاستجابة وتحديد أسباب التوقف
          </p>
        </div>

        <Link
          href="/maintenance/orders"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل بلاغ عطل طارئ</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">رقم البلاغ</th>
                <th className="py-3.5 px-4 font-bold">المركبة</th>
                <th className="py-3.5 px-4 font-bold">الأولوية</th>
                <th className="py-3.5 px-4 font-bold">وصف الشكوى / العطل</th>
                <th className="py-3.5 px-4 font-bold">التشخيص الفني</th>
                <th className="py-3.5 px-4 font-bold">التكلفة</th>
                <th className="py-3.5 px-4 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breakdowns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    لا توجد بلاغات أعطال طارئة حالياً.
                  </td>
                </tr>
              ) : (
                breakdowns.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold">{b.orderNumber}</td>
                    <td className="py-3.5 px-4 font-semibold">{b.vehicle?.internalCode}</td>
                    <td className="py-3.5 px-4 font-bold text-rose-600">{b.priority}</td>
                    <td className="py-3.5 px-4 text-xs">{b.complaint || 'عطل ميكانيكي مفاجئ'}</td>
                    <td className="py-3.5 px-4 text-xs">{b.diagnosis || 'جاري الفحص'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{b.laborCost} ر.س</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
