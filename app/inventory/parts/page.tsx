'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Warehouse,
} from 'lucide-react';

export default function InventoryPartsPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New part state
  const [formData, setFormData] = useState({
    partCode: '',
    name: '',
    categoryId: '',
    manufacturer: '',
    partNumber: '',
    unitOfMeasure: 'PCS',
    minimumStock: 5,
    initialWarehouseId: '',
    initialQuantity: 0,
    initialUnitCost: 0,
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (selectedCategory) q.set('categoryId', selectedCategory);

      const res = await fetch(`/api/inventory/parts?${q.toString()}`);
      const data = await res.json();
      if (data.data) {
        setParts(data.data.parts || []);
        setCategories(data.data.categories || []);
        setWarehouses(data.data.warehouses || []);
        if (data.data.categories?.length > 0 && !formData.categoryId) {
          setFormData((prev) => ({
            ...prev,
            categoryId: data.data.categories[0].id,
            initialWarehouseId: data.data.warehouses?.[0]?.id || '',
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [search, selectedCategory]);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/inventory/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشل في حفظ الصنف');
        setSubmitting(false);
        return;
      }

      setFormSuccess('تمت إضافة الصنف واعتماد رصيده بنجاح!');
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
        fetchParts();
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
            <Boxes className="w-6 h-6 text-fleet-600" />
            <span>مخزون قطع الغيار والمستودعات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            دليل الأصناف، أرصدة المستودعات، وحدود الطلب الأدنى، وحركات الصرف والاستلام بالمتوسط المرجح
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-sm shadow-md shadow-fleet-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة صنف جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بكود الصنف، الاسم، أو رقم القطعة..."
            className="w-full pl-3 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fleet-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fleet-500 text-slate-800 font-medium"
          >
            <option value="">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">كود الصنف</th>
                <th className="py-3.5 px-4 font-bold">اسم القطعة</th>
                <th className="py-3.5 px-4 font-bold">التصنيف</th>
                <th className="py-3.5 px-4 font-bold">الشركة المصنعة</th>
                <th className="py-3.5 px-4 font-bold">رقم القطعة الأصلي</th>
                <th className="py-3.5 px-4 font-bold">الرصيد المتاح</th>
                <th className="py-3.5 px-4 font-bold">حد الطلب الأدنى</th>
                <th className="py-3.5 px-4 font-bold">حالة المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    جاري تحميل المخزون...
                  </td>
                </tr>
              ) : parts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا توجد أصناف مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                parts.map((p) => {
                  const totalOnHand = p.stockBalances?.reduce(
                    (acc: number, b: any) => acc + b.quantityOnHand,
                    0
                  ) || 0;
                  const isLow = totalOnHand <= p.minimumStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.partCode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {p.category?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {p.manufacturer || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {p.partNumber || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {totalOnHand} {p.unitOfMeasure}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">
                        {p.minimumStock} {p.unitOfMeasure}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isLow
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isLow ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>منخفض / إعادة طلب</span>
                            </>
                          ) : (
                            <span>متوفر ومطابق</span>
                          )}
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

      {/* Add Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Boxes className="w-5 h-5 text-fleet-600" />
                <span>إضافة صنف جديد إلى دليل قطع الغيار</span>
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

            <form onSubmit={handleCreatePart} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">كود الصنف *</label>
                  <input
                    type="text"
                    required
                    value={formData.partCode}
                    onChange={(e) => setFormData({ ...formData, partCode: e.target.value })}
                    placeholder="مثال: FLT-AIR-02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم القطعة *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: فلتر هواء أكتروس أصلي"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">التصنيف *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الشركة المصنعة</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="مثال: Bosch / Mann"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم القطعة (Part No)</label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    placeholder="004 094 35 04"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">وحدة القياس</label>
                  <select
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="PCS">حبة (PCS)</option>
                    <option value="SET">طقم (SET)</option>
                    <option value="LITER">لتر (LITER)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الحد الأدنى للطلب</label>
                  <input
                    type="number"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Initial Warehouse Stock */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">الرصيد الافتتاحي (إذن استلام أولي)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">المستودع</label>
                    <select
                      value={formData.initialWarehouseId}
                      onChange={(e) => setFormData({ ...formData, initialWarehouseId: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">الكمية الافتتاحية</label>
                    <input
                      type="number"
                      value={formData.initialQuantity}
                      onChange={(e) => setFormData({ ...formData, initialQuantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">سعر التكلفة (ر.س)</label>
                    <input
                      type="number"
                      value={formData.initialUnitCost}
                      onChange={(e) => setFormData({ ...formData, initialUnitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
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
                  {submitting ? 'جاري الحفظ...' : 'حفظ الصنف وتثبيت الرصيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
