import React from 'react';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getSystemCurrency } from '@/lib/currency-server';
import {
  Truck,
  Wrench,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Fuel,
  Boxes,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Clock,
  Plus,
  ChevronLeft,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currencyInfo = await getSystemCurrency();

  // Aggregate real system statistics from SQLite database
  const [
    totalVehicles,
    activeVehicles,
    maintenanceVehicles,
    openMaintenanceOrders,
    expiringDocuments,
    partsLowStock,
    recentFuelTransactions,
    recentExpenses,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: 'ACTIVE' } }),
    prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
    prisma.maintenanceOrder.count({ where: { status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS'] } } }),
    prisma.vehicleDocument.count({
      where: {
        expiryDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        },
      },
    }),
    prisma.part.count({
      where: {
        stockBalances: {
          some: {
            quantityOnHand: { lte: 5 },
          },
        },
      },
    }),
    prisma.fuelTransaction.findMany({
      take: 5,
      orderBy: { transactionDate: 'desc' },
      include: { vehicle: true },
    }),
    prisma.expense.findMany({
      take: 5,
      orderBy: { expenseDate: 'desc' },
      include: { category: true, vehicle: true },
    }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    }),
  ]);

  // Aggregate monthly expenses sum
  const expensesSum = await prisma.expense.aggregate({
    _sum: { totalAmount: true },
    where: { status: 'APPROVED' },
  });

  const totalExpensesAmount = expensesSum._sum.totalAmount || 0;

  // Aggregate fuel costs
  const fuelSum = await prisma.fuelTransaction.aggregate({
    _sum: { totalAmount: true },
    where: { status: 'APPROVED' },
  });

  const totalFuelAmount = fuelSum._sum.totalAmount || 0;

  return (
    <div className="space-y-8 font-cairo" dir="rtl">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-fleet-950 to-slate-900 border border-slate-800 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-fleet-500/20 text-fleet-300 border border-fleet-500/30">
                منظومة الرقابة التشغيلية
              </span>
              <span className="text-xs text-slate-400">آخر تحديث: لحظي</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              لوحة متابعة وإدارة أسطول المركبات
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              إشراف مركزي متكامل على حركة المركبات، مواعيد الصيانة الوقائية، استهلاك الوقود، وأرصدة المستودعات وفق أعلى معايير الحوكمة المالية.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/maintenance/orders"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-sm shadow-lg shadow-fleet-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>أمر صيانة جديد</span>
            </Link>
            <Link
              href="/fuel"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
            >
              <Fuel className="w-4 h-4 text-fleet-400" />
              <span>تسجيل وقود</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Vehicles */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">إجمالي الأسطول</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalVehicles}</span>
            <span className="text-xs text-slate-500">مركبة مسجلة</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{activeVehicles} مركبة جاهزة للعمل</span>
          </div>
        </div>

        {/* Maintenance Orders */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">الصيانة والورش</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{openMaintenanceOrders}</span>
            <span className="text-xs text-slate-500">أمر صيانة مفتوح</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{maintenanceVehicles} مركبة داخل الورش حالياً</span>
          </div>
        </div>

        {/* Total Financial Expenses */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">المصروفات المعتمدة</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {totalExpensesAmount.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-700">{currencyInfo.symbol}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>
              منها وقود: {currencyInfo.position === 'before' ? `${currencyInfo.symbol} ${totalFuelAmount.toLocaleString()}` : `${totalFuelAmount.toLocaleString()} ${currencyInfo.symbol}`}
            </span>
          </div>
        </div>

        {/* Alerts & Critical Items */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">التنبيهات العاجلة</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">
              {expiringDocuments + partsLowStock}
            </span>
            <span className="text-xs text-slate-500">تنبيه يتطلب إجراء</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
            <span className="text-rose-600 font-medium">{expiringDocuments} وثائق قريبة</span>
            <span>•</span>
            <span className="text-amber-600 font-medium">{partsLowStock} قطع حرجة</span>
          </div>
        </div>
      </div>

      {/* Main Content 2-Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Recent Fuel & Expenses */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Fuel Records */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-fleet-50 text-fleet-600 flex items-center justify-center">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">آخر عمليات التزود بالوقود</h3>
                  <p className="text-xs text-slate-500">متابعة دقيقة للكميات والعدادات ومحطات التعبئة</p>
                </div>
              </div>
              <Link
                href="/fuel"
                className="text-xs font-bold text-fleet-600 hover:text-fleet-700 flex items-center gap-1"
              >
                <span>عرض الكل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs">
                    <th className="pb-3 font-semibold">رقم المعاملة</th>
                    <th className="pb-3 font-semibold">المركبة</th>
                    <th className="pb-3 font-semibold">العداد</th>
                    <th className="pb-3 font-semibold">الكمية</th>
                    <th className="pb-3 font-semibold">الإجمالي</th>
                    <th className="pb-3 font-semibold">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentFuelTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                        لا توجد عمليات وقود مسجلة بعد.
                      </td>
                    </tr>
                  ) : (
                    recentFuelTransactions.map((ft) => (
                      <tr key={ft.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 font-mono font-medium text-slate-800 text-xs">
                          {ft.transactionNumber}
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          {ft.vehicle.internalCode} ({ft.vehicle.plateNumber})
                        </td>
                        <td className="py-3 text-slate-600 font-mono text-xs">
                          {ft.odometerReading.toLocaleString()} كم
                        </td>
                        <td className="py-3 font-semibold text-slate-800">
                          {ft.quantityLiters} لتر
                        </td>
                        <td className="py-3 font-bold text-emerald-600">
                          {currencyInfo.position === 'before'
                            ? `${currencyInfo.symbol} ${ft.totalAmount.toLocaleString()}`
                            : `${ft.totalAmount.toLocaleString()} ${currencyInfo.symbol}`}
                        </td>
                        <td className="py-3 text-slate-500 text-xs">
                          {new Date(ft.transactionDate).toLocaleDateString('ar-SA')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Approved Expenses */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">المصروفات المالية الموحدة</h3>
                  <p className="text-xs text-slate-500">سجل المصروفات المعتمدة وربطها بالمصادر التشغيلية</p>
                </div>
              </div>
              <Link
                href="/expenses"
                className="text-xs font-bold text-fleet-600 hover:text-fleet-700 flex items-center gap-1"
              >
                <span>عرض الكل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs">
                    <th className="pb-3 font-semibold">رقم المصروف</th>
                    <th className="pb-3 font-semibold">البند / التصنيف</th>
                    <th className="pb-3 font-semibold">المركبة</th>
                    <th className="pb-3 font-semibold">المبلغ</th>
                    <th className="pb-3 font-semibold">حالة السداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        لا توجد مصروفات مسجلة بعد.
                      </td>
                    </tr>
                  ) : (
                    recentExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 font-mono font-medium text-slate-800 text-xs">
                          {exp.expenseNumber}
                        </td>
                        <td className="py-3 font-medium text-slate-800">
                          {exp.category?.name || exp.description}
                        </td>
                        <td className="py-3 text-slate-600">
                          {exp.vehicle ? exp.vehicle.internalCode : 'عام'}
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          {currencyInfo.position === 'before'
                            ? `${currencyInfo.symbol} ${exp.totalAmount.toLocaleString()}`
                            : `${exp.totalAmount.toLocaleString()} ${currencyInfo.symbol}`}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              exp.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : exp.paymentStatus === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {exp.paymentStatus === 'PAID'
                              ? 'مسدد'
                              : exp.paymentStatus === 'PARTIAL'
                              ? 'سداد جزئي'
                              : 'مستحق'}
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

        {/* Right Column (1 Col): Security & Audit Logs + System Health */}
        <div className="space-y-8">
          {/* Security & Audit Feed */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">سجل التدقيق الرقابي</h3>
                <p className="text-xs text-slate-500">حركات النظام الحساسة غير القابلة للتعديل</p>
              </div>
            </div>

            <div className="space-y-4">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
                    <span className="font-mono text-fleet-700">{log.action}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    الكيان: <strong className="text-slate-800">{log.entityType}</strong> | بواسطة:{' '}
                    <span className="text-slate-700">{log.user?.fullName || 'النظام الداخلي'}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <Link
                href="/admin/audit-logs"
                className="text-xs font-bold text-fleet-600 hover:text-fleet-700"
              >
                عرض سجل التدقيق الكامل
              </Link>
            </div>
          </div>

          {/* Quick System Specs Card */}
          <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-white mb-3">حالة الخادم المحلي (On-Premises)</h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">قاعدة البيانات:</span>
                <span className="font-mono text-emerald-400">SQLite (WAL Mode)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">بيئة التشغيل:</span>
                <span className="font-mono text-white">Node.js {process.version}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">وضع الاتصال:</span>
                <span className="text-emerald-400 font-medium">مستقل داخلي (Offline Capable)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">النسخ الاحتياطي:</span>
                <span className="text-fleet-400 font-medium">مفعل يومياً</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
