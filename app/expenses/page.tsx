'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  DollarSign,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

export default function ExpensesPage() {
  const { symbol, formatAmount, currency } = useCurrency();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [vehicleId, setVehicleId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [sourceType, setSourceType] = useState('DIRECT_INVOICE');
  const [sourceId, setSourceId] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const [expRes, vehRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/vehicles'),
      ]);

      const expData = await expRes.json();
      const vehData = await vehRes.json();

      if (expData.data) setExpenses(expData.data);
      if (vehData.data) {
        setVehicles(vehData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const totalExpensesSum = expenses.reduce((acc, e) => acc + e.totalAmount, 0);
  const totalPaidSum = expenses.reduce((acc, e) => {
    const paid = e.payments?.reduce((pAcc: number, p: any) => pAcc + p.amount, 0) || 0;
    return acc + paid;
  }, 0);
  const totalOutstanding = totalExpensesSum - totalPaidSum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicleId || null,
          expenseCategoryId: expenseCategoryId || 'EXP-MAINT', // fallback
          description,
          subtotal,
          taxAmount,
          initialPaymentAmount,
          paymentMethod,
          sourceType: sourceType || null,
          sourceId: sourceId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشل في حفظ المصروف');
        setSubmitting(false);
        return;
      }

      setFormSuccess('تم حفظ المصروف وتسجيل المدفوعات بنجاح دون ازدواجية مالية!');
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
        fetchExpenses();
      }, 700);
    } catch {
      setFormError('حدث خطأ بالاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-fleet-600" />
            <span>سجل المصروفات الموحد والمدفوعات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            الدفتر المالي الموحد لمنع الازدواجية، الفصل الدقيق بين المصروف والمدفوع، وتتبع الذمم المستحقة
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-sm shadow-md shadow-fleet-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل مصروف مالي</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500">إجمالي المصروفات المعتمدة</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {formatAmount(totalExpensesSum)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">قيمة الالتزامات والخدمات الفعلية</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500">إجمالي المبالغ المسددة</span>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
            {formatAmount(totalPaidSum)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block font-medium">مدفوعات نقدية وبنكية مثبتة</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500">المتبقي والمستحق للدفع</span>
          <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">
            {formatAmount(totalOutstanding)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">ذمم مستحقة للموردين والمراكز</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">رقم المصروف</th>
                <th className="py-3.5 px-4 font-bold">البيان والتفاصيل</th>
                <th className="py-3.5 px-4 font-bold">المركبة</th>
                <th className="py-3.5 px-4 font-bold">التصنيف</th>
                <th className="py-3.5 px-4 font-bold">المصدر التشغيلي</th>
                <th className="py-3.5 px-4 font-bold">المبلغ الإجمالي</th>
                <th className="py-3.5 px-4 font-bold">المدفوع</th>
                <th className="py-3.5 px-4 font-bold">المتبقي</th>
                <th className="py-3.5 px-4 font-bold">حالة السداد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    جاري تحميل المصروفات...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد مصروفات مسجلة بعد.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const paid = exp.payments?.reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
                  const remaining = Math.max(0, exp.totalAmount - paid);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {exp.expenseNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {exp.description}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {exp.vehicle ? (
                          <span className="font-bold">{exp.vehicle.internalCode}</span>
                        ) : (
                          <span className="text-xs text-slate-400">مصروف إداري عام</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {exp.category?.name || 'مصروف عام'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {exp.sourceType ? `${exp.sourceType}` : 'قيد مباشر'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatAmount(exp.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">
                        {formatAmount(paid)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-rose-600">
                        {formatAmount(remaining)}
                      </td>
                      <td className="py-3.5 px-4">
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
                            ? 'مسدد بالكامل'
                            : exp.paymentStatus === 'PARTIAL'
                            ? 'مسدد جزئياً'
                            : 'مستحق'}
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

      {/* New Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-fleet-600" />
                <span>تسجيل مصروف مالي معتمد</span>
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">البيان / الوصف التفصيلي *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: رسوم تجديد رخصة السير والفحص الدوري"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المركبة المعنية (اختياري)</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="">مصروف إداري عام</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.internalCode} - {v.plateNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المبلغ الصافي ({symbol}) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ضريبة القيمة المضافة (15%)</label>
                  <input
                    type="number"
                    step="any"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الدفعة المسددة فوراً ({symbol})</label>
                  <input
                    type="number"
                    step="any"
                    value={initialPaymentAmount}
                    onChange={(e) => setInitialPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldAlert className="w-4 h-4 text-fleet-600" />
                  <span>ضوابط الحماية من الازدواجية المالية (Anti-Double Counting)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  إذا كان هذا المصروف ناتجاً عن أمر صيانة أو تعبئة وقود تم ترحيلها مسبقاً، يرجى عدم تسجيله هنا يدوياً لتفادي احتساب المبلغ مرتين.
                </p>
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
                  {submitting ? 'جاري الاعتماد...' : 'اعتماد وتسجيل المصروف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
