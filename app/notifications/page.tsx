import React from 'react';
import prisma from '@/lib/prisma';
import {
  Bell,
  AlertTriangle,
  FileText,
  Boxes,
  Wrench,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  // Aggregate real dynamic alerts from database
  const [expiringDocs, lowStockParts, openMaintenance] = await Promise.all([
    prisma.vehicleDocument.findMany({
      where: {
        expiryDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: { vehicle: true },
    }),
    prisma.part.findMany({
      where: {
        stockBalances: {
          some: {
            quantityOnHand: { lte: 5 },
          },
        },
      },
      include: {
        stockBalances: { include: { warehouse: true } },
      },
    }),
    prisma.maintenanceOrder.findMany({
      where: { status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS'] } },
      include: { vehicle: true },
    }),
  ]);

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-fleet-600" />
          <span>مركز التنبيهات والإشعارات الرقابية</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          رصد آلي لمواعيد الصيانة، انتهاء التراخيص، ونواقص المستودعات لمنع تعطل الأسطول
        </p>
      </div>

      <div className="space-y-6">
        {/* Expiring Documents Alert Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-rose-700 font-bold text-base border-b border-slate-100 pb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>تراخيص ووثائق قريبة من الانتهاء (خلال 30 يوماً)</span>
            <span className="text-xs bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {expiringDocs.length} وثائق
            </span>
          </div>

          <div className="space-y-3">
            {expiringDocs.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">جميع وثائق وتراخيص المركبات سارية ولا يوجد استحقاق قريب.</p>
            ) : (
              expiringDocs.map((doc) => (
                <div key={doc.id} className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">
                      مركبة {doc.vehicle.internalCode} ({doc.vehicle.plateNumber}):
                    </span>{' '}
                    <span className="text-slate-700 font-medium">
                      {doc.documentType === 'REGISTRATION' ? 'رخصة سير' : 'وثيقة تأمين'} رقم ({doc.documentNumber})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-rose-700 font-mono">
                      تنتهي في: {new Date(doc.expiryDate).toLocaleDateString('ar-SA')}
                    </span>
                    <Link
                      href={`/vehicles/${doc.vehicleId}`}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-200 text-[11px]"
                    >
                      تجديد الوثيقة
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Parts Alert Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-amber-700 font-bold text-base border-b border-slate-100 pb-3">
            <Boxes className="w-5 h-5 text-amber-600" />
            <span>تنبيهات انخفاض رصيد قطع الغيار عن الحد الأدنى</span>
            <span className="text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {lowStockParts.length} أصناف
            </span>
          </div>

          <div className="space-y-3">
            {lowStockParts.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">جميع أصناف قطع الغيار فوق حدود الأمان في المستودعات.</p>
            ) : (
              lowStockParts.map((part) => {
                const totalOnHand = part.stockBalances.reduce((acc, b) => acc + b.quantityOnHand, 0);
                return (
                  <div key={part.id} className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{part.partCode}</span> -{' '}
                      <span className="font-semibold text-slate-800">{part.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-amber-800">
                        الرصيد المتاح: {totalOnHand} {part.unitOfMeasure} (الحد الأدنى: {part.minimumStock})
                      </span>
                      <Link
                        href="/inventory/parts"
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-200 text-[11px]"
                      >
                        طلب توريد
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ongoing Maintenance Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-blue-700 font-bold text-base border-b border-slate-100 pb-3">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span>أوامر الصيانة المفتوحة والجارية في الورش</span>
            <span className="text-xs bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {openMaintenance.length} أوامر
            </span>
          </div>

          <div className="space-y-3">
            {openMaintenance.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">لا توجد أوامر صيانة مفتوحة حالياً.</p>
            ) : (
              openMaintenance.map((order) => (
                <div key={order.id} className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{order.orderNumber}:</span>{' '}
                    <span className="text-slate-800 font-semibold">
                      مركبة {order.vehicle?.internalCode} ({order.orderType})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-800 font-mono">
                      الأولوية: {order.priority}
                    </span>
                    <Link
                      href="/maintenance/orders"
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-200 text-[11px]"
                    >
                      متابعة الإنجاز
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
