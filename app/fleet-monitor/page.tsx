import React from 'react';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Truck, CheckCircle2, AlertTriangle, XCircle, Gauge, User, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FleetMonitorPage() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      brandModel: true,
      vehicleType: true,
      department: true,
      assignedDriver: true,
    },
    orderBy: { internalCode: 'asc' },
  });

  const activeCount = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const maintCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
  const stoppedCount = vehicles.filter((v) => v.status === 'OUT_OF_SERVICE').length;

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-6 h-6 text-fleet-600" />
          <span>لوحة متابعة الأسطول الحية (Fleet Monitor)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          مراقبة الحالة التشغيلية الفورية لجميع مركبات الأسطول، مواقع التوزيع، وجاهزية التشغيل
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700">المركبات العاملة والجاهزة</span>
            <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">{activeCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700">تحت الصيانة في الورش</span>
            <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">{maintCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700">متوقفة عن العمل</span>
            <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">{stoppedCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Vehicle Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-lg text-slate-900">{v.internalCode}</span>
                <p className="text-xs text-slate-500 font-semibold">{v.plateNumber}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  v.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : v.status === 'MAINTENANCE'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {v.status === 'ACTIVE' ? 'جاهزة' : v.status === 'MAINTENANCE' ? 'صيانة' : 'متوقفة'}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 py-2 border-y border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">النوع:</span>
                <span className="font-medium text-slate-800">
                  {v.brandModel?.brand} {v.brandModel?.model}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">العداد:</span>
                <span className="font-mono font-bold text-slate-900">
                  {v.currentOdometer?.toLocaleString()} كم
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">السائق:</span>
                <span className="text-slate-800">{v.assignedDriver?.fullName || 'غير معين'}</span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">موديل {v.modelYear}</span>
              <Link
                href={`/vehicles/${v.id}`}
                className="text-xs font-bold text-fleet-600 hover:text-fleet-700"
              >
                فتح الملف ←
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
