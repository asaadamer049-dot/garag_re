'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Truck,
  Wrench,
  Gauge,
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
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

interface Props {
  vehicle: any;
}

export default function VehicleProfileTabs({ vehicle }: Props) {
  const { symbol, formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<string>('basic');

  const tabs = [
    { id: 'basic', label: 'البيانات الأساسية', icon: Truck },
    { id: 'documents', label: 'المستندات والتراخيص', icon: FileText, count: vehicle.documents?.length },
    { id: 'maintenance', label: 'الصيانة', icon: Wrench, count: vehicle.maintenanceOrders?.length },
    { id: 'overhauls', label: 'الأعطال والعمرات', icon: AlertTriangle },
    { id: 'fuel', label: 'الوقود', icon: Fuel, count: vehicle.fuelTransactions?.length },
    { id: 'lubricants', label: 'الزيوت والفلاتر', icon: Droplet },
    { id: 'parts', label: 'قطع الغيار المصروفة', icon: Boxes },
    { id: 'expenses', label: 'المصروفات المالية', icon: CreditCard, count: vehicle.expenses?.length },
    { id: 'odometer', label: 'سجل قراءات العداد', icon: Gauge, count: vehicle.odometerReadings?.length },
    { id: 'timeline', label: 'السجل الزمني للأحداث', icon: Clock },
  ];

  // Consolidate parts issued across all maintenance orders for this vehicle
  const issuedParts = vehicle.maintenanceOrders?.flatMap((m: any) =>
    m.parts.map((p: any) => ({
      ...p,
      orderNumber: m.orderNumber,
      orderDate: m.openedAt,
    }))
  ) || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-cairo">
      {/* Tab Navigation Strip */}
      <div className="flex items-center overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-4 pt-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? 'border-fleet-600 text-fleet-700 bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-fleet-600' : 'text-slate-400'}`} />
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-fleet-100 text-fleet-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="p-6">
        {/* 1. Basic Info */}
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">بيانات التعريف</h4>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">الرقم الداخلي:</span>
                <span className="font-mono font-bold text-slate-900">{vehicle.internalCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">رقم اللوحة:</span>
                <span className="font-bold text-slate-900">{vehicle.plateNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">رقم الشاسيه (VIN):</span>
                <span className="font-mono text-xs text-slate-800">{vehicle.chassisNumber}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">رقم المحرك:</span>
                <span className="font-mono text-xs text-slate-800">{vehicle.engineNumber || 'غير مسجل'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">المواصفات الفنية</h4>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">نوع المركبة:</span>
                <span className="font-semibold text-slate-900">{vehicle.vehicleType?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">الماركة والموديل:</span>
                <span className="font-semibold text-slate-900">
                  {vehicle.brandModel?.brand} {vehicle.brandModel?.model}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">سنة الصنع:</span>
                <span className="font-mono text-slate-900">{vehicle.modelYear}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">سعة خزان الوقود:</span>
                <span className="font-semibold text-slate-900">{vehicle.fuelTankCapacity} لتر ({vehicle.fuelType})</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">التشغيل والإسناد</h4>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">الإدارة التابعة:</span>
                <span className="font-semibold text-slate-900">{vehicle.department?.name || 'عام'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">السائق المعين:</span>
                <span className="font-semibold text-slate-900">
                  {vehicle.assignedDriver ? vehicle.assignedDriver.fullName : 'غير معين'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">نوع الملكية:</span>
                <span className="font-semibold text-slate-900">
                  {vehicle.ownershipType === 'OWNED' ? 'مملوكة للشركة' : 'مستأجرة'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">تكلفة الشراء:</span>
                <span className="font-bold text-slate-900">
                  {vehicle.purchaseCost ? formatAmount(vehicle.purchaseCost) : 'غير مسجلة'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Documents & Licenses */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">وثائق السير والتأمين والفحص الدوري</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">نوع الوثيقة</th>
                    <th className="py-2.5 px-3">رقم الوثيقة</th>
                    <th className="py-2.5 px-3">تاريخ الإصدار</th>
                    <th className="py-2.5 px-3">تاريخ الانتهاء</th>
                    <th className="py-2.5 px-3">جهة الإصدار</th>
                    <th className="py-2.5 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicle.documents?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        لا توجد وثائق مسجلة بعد.
                      </td>
                    </tr>
                  ) : (
                    vehicle.documents.map((doc: any) => (
                      <tr key={doc.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {doc.documentType === 'REGISTRATION'
                            ? 'رخصة سير (استمارة)'
                            : doc.documentType === 'INSURANCE'
                            ? 'وثيقة تأمين شامل'
                            : 'فحص دوري'}
                        </td>
                        <td className="py-2.5 px-3 font-mono">{doc.documentNumber}</td>
                        <td className="py-2.5 px-3">{new Date(doc.issueDate).toLocaleDateString('ar-SA')}</td>
                        <td className="py-2.5 px-3 font-bold text-rose-600">
                          {new Date(doc.expiryDate).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="py-2.5 px-3">{doc.issuingAuthority || 'المرور'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            سارية
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Maintenance Orders */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">سجل أوامر الصيانة المنفذة والمعتمدة</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">رقم الأمر</th>
                    <th className="py-2.5 px-3">نوع الصيانة</th>
                    <th className="py-2.5 px-3">قراءة العداد</th>
                    <th className="py-2.5 px-3">تكلفة العمالة</th>
                    <th className="py-2.5 px-3">تكلفة القطع</th>
                    <th className="py-2.5 px-3">التكلفة الإجمالية</th>
                    <th className="py-2.5 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicle.maintenanceOrders?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        لا توجد أوامر صيانة مسجلة لهذه المركبة.
                      </td>
                    </tr>
                  ) : (
                    vehicle.maintenanceOrders.map((m: any) => {
                      const partsCost = m.parts.reduce((acc: number, p: any) => acc + p.quantity * p.unitCost, 0);
                      const totalOrder = m.laborCost + m.externalServiceCost + m.otherCost + partsCost;
                      return (
                        <tr key={m.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{m.orderNumber}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{m.orderType}</td>
                          <td className="py-2.5 px-3 font-mono">{m.odometerReading?.toLocaleString()} كم</td>
                          <td className="py-2.5 px-3">{formatAmount(m.laborCost)}</td>
                          <td className="py-2.5 px-3">{formatAmount(partsCost)}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600">{formatAmount(totalOrder)}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Overhauls & Major Repairs */}
        {activeTab === 'overhauls' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">العمرات الكبرى والضمانات</h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <p>
                يتم توثيق عمرات المحركات ونواقل الحركة والإصلاحات الكبرى بتواريخها الدقيقة وفترات الضمان وقطع الغيار المصروفة، لدعم قرارات الإدارة العليا في حساب تكلفة دورة حياة المركبة وقرارات الإحلال.
              </p>
            </div>
          </div>
        )}

        {/* 5. Fuel */}
        {activeTab === 'fuel' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">سجل التزود بالوقود وكفاءة الاستهلاك</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">رقم المعاملة</th>
                    <th className="py-2.5 px-3">قراءة العداد</th>
                    <th className="py-2.5 px-3">الكمية</th>
                    <th className="py-2.5 px-3">سعر اللتر</th>
                    <th className="py-2.5 px-3">الإجمالي</th>
                    <th className="py-2.5 px-3">المحطة</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicle.fuelTransactions?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        لا توجد عمليات وقود مسجلة.
                      </td>
                    </tr>
                  ) : (
                    vehicle.fuelTransactions.map((f: any) => (
                      <tr key={f.id}>
                        <td className="py-2.5 px-3 font-mono font-bold">{f.transactionNumber}</td>
                        <td className="py-2.5 px-3 font-mono">{f.odometerReading.toLocaleString()} كم</td>
                        <td className="py-2.5 px-3 font-semibold">{f.quantityLiters} لتر</td>
                        <td className="py-2.5 px-3 font-mono">{f.unitPrice} {symbol}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">{formatAmount(f.totalAmount)}</td>
                        <td className="py-2.5 px-3">{f.stationName || 'محطة معتمدة'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{new Date(f.transactionDate).toLocaleDateString('ar-SA')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Lubricants */}
        {activeTab === 'lubricants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">خدمات الزيوت والفلاتر واللزوجة</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  المواصفات المعتمدة لفئة هذه المركبة وسجل تغييرات زيت المحرك والجير والفلاتر
                </p>
              </div>
              <Link
                href="/lubricants"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-fleet-50 text-fleet-700 hover:bg-fleet-100 rounded-xl text-xs font-bold border border-fleet-200 transition-all"
              >
                <Droplet className="w-3.5 h-3.5 text-fleet-600" />
                <span>إدارة الزيوت العامة</span>
              </Link>
            </div>

            {/* Approved Specs for this vehicle's type */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>المعايير والمواصفات المعيارية لفئة {vehicle.vehicleType?.name || 'المركبة'}</span>
              </h5>

              {(!vehicle.vehicleType?.lubricantSpecs || vehicle.vehicleType.lubricantSpecs.length === 0) ? (
                <p className="text-xs text-slate-400">لم يتم تسجيل مواصفات معيارية مسبقة لهذه الفئة بعد.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {vehicle.vehicleType.lubricantSpecs.map((sp: any) => (
                    <div key={sp.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{sp.systemName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fleet-50 text-fleet-700 font-mono">
                          {sp.lubricantProduct?.viscosityGrade || 'معتمد'}
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium text-[11px] truncate">{sp.lubricantProduct?.name}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>الكمية: <strong>{sp.requiredQuantity} {sp.lubricantProduct?.unitOfMeasure === 'PIECE' ? 'قطعة' : 'لتر'}</strong></span>
                        <span>كل <strong>{sp.changeIntervalKm?.toLocaleString()} كم</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service History */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-fleet-600" />
                <span>سجل عمليات تغيير الزيوت المنفذة على هذه المركبة</span>
              </h5>

              {(!vehicle.lubricantServices || vehicle.lubricantServices.length === 0) ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400">
                  لا توجد عمليات تغيير زيت أو فلتر مسجلة لهذه المركبة بعد.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">رقم العملية</th>
                        <th className="py-2.5 px-3">التاريخ</th>
                        <th className="py-2.5 px-3">العداد عند التغيير</th>
                        <th className="py-2.5 px-3">الزيوت والفلاتر المصروفة</th>
                        <th className="py-2.5 px-3">عداد الاستحقاق القادم</th>
                        <th className="py-2.5 px-3">القائم بالعمل</th>
                        <th className="py-2.5 px-3">التكلفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vehicle.lubricantServices.map((srv: any) => (
                        <tr key={srv.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-fleet-700">{srv.serviceNumber || 'LUBE'}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                            {new Date(srv.serviceDate).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {srv.odometerReading?.toLocaleString()} كم
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="space-y-0.5">
                              {srv.items?.map((it: any, idx: number) => (
                                <div key={idx} className="text-[11px] text-slate-700">
                                  {it.lubricantProduct?.name} ({it.quantity} {it.lubricantProduct?.unitOfMeasure === 'PIECE' ? 'قطعة' : 'لتر'})
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {srv.nextDueOdometer?.toLocaleString()} كم
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">{srv.performedBy || 'ورشة الصيانة'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                            {formatAmount(srv.totalCost || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. Parts Issued */}
        {activeTab === 'parts' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">قطع الغيار المصروفة فعلياً من المستودعات على هذه المركبة</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">كود الصنف</th>
                    <th className="py-2.5 px-3">اسم القطعة</th>
                    <th className="py-2.5 px-3">المستودع</th>
                    <th className="py-2.5 px-3">الكمية</th>
                    <th className="py-2.5 px-3">تكلفة الوحدة</th>
                    <th className="py-2.5 px-3">إجمالي التكلفة</th>
                    <th className="py-2.5 px-3">أمر الصيانة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issuedParts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        لم يتم صرف قطع غيار على هذه المركبة بعد.
                      </td>
                    </tr>
                  ) : (
                    issuedParts.map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.part?.partCode}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{p.part?.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.warehouse?.name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{p.quantity}</td>
                        <td className="py-2.5 px-3 font-mono">{formatAmount(p.unitCost)}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600 font-mono">
                          {formatAmount(p.quantity * p.unitCost)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-fleet-700">{p.orderNumber}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. Expenses */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">المصروفات المالية المسجلة على المركبة</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">رقم المصروف</th>
                    <th className="py-2.5 px-3">التصنيف</th>
                    <th className="py-2.5 px-3">البيان</th>
                    <th className="py-2.5 px-3">المبلغ الإجمالي</th>
                    <th className="py-2.5 px-3">حالة السداد</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicle.expenses?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        لا توجد مصروفات مالية مسجلة بعد.
                      </td>
                    </tr>
                  ) : (
                    vehicle.expenses.map((e: any) => (
                      <tr key={e.id}>
                        <td className="py-2.5 px-3 font-mono font-bold">{e.expenseNumber}</td>
                        <td className="py-2.5 px-3 font-semibold">{e.category?.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{e.description}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{formatAmount(e.totalAmount)}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {e.paymentStatus === 'PAID' ? 'مسدد' : 'مستحق'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{new Date(e.expenseDate).toLocaleDateString('ar-SA')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. Odometer Log */}
        {activeTab === 'odometer' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">سجل قراءات العداد التاريخي الموثق</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">القراءة (كم)</th>
                    <th className="py-2.5 px-3">مصدر القراءة</th>
                    <th className="py-2.5 px-3">المسجل بواسطة</th>
                    <th className="py-2.5 px-3">الملاحظات</th>
                    <th className="py-2.5 px-3">تاريخ القراءة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicle.odometerReadings?.map((odo: any) => (
                    <tr key={odo.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {odo.readingValue.toLocaleString()} كم
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
                          {odo.sourceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{odo.recordedBy || 'النظام'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{odo.notes || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {new Date(odo.readingDate).toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 10. Chronological Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">السجل الزمني لكافة العمليات التشغيلية</h4>
            <div className="relative border-r-2 border-slate-200 pr-5 space-y-6">
              {vehicle.odometerReadings?.map((odo: any, i: number) => (
                <div key={i} className="relative">
                  <div className="absolute -right-[27px] top-1 w-3 h-3 rounded-full bg-fleet-500 ring-4 ring-white"></div>
                  <div className="text-xs text-slate-400 font-mono">
                    {new Date(odo.readingDate).toLocaleDateString('ar-SA')}
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    تسجيل قراءة عداد: {odo.readingValue.toLocaleString()} كم ({odo.sourceType})
                  </div>
                  {odo.notes && <div className="text-xs text-slate-500 mt-0.5">{odo.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
