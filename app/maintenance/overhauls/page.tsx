import React from 'react';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { History, ShieldCheck, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OverhaulsPage() {
  const overhauls = await prisma.maintenanceOrder.findMany({
    where: {
      orderType: { in: ['ENGINE_OVERHAUL', 'GEARBOX_OVERHAUL', 'MAJOR_REPAIR'] },
    },
    include: { vehicle: true, parts: true },
    orderBy: { openedAt: 'desc' },
  });

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-6 h-6 text-fleet-600" />
          <span>العمرات الكبرى وسجل الضمانات الفنية</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          توثيق عمرات المحركات ونواقل الحركة، بنود الضمان، وتحليل الجدوى الاقتصادية لإصلاح أو إحلال المركبة
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">رقم أمر العمرة</th>
                <th className="py-3.5 px-4 font-bold">المركبة</th>
                <th className="py-3.5 px-4 font-bold">نوع العمرة</th>
                <th className="py-3.5 px-4 font-bold">عداد المركبة وقت العمرة</th>
                <th className="py-3.5 px-4 font-bold">التكلفة الإجمالية</th>
                <th className="py-3.5 px-4 font-bold">فترة الضمان</th>
                <th className="py-3.5 px-4 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overhauls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    لا توجد عمرات كبرى مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                overhauls.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold">{o.orderNumber}</td>
                    <td className="py-3.5 px-4 font-semibold">{o.vehicle?.internalCode}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {o.orderType === 'ENGINE_OVERHAUL' ? 'عمرة محرك كاملة' : 'عمرة ناقل حركة'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">{o.odometerReading?.toLocaleString()} كم</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">{o.laborCost} ر.س</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-purple-700 font-bold">
                      {o.warrantyUntil ? new Date(o.warrantyUntil).toLocaleDateString('ar-SA') : '6 أشهر (50,000 كم)'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {o.status}
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
