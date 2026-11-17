'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  AlertCircle,
  CheckCircle2,
  X,
  Gauge,
  User,
  Building,
} from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New vehicle form state
  const [formData, setFormData] = useState({
    internalCode: '',
    plateNumber: '',
    chassisNumber: '',
    engineNumber: '',
    vehicleTypeId: '',
    brandModelId: '',
    modelYear: new Date().getFullYear(),
    purchaseDate: '',
    purchaseCost: '',
    currentOdometer: '',
    fuelType: 'DIESEL',
    fuelTankCapacity: 100,
    status: 'ACTIVE',
    ownershipType: 'OWNED',
    departmentId: '',
    assignedDriverId: '',
    notes: '',
  });

  const [meta, setMeta] = useState<{
    vehicleTypes: any[];
    brandModels: any[];
    departments: any[];
    drivers: any[];
  }>({
    vehicleTypes: [],
    brandModels: [],
    departments: [],
    drivers: [],
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter) query.set('status', statusFilter);

      const res = await fetch(`/api/vehicles?${query.toString()}`);
      const data = await res.json();
      if (data.data) {
        setVehicles(data.data);
      }
      if (data.meta) {
        setMeta(data.meta);
        setFormData((prev) => ({
          ...prev,
          vehicleTypeId: prev.vehicleTypeId || data.meta.vehicleTypes?.[0]?.id || '',
          brandModelId: prev.brandModelId || data.meta.brandModels?.[0]?.id || '',
          departmentId: prev.departmentId || data.meta.departments?.[0]?.id || '',
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, statusFilter]);

  // Handle vehicle creation
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشل في إضافة المركبة');
        setSubmitting(false);
        return;
      }

      setFormSuccess('تمت إضافة المركبة بنجاح!');
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
        fetchVehicles();
      }, 800);
    } catch {
      setFormError('حدث خطأ بالاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-fleet-600" />
            <span>سجل أسطول المركبات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة كافة الشاحنات والمركبات، تفاصيل الملكية، العدادات، وبيانات الترخيص والتشغيل
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <Link
            href="/departments"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-all"
          >
            <Building className="w-4 h-4 text-fleet-600" />
            <span>إدارة الإدارات التابعة</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-sm shadow-md shadow-fleet-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مركبة جديدة</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالرقم الداخلي، اللوحة، أو الشاسيه..."
            className="w-full pl-3 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fleet-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fleet-500 text-slate-800 font-medium"
          >
            <option value="">جميع الحالات التشغيلية</option>
            <option value="ACTIVE">عاملة / نشطة</option>
            <option value="MAINTENANCE">تحت الصيانة</option>
            <option value="OUT_OF_SERVICE">متوقفة عن العمل</option>
            <option value="ARCHIVED">مستبعدة / مؤرشفة</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">الرقم الداخلي</th>
                <th className="py-3.5 px-4 font-bold">رقم اللوحة</th>
                <th className="py-3.5 px-4 font-bold">النوع والموديل</th>
                <th className="py-3.5 px-4 font-bold">سنة الصنع</th>
                <th className="py-3.5 px-4 font-bold">قراءة العداد</th>
                <th className="py-3.5 px-4 font-bold">السائق المعين</th>
                <th className="py-3.5 px-4 font-bold">الحالة</th>
                <th className="py-3.5 px-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-fleet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>جاري تحميل بيانات الأسطول...</span>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا توجد مركبات مطابقة لمعايير البحث.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      {v.internalCode}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {v.plateNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-medium">
                        {v.brandModel?.brand} {v.brandModel?.model}
                      </div>
                      <div className="text-xs text-slate-400">{v.vehicleType?.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {v.modelYear}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {v.currentOdometer?.toLocaleString()} كم
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {v.assignedDriver ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{v.assignedDriver.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">غير معين</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : v.status === 'MAINTENANCE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {v.status === 'ACTIVE'
                          ? 'جاهزة للعمل'
                          : v.status === 'MAINTENANCE'
                          ? 'تحت الصيانة'
                          : v.status === 'OUT_OF_SERVICE'
                          ? 'متوقفة'
                          : 'مؤرشفة'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/vehicles/${v.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-fleet-50 text-slate-700 hover:text-fleet-700 text-xs font-semibold border border-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>الملف الشامل</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-fleet-600" />
                <span>إضافة مركبة جديدة إلى الأسطول</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الرقم الداخلي (الكود) *</label>
                  <input
                    type="text"
                    required
                    value={formData.internalCode}
                    onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                    placeholder="مثال: TRK-05"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم اللوحة *</label>
                  <input
                    type="text"
                    required
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    placeholder="مثال: أ ب ج 9876"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الشاسيه (VIN) *</label>
                  <input
                    type="text"
                    required
                    value={formData.chassisNumber}
                    onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                    placeholder="17 حرف ورقم فريد"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">سنة الصنع *</label>
                  <input
                    type="number"
                    required
                    value={formData.modelYear}
                    onChange={(e) => setFormData({ ...formData, modelYear: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نوع المركبة *</label>
                  <select
                    value={formData.vehicleTypeId}
                    onChange={(e) => setFormData({ ...formData, vehicleTypeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    {meta.vehicleTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الماركة والموديل *</label>
                  <select
                    value={formData.brandModelId}
                    onChange={(e) => setFormData({ ...formData, brandModelId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    {meta.brandModels.map((bm) => (
                      <option key={bm.id} value={bm.id}>
                        {bm.brand} {bm.model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">الإدارة التابعة</label>
                    <Link
                      href="/departments"
                      target="_blank"
                      className="text-[10px] text-fleet-600 hover:text-fleet-700 font-bold"
                    >
                      + إدارة وتعديل الإدارات
                    </Link>
                  </div>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="">عام / غير محدد</option>
                    {meta.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">السائق المعين</label>
                  <select
                    value={formData.assignedDriverId}
                    onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="">غير معين حالياً</option>
                    {meta.drivers.map((drv) => (
                      <option key={drv.id} value={drv.id}>
                        {drv.fullName} ({drv.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">قراءة العداد الافتتاحية (كم)</label>
                  <input
                    type="number"
                    value={formData.currentOdometer}
                    onChange={(e) => setFormData({ ...formData, currentOdometer: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الوقود</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="DIESEL">ديزل</option>
                    <option value="GASOLINE_91">بنزين 91</option>
                    <option value="GASOLINE_95">بنزين 95</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold shadow-md shadow-fleet-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ المركبة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
