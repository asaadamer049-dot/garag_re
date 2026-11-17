'use client';

import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Gauge,
  TrendingDown,
  DollarSign,
  Truck,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

export default function FuelPage() {
  const { symbol, formatAmount } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [vehicleId, setVehicleId] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [quantityLiters, setQuantityLiters] = useState('');
  const [unitPrice, setUnitPrice] = useState('1.15'); // Standard Diesel price in SAR
  const [stationName, setStationName] = useState('محطة محروقات ساسكو');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [notes, setNotes] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFuelData = async () => {
    setLoading(true);
    try {
      const [fuelRes, vehRes] = await Promise.all([
        fetch('/api/fuel'),
        fetch('/api/vehicles'),
      ]);

      const fuelData = await fuelRes.json();
      const vehData = await vehRes.json();

      if (fuelData.data) setTransactions(fuelData.data);
      if (vehData.data) {
        setVehicles(vehData.data);
        if (vehData.data.length > 0 && !vehicleId) {
          setVehicleId(vehData.data[0].id);
          setOdometerReading(vehData.data[0].currentOdometer.toString());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelData();
  }, []);

  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    const v = vehicles.find((x) => x.id === vId);
    if (v) setOdometerReading(v.currentOdometer.toString());
  };

  const calculatedTotal = (parseFloat(quantityLiters) || 0) * (parseFloat(unitPrice) || 0);

  // Overall aggregates
  const totalLiters = transactions.reduce((acc, t) => acc + t.quantityLiters, 0);
  const totalFuelCost = transactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const avgCostPerLiter = totalLiters > 0 ? (totalFuelCost / totalLiters).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          odometerReading,
          quantityLiters,
          unitPrice,
          totalAmount: calculatedTotal,
          stationName,
          invoiceNumber,
          paymentMethod,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشل في حفظ معاملة الوقود');
        setSubmitting(false);
        return;
      }

      setFormSuccess('تم تسجيل تعبئة الوقود واحتساب مؤشرات الكفاءة بنجاح!');
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
        setQuantityLiters('');
        fetchFuelData();
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
            <Fuel className="w-6 h-6 text-fleet-600" />
            <span>تسجيل واستهلاك الوقود وتحليل الكفاءة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            حساب معدل الاستهلاك الرياضي (لتر/100 كم)، تكلفة الكيلومتر، وتدقيق التعبئات والعدادات
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-sm shadow-md shadow-fleet-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل تعبئة وقود</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500">إجمالي اللترات المستهلكة</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {totalLiters.toLocaleString()} <span className="text-xs font-normal">لتر</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">محسوب من حركات التعبئة الفعلية</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500">إجمالي تكلفة الوقود</span>
          <div className="text-2xl font-extrabold text-fleet-600 font-mono mt-1">
            {formatAmount(totalFuelCost)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block font-medium">معتمد ومطابق للحسابات</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500">متوسط سعر اللتر الفعلي</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {avgCostPerLiter} <span className="text-xs font-normal">{symbol} / لتر</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">متوسط مرجح لجميع المعاملات</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">رقم المعاملة</th>
                <th className="py-3.5 px-4 font-bold">المركبة</th>
                <th className="py-3.5 px-4 font-bold">قراءة العداد</th>
                <th className="py-3.5 px-4 font-bold">الكمية</th>
                <th className="py-3.5 px-4 font-bold">سعر اللتر</th>
                <th className="py-3.5 px-4 font-bold">الإجمالي</th>
                <th className="py-3.5 px-4 font-bold">المحطة / المورد</th>
                <th className="py-3.5 px-4 font-bold">طريقة الدفع</th>
                <th className="py-3.5 px-4 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    جاري تحميل سجلات الوقود...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد عمليات وقود مسجلة بعد.
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {tr.transactionNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {tr.vehicle?.internalCode} ({tr.vehicle?.plateNumber})
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                      {tr.odometerReading.toLocaleString()} كم
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {tr.quantityLiters} لتر
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {tr.unitPrice} {symbol}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                      {formatAmount(tr.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 text-xs">
                      {tr.stationName || tr.supplier?.name || 'محطة معتمدة'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                        {tr.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {new Date(tr.transactionDate).toLocaleDateString('ar-SA')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Fuel Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Fuel className="w-5 h-5 text-fleet-600" />
                <span>تسجيل تعبئة وقود جديدة</span>
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

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">قراءة العداد الحالية (كم) *</label>
                  <input
                    type="number"
                    required
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الكمية باللتر *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={quantityLiters}
                    onChange={(e) => setQuantityLiters(e.target.value)}
                    placeholder="مثال: 150"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">سعر اللتر ({symbol}) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">المبلغ الإجمالي المحسوب:</span>
                <span className="text-lg font-extrabold text-emerald-700 font-mono">
                  {formatAmount(calculatedTotal)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المحطة</label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="CARD">بطاقة بترول / مدى</option>
                    <option value="CASH">نقدي</option>
                    <option value="INVOICE">فاتورة آجلة</option>
                  </select>
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
                  {submitting ? 'جاري الحفظ والتحليل...' : 'اعتماد وحفظ التعبئة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
