'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Boxes,
  User,
  Clock,
  Eye,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

export default function MaintenanceOrdersPage() {
  const { symbol, formatAmount } = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [vehicleId, setVehicleId] = useState('');
  const [orderType, setOrderType] = useState('PERIODIC');
  const [priority, setPriority] = useState('MEDIUM');
  const [workshopType, setWorkshopType] = useState('INTERNAL');
  const [complaint, setComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Tasks list
  const [tasks, setTasks] = useState<{ taskName: string; laborCost: number }[]>([
    { taskName: 'فحص دوري وتغيير زيوت وفلاتر', laborCost: 150 },
  ]);

  // Selected parts from inventory
  const [selectedParts, setSelectedParts] = useState<
    { partId: string; warehouseId: string; quantity: number; unitCost: number }[]
  >([]);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordersRes, vehiclesRes, partsRes] = await Promise.all([
        fetch('/api/maintenance/orders'),
        fetch('/api/vehicles'),
        fetch('/api/inventory/parts'),
      ]);

      const ordersData = await ordersRes.json();
      const vehiclesData = await vehiclesRes.json();
      const partsData = await partsRes.json();

      if (ordersData.data) setOrders(ordersData.data);
      if (vehiclesData.data) {
        setVehicles(vehiclesData.data);
        if (vehiclesData.data.length > 0 && !vehicleId) {
          setVehicleId(vehiclesData.data[0].id);
          setOdometerReading(vehiclesData.data[0].currentOdometer.toString());
        }
      }
      if (partsData.data) {
        setParts(partsData.data.parts || []);
        setWarehouses(partsData.data.warehouses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update odometer when vehicle changes
  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    const v = vehicles.find((x) => x.id === vId);
    if (v) setOdometerReading(v.currentOdometer.toString());
  };

  // Add Part row
  const addPartRow = () => {
    if (parts.length === 0 || warehouses.length === 0) return;
    setSelectedParts([
      ...selectedParts,
      {
        partId: parts[0].id,
        warehouseId: warehouses[0].id,
        quantity: 1,
        unitCost: 120,
      },
    ]);
  };

  const removePartRow = (index: number) => {
    setSelectedParts(selectedParts.filter((_, i) => i !== index));
  };

  // Total calculated cost
  const totalLabor = tasks.reduce((acc, t) => acc + (parseFloat(t.laborCost.toString()) || 0), 0);
  const totalParts = selectedParts.reduce(
    (acc, p) => acc + (parseFloat(p.quantity.toString()) || 0) * (parseFloat(p.unitCost.toString()) || 0),
    0
  );
  const totalOrderEstimated = totalLabor + totalParts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/maintenance/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          orderType,
          priority,
          workshopType,
          complaint,
          diagnosis,
          odometerReading,
          assignedTo,
          tasks,
          parts: selectedParts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشل في حفظ أمر الصيانة');
        setSubmitting(false);
        return;
      }

      setFormSuccess('تم إنشاء أمر الصيانة وصرف قطع الغيار بنجاح!');
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
        fetchOrders();
      }, 700);
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
            <Wrench className="w-6 h-6 text-fleet-600" />
            <span>أوامر الصيانة والورش</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة دورة حياة أوامر العمل، صرف قطع الغيار من المخزن، واحتساب التكاليف دون ازدواجية
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-sm shadow-md shadow-fleet-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>فتح أمر صيانة جديد</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">رقم الأمر</th>
                <th className="py-3.5 px-4 font-bold">المركبة</th>
                <th className="py-3.5 px-4 font-bold">نوع الصيانة</th>
                <th className="py-3.5 px-4 font-bold">الأولوية</th>
                <th className="py-3.5 px-4 font-bold">قراءة العداد</th>
                <th className="py-3.5 px-4 font-bold">تكلفة العمالة</th>
                <th className="py-3.5 px-4 font-bold">تكلفة القطع</th>
                <th className="py-3.5 px-4 font-bold">الإجمالي المعتمد</th>
                <th className="py-3.5 px-4 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    جاري تحميل أوامر الصيانة...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد أوامر صيانة مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const partsCost = ord.parts?.reduce(
                    (acc: number, p: any) => acc + p.quantity * p.unitCost,
                    0
                  ) || 0;
                  const total = ord.laborCost + ord.externalServiceCost + ord.otherCost + partsCost;
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {ord.vehicle?.internalCode} ({ord.vehicle?.plateNumber})
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {ord.orderType === 'PERIODIC'
                          ? 'صيانة دورية'
                          : ord.orderType === 'BREAKDOWN'
                          ? 'عطل طارئ'
                          : ord.orderType === 'ENGINE_OVERHAUL'
                          ? 'عمرة محرك'
                          : ord.orderType}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.priority === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : ord.priority === 'HIGH'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {ord.priority === 'CRITICAL'
                            ? 'حرج'
                            : ord.priority === 'HIGH'
                            ? 'عاجل'
                            : 'متوسط'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {ord.odometerReading?.toLocaleString()} كم
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-800">
                        {formatAmount(ord.laborCost)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-800">
                        {formatAmount(partsCost)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                        {formatAmount(total)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {ord.status === 'APPROVED' ? 'معتمد' : ord.status}
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

      {/* New Maintenance Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-fleet-600" />
                <span>فتح أمر صيانة واحتساب التكاليف</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleSubmit} className="space-y-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المركبة *</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.internalCode} - {v.plateNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نوع أمر الصيانة *</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="PERIODIC">صيانة دورية وقائية</option>
                    <option value="BREAKDOWN">عطل طارئ</option>
                    <option value="ENGINE_OVERHAUL">عمرة محرك كبرى</option>
                    <option value="GEARBOX_OVERHAUL">عمرة ناقل حركة</option>
                    <option value="OIL_FILTER">تغيير زيوت وفلاتر</option>
                    <option value="TIRES_BATTERIES">إطارات وبطاريات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الأولوية</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="LOW">منخفضة</option>
                    <option value="MEDIUM">متوسطة</option>
                    <option value="HIGH">عاجلة</option>
                    <option value="CRITICAL">حرجة / توقف مركبة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">قراءة العداد الحالية (كم) *</label>
                  <input
                    type="number"
                    required
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الورشة المنفذة</label>
                  <select
                    value={workshopType}
                    onChange={(e) => setWorkshopType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="INTERNAL">الورشة المركزية الداخلية</option>
                    <option value="EXTERNAL">مركز خدمة خارجي معتمد</option>
                  </select>
                </div>
              </div>

              {/* Tasks and Labor Cost */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>مهام الصيانة والعمالة (Labor)</span>
                  <span className="font-mono text-fleet-700">إجمالي العمالة: {formatAmount(totalLabor)}</span>
                </h4>
                {tasks.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={t.taskName}
                      onChange={(e) => {
                        const copy = [...tasks];
                        copy[idx].taskName = e.target.value;
                        setTasks(copy);
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      placeholder="اسم المهمة أو العملية"
                    />
                    <input
                      type="number"
                      value={t.laborCost}
                      onChange={(e) => {
                        const copy = [...tasks];
                        copy[idx].laborCost = parseFloat(e.target.value) || 0;
                        setTasks(copy);
                      }}
                      className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      placeholder={`تكلفة اليد (${symbol})`}
                    />
                  </div>
                ))}
              </div>

              {/* Parts to Issue from Inventory */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-fleet-600" />
                    <span>صرف قطع غيار ومستهلكات من المخزن (Anti-Double Counting)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={addPartRow}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-fleet-700 font-bold rounded-lg border border-slate-200 text-xs"
                  >
                    + إضافة قطعة غيار
                  </button>
                </div>

                {selectedParts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">لم يتم صرف قطع غيار على هذا الأمر بعد.</p>
                ) : (
                  selectedParts.map((sp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={sp.partId}
                        onChange={(e) => {
                          const copy = [...selectedParts];
                          copy[idx].partId = e.target.value;
                          setSelectedParts(copy);
                        }}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        {parts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.partCode} - {p.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={sp.warehouseId}
                        onChange={(e) => {
                          const copy = [...selectedParts];
                          copy[idx].warehouseId = e.target.value;
                          setSelectedParts(copy);
                        }}
                        className="w-36 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={sp.quantity}
                        onChange={(e) => {
                          const copy = [...selectedParts];
                          copy[idx].quantity = parseFloat(e.target.value) || 1;
                          setSelectedParts(copy);
                        }}
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center"
                        placeholder="الكمية"
                      />

                      <input
                        type="number"
                        value={sp.unitCost}
                        onChange={(e) => {
                          const copy = [...selectedParts];
                          copy[idx].unitCost = parseFloat(e.target.value) || 0;
                          setSelectedParts(copy);
                        }}
                        className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        placeholder="السعر"
                      />

                      <button
                        type="button"
                        onClick={() => removePartRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
                <div className="pt-2 text-left font-mono font-bold text-xs text-slate-700">
                  إجمالي القطع المصروفة: {formatAmount(totalParts)}
                </div>
              </div>

              {/* Total Order Cost Preview */}
              <div className="p-4 rounded-xl bg-fleet-50 border border-fleet-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-fleet-900">إجمالي تكلفة أمر الصيانة المحسوبة:</span>
                  <p className="text-[11px] text-fleet-700">عمالة + قطع غيار مصروفة فعلياً</p>
                </div>
                <div className="text-xl font-extrabold text-fleet-700 font-mono">
                  {formatAmount(totalOrderEstimated)}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold shadow-md shadow-fleet-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'جاري الاعتماد والترحيل...' : 'اعتماد وحفظ أمر الصيانة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
