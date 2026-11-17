import React from 'react';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSystemCurrency } from '@/lib/currency-server';
import {
  Truck,
  ArrowRight,
  Gauge,
  Wrench,
  Fuel,
  Droplet,
  Boxes,
  CreditCard,
  FileText,
  Clock,
  History,
  AlertTriangle,
  User,
  Building,
  CheckCircle2,
} from 'lucide-react';
import VehicleProfileTabs from './VehicleProfileTabs';

export const dynamic = 'force-dynamic';

export default async function VehicleDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currencyInfo = await getSystemCurrency();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      vehicleType: {
        include: {
          lubricantSpecs: {
            include: { lubricantProduct: true },
          },
        },
      },
      brandModel: true,
      department: true,
      assignedDriver: true,
      lubricantServices: {
        include: {
          items: {
            include: { lubricantProduct: true },
          },
        },
        orderBy: { serviceDate: 'desc' },
      },
      odometerReadings: {
        orderBy: { readingDate: 'desc' },
      },
      maintenanceOrders: {
        include: {
          tasks: true,
          parts: { include: { part: true, warehouse: true } },
          supplier: true,
        },
        orderBy: { openedAt: 'desc' },
      },
      fuelTransactions: {
        include: { supplier: true, driver: true },
        orderBy: { transactionDate: 'desc' },
      },
      documents: {
        include: { renewals: true },
        orderBy: { expiryDate: 'asc' },
      },
      expenses: {
        include: { category: true, payments: true },
        orderBy: { expenseDate: 'desc' },
      },
    },
  });

  if (!vehicle) {
    notFound();
  }

  // Calculate Total Costs
  const totalFuelCost = vehicle.fuelTransactions.reduce((acc, f) => acc + f.totalAmount, 0);
  const totalMaintenanceCost = vehicle.maintenanceOrders.reduce((acc, m) => {
    const partsCost = m.parts.reduce((pAcc, p) => pAcc + p.quantity * p.unitCost, 0);
    return acc + m.laborCost + m.externalServiceCost + m.otherCost + partsCost;
  }, 0);
  const totalExpensesCost = vehicle.expenses.reduce((acc, e) => acc + e.totalAmount, 0);

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/vehicles"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-fleet-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900">
                مركبة: {vehicle.internalCode}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                {vehicle.plateNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {vehicle.brandModel.brand} {vehicle.brandModel.model} • موديل {vehicle.modelYear} • شاسيه:{' '}
              <span className="font-mono">{vehicle.chassisNumber}</span>
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              vehicle.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : vehicle.status === 'MAINTENANCE'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>
              {vehicle.status === 'ACTIVE'
                ? 'عاملة ونشطة'
                : vehicle.status === 'MAINTENANCE'
                ? 'تحت الصيانة'
                : 'متوقفة'}
            </span>
          </span>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500">العداد الحالي</span>
          <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
            {vehicle.currentOdometer.toLocaleString()} <span className="text-xs font-normal">كم</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500">تكلفة الوقود الإجمالية</span>
          <div className="text-xl font-extrabold text-fleet-600 font-mono mt-1">
            {currencyInfo.position === 'before'
              ? `${currencyInfo.symbol} ${totalFuelCost.toLocaleString()}`
              : `${totalFuelCost.toLocaleString()} ${currencyInfo.symbol}`}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500">تكلفة الصيانة والإصلاح</span>
          <div className="text-xl font-extrabold text-amber-600 font-mono mt-1">
            {currencyInfo.position === 'before'
              ? `${currencyInfo.symbol} ${totalMaintenanceCost.toLocaleString()}`
              : `${totalMaintenanceCost.toLocaleString()} ${currencyInfo.symbol}`}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500">المصروفات المعتمدة الكلية</span>
          <div className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
            {currencyInfo.position === 'before'
              ? `${currencyInfo.symbol} ${totalExpensesCost.toLocaleString()}`
              : `${totalExpensesCost.toLocaleString()} ${currencyInfo.symbol}`}
          </div>
        </div>
      </div>

      {/* 10 Interrelated Tabs Component */}
      <VehicleProfileTabs vehicle={vehicle} />
    </div>
  );
}
