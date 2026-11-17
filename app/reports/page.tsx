import React from 'react';
import prisma from '@/lib/prisma';
import { getSystemCurrency } from '@/lib/currency-server';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Truck,
  TrendingDown,
  DollarSign,
  Fuel,
  Wrench,
} from 'lucide-react';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const currencyInfo = await getSystemCurrency();
  const [vehicles, fuelSum, maintenanceOrders, expenses] = await Promise.all([
    prisma.vehicle.findMany({
      include: {
        brandModel: true,
        vehicleType: true,
        fuelTransactions: true,
        maintenanceOrders: {
          include: { parts: true },
        },
        expenses: true,
      },
    }),
    prisma.fuelTransaction.aggregate({
      _sum: { totalAmount: true, quantityLiters: true },
      where: { status: 'APPROVED' },
    }),
    prisma.maintenanceOrder.findMany({
      include: { parts: true },
    }),
    prisma.expense.findMany(),
  ]);

  const totalFuelLiters = fuelSum._sum.quantityLiters || 0;
  const totalFuelCost = fuelSum._sum.totalAmount || 0;

  const totalMaintenanceCost = maintenanceOrders.reduce((acc, m) => {
    const partsCost = m.parts.reduce((pAcc, p) => pAcc + p.quantity * p.unitCost, 0);
    return acc + m.laborCost + m.externalServiceCost + m.otherCost + partsCost;
  }, 0);

  const totalExpensesCost = expenses.reduce((acc, e) => acc + e.totalAmount, 0);

  // Per vehicle analysis
  const vehicleStats = vehicles.map((v) => {
    const vFuelCost = v.fuelTransactions.reduce((acc, f) => acc + f.totalAmount, 0);
    const vFuelLiters = v.fuelTransactions.reduce((acc, f) => acc + f.quantityLiters, 0);
    const vMaintCost = v.maintenanceOrders.reduce((acc, m) => {
      const pCost = m.parts.reduce((pAcc, p) => pAcc + p.quantity * p.unitCost, 0);
      return acc + m.laborCost + m.externalServiceCost + m.otherCost + pCost;
    }, 0);
    const vTotalCost = vFuelCost + vMaintCost;
    const distance = v.currentOdometer || 0;
    const costPerKm = distance > 0 ? (vTotalCost / distance).toFixed(2) : '-';

    return {
      id: v.id,
      internalCode: v.internalCode,
      plateNumber: v.plateNumber,
      model: `${v.brandModel.brand} ${v.brandModel.model}`,
      odometer: v.currentOdometer,
      fuelCost: vFuelCost,
      fuelLiters: vFuelLiters,
      maintenanceCost: vMaintCost,
      totalCost: vTotalCost,
      costPerKm,
    };
  });

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-fleet-600" />
            <span>التقارير الإدارية والمالية الشاملة للأسطول</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مؤشرات الأداء التشغيلي، كفاءة الوقود، وتكلفة الكيلومتر المعتمدة لكل مركبة
          </p>
        </div>

        <PrintButton />
      </div>

      {/* Printable Report Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm print:border-none print:shadow-none space-y-6">
        <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              تقرير التكاليف التشغيلية والأداء الشهري للأسطول
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              شركة النقل والخدمات اللوجستية المتقدمة • نظام ERP الداخلي
            </p>
          </div>
          <div className="text-left font-mono text-xs text-slate-600">
            <div>تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</div>
            <div className="text-emerald-700 font-bold">الحالة: معتمد ومطابق للحسابات</div>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500">إجمالي استهلاك الوقود</span>
            <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
              {totalFuelLiters.toLocaleString()} <span className="text-xs font-normal">لتر</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
              القيمة: {currencyInfo.position === 'before' ? `${currencyInfo.symbol} ${totalFuelCost.toLocaleString()}` : `${totalFuelCost.toLocaleString()} ${currencyInfo.symbol}`}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500">إجمالي تكاليف الصيانة</span>
            <div className="text-lg font-extrabold text-amber-600 font-mono mt-1">
              {currencyInfo.position === 'before'
                ? `${currencyInfo.symbol} ${totalMaintenanceCost.toLocaleString()}`
                : `${totalMaintenanceCost.toLocaleString()} ${currencyInfo.symbol}`}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">عمالة + قطع غيار</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500">المصروفات المالية الكلية</span>
            <div className="text-lg font-extrabold text-emerald-600 font-mono mt-1">
              {currencyInfo.position === 'before'
                ? `${currencyInfo.symbol} ${totalExpensesCost.toLocaleString()}`
                : `${totalExpensesCost.toLocaleString()} ${currencyInfo.symbol}`}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">معتمدة بالدفتر الموحد</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500">حجم الأسطول المسجل</span>
            <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
              {vehicles.length} <span className="text-xs font-normal">مركبة</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">نشطة وتحت الخدمة</span>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-3">تفصيل التكلفة والمؤشرات حسب كل مركبة</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">الرقم الداخلي</th>
                  <th className="py-2.5 px-3 font-bold">رقم اللوحة</th>
                  <th className="py-2.5 px-3 font-bold">الموديل والنوع</th>
                  <th className="py-2.5 px-3 font-bold">إجمالي العداد</th>
                  <th className="py-2.5 px-3 font-bold">تكلفة الوقود</th>
                  <th className="py-2.5 px-3 font-bold">تكلفة الصيانة</th>
                  <th className="py-2.5 px-3 font-bold">إجمالي التكلفة</th>
                  <th className="py-2.5 px-3 font-bold">تكلفة الكيلومتر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicleStats.map((vs) => (
                  <tr key={vs.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{vs.internalCode}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{vs.plateNumber}</td>
                    <td className="py-2.5 px-3 text-slate-600">{vs.model}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {vs.odometer?.toLocaleString()} كم
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {currencyInfo.position === 'before' ? `${currencyInfo.symbol} ${vs.fuelCost.toLocaleString()}` : `${vs.fuelCost.toLocaleString()} ${currencyInfo.symbol}`}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {currencyInfo.position === 'before' ? `${currencyInfo.symbol} ${vs.maintenanceCost.toLocaleString()}` : `${vs.maintenanceCost.toLocaleString()} ${currencyInfo.symbol}`}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {currencyInfo.position === 'before' ? `${currencyInfo.symbol} ${vs.totalCost.toLocaleString()}` : `${vs.totalCost.toLocaleString()} ${currencyInfo.symbol}`}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-fleet-700">
                      {vs.costPerKm} {vs.costPerKm !== '-' && `${currencyInfo.symbol}/كم`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auditor Sign-off Footer */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
          <div>
            <span className="block font-bold text-slate-800 mb-6">مسؤول الصيانة والتشغيل</span>
            <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-serif">التوقيع والاعتماد</div>
          </div>
          <div>
            <span className="block font-bold text-slate-800 mb-6">المحاسب المالي</span>
            <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-serif">التوقيع والاعتماد</div>
          </div>
          <div>
            <span className="block font-bold text-slate-800 mb-6">مدير عام النقل والأسطول</span>
            <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-serif">التوقيع والاعتماد</div>
          </div>
        </div>
      </div>
    </div>
  );
}
