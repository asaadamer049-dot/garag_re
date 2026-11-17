'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Boxes,
  Warehouse,
  FileText,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Scale,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Check,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

const MOVEMENT_TYPES: Record<string, { label: string; badge: string; color: string; icon: any; desc: string }> = {
  RECEIPT: {
    label: 'إذن استلام مخزني (وارد)',
    badge: 'استلام بضاعة',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: ArrowDownLeft,
    desc: 'توريد قطع غيار أو زيوت للمستودع بزيادة الرصيد المتاح',
  },
  ISSUE: {
    label: 'إذن صرف مخزني (منصرف)',
    badge: 'صرف واستهلاك',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    icon: ArrowUpRight,
    desc: 'صرف قطع أو زيوت لأمر صيانة أو تشغيل مركبة بخصم الرصيد',
  },
  ADJUSTMENT: {
    label: 'إذن تسوية جردية',
    badge: 'تسوية جرد',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: Scale,
    desc: 'مطابقة وتعديل الرصيد الدفتري مع الجرد الفعلي الفعلي بالمستودع',
  },
  RETURN: {
    label: 'إذن إرجاع مخزني',
    badge: 'إرجاع لمستودع',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    icon: RotateCcw,
    desc: 'إعادة قطع أو عبوات غير مستخدمة إلى رصيد المستودع',
  },
  TRANSFER: {
    label: 'إذن تحويل بين مستودعات',
    badge: 'تحويل داخلي',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    icon: ArrowLeftRight,
    desc: 'نقل كميات من مستودع رئيسي إلى مستودع فرعي أو ورشة',
  },
};

export default function StockMovementsClientView() {
  const { formatAmount } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    movementType: 'RECEIPT',
    partId: '',
    warehouseId: '',
    targetWarehouseId: '',
    quantity: 1,
    unitCost: 0,
    referenceType: 'MANUAL_VOUCHER',
    referenceId: '',
    movementDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/movements');
      const json = await res.json();
      if (json.data) {
        setMovements(json.data.movements || []);
        setStats(json.data.stats || {});
        setParts(json.data.parts || []);
        setWarehouses(json.data.warehouses || []);
      }
    } catch (e: any) {
      console.error(e);
      showToast('فشل في تحميل حركات المخزون', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchType = typeFilter === 'ALL' || m.movementType === typeFilter;
      const matchWh = warehouseFilter === 'ALL' || m.warehouseId === warehouseFilter;
      const matchSearch =
        !searchQuery ||
        m.movementNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.part?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.part?.partCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.referenceType && m.referenceType.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchType && matchWh && matchSearch;
    });
  }, [movements, typeFilter, warehouseFilter, searchQuery]);

  // Selected Part and its current stock in the chosen warehouse
  const selectedPart = useMemo(() => {
    return parts.find((p) => p.id === form.partId) || null;
  }, [parts, form.partId]);

  const currentStockInSelectedWh = useMemo(() => {
    if (!selectedPart || !form.warehouseId) return 0;
    const balance = selectedPart.stockBalances?.find((sb: any) => sb.warehouseId === form.warehouseId);
    return balance ? balance.quantityOnHand : 0;
  }, [selectedPart, form.warehouseId]);

  // Calculate projected balance after movement
  const projectedBalance = useMemo(() => {
    const qty = parseFloat(form.quantity.toString()) || 0;
    if (form.movementType === 'RECEIPT' || form.movementType === 'RETURN') {
      return currentStockInSelectedWh + qty;
    } else if (form.movementType === 'ISSUE' || form.movementType === 'TRANSFER') {
      return Math.max(0, currentStockInSelectedWh - qty);
    } else if (form.movementType === 'ADJUSTMENT') {
      return qty; // in adjustment, we set the actual physical count
    }
    return currentStockInSelectedWh;
  }, [form.movementType, currentStockInSelectedWh, form.quantity]);

  // Open modal with specific default type
  const openNewMovementModal = (defaultType: string = 'RECEIPT') => {
    const defaultPart = parts.length > 0 ? parts[0] : null;
    const defaultWh = warehouses.length > 0 ? warehouses[0] : null;
    const secondWh = warehouses.length > 1 ? warehouses[1] : null;

    setForm({
      movementType: defaultType,
      partId: defaultPart ? defaultPart.id : '',
      warehouseId: defaultWh ? defaultWh.id : '',
      targetWarehouseId: secondWh ? secondWh.id : '',
      quantity: 10,
      unitCost: 25,
      referenceType: defaultType === 'RECEIPT' ? 'فاتورة توريد / استلام' : defaultType === 'ISSUE' ? 'إذن صرف ورشة' : 'محضر جرد فعلي',
      referenceId: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      movementDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowModal(true);
  };

  // Submit Movement
  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partId || !form.warehouseId || !form.quantity) {
      showToast('يرجى اختيار الصنف والمستودع وتحديد الكمية', 'error');
      return;
    }

    if (form.movementType === 'ISSUE' && currentStockInSelectedWh < form.quantity) {
      showToast(`الرصيد المتاح بالمستودع (${currentStockInSelectedWh}) لا يكفي لصرف كمية (${form.quantity})`, 'error');
      return;
    }

    if (form.movementType === 'TRANSFER' && (!form.targetWarehouseId || form.targetWarehouseId === form.warehouseId)) {
      showToast('يرجى اختيار مستودع وجهة مختلف لعملية التحويل', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: parseFloat(form.quantity.toString()),
          unitCost: parseFloat(form.unitCost.toString()) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في تسجيل الحركة المخزنية');

      showToast(data.message || 'تم اعتماد وتوثيق الحركة المخزنية بنجاح');
      setShowModal(false);
      fetchMovements();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-fleet-50 text-fleet-600 flex items-center justify-center border border-fleet-200/60 shadow-sm">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <span>سجل حركات المخزون والأذون الرسمية (Stock Movements)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            توثيق واعتماد أذون الاستلام والصرف والتسويات والتحويل المخزني لقطع الغيار والزيوت والفلاتر
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openNewMovementModal('RECEIPT')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ إذن استلام مخزني (وارد)</span>
          </button>

          <button
            onClick={() => openNewMovementModal('ISSUE')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ إذن صرف مخزني (منصرف)</span>
          </button>

          <button
            onClick={() => openNewMovementModal('ADJUSTMENT')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition-all cursor-pointer"
          >
            <Scale className="w-4 h-4 text-amber-600" />
            <span>إذن تسوية جردية</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">إجمالي الحركات المعتمدة</p>
            <h3 className="text-xl font-black text-slate-900 mt-1 font-mono">
              {stats.totalMovements || movements.length}
              <span className="text-xs text-slate-400 font-normal mr-1.5 font-sans">حركة مسجلة</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">غير قابلة للتعديل أو الحذف المباشر</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">أذون الاستلام (الوارد)</p>
            <h3 className="text-xl font-black text-emerald-600 mt-1 font-mono">
              {stats.receiptsCount || 0}
              <span className="text-xs text-slate-400 font-normal mr-1.5 font-sans">إذن توريد</span>
            </h3>
            <p className="text-[10px] text-emerald-600 mt-1 font-semibold">شراء محلي وتوريدات معتمدة</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">أذون الصرف (المنصرف)</p>
            <h3 className="text-xl font-black text-blue-600 mt-1 font-mono">
              {stats.issuesCount || 0}
              <span className="text-xs text-slate-400 font-normal mr-1.5 font-sans">إذن صرف</span>
            </h3>
            <p className="text-[10px] text-blue-600 mt-1 font-semibold">صيانة وورشة واستهلاك تشغيلي</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">التسويات والتحويلات</p>
            <h3 className="text-xl font-black text-amber-600 mt-1 font-mono">
              {(stats.adjustmentsCount || 0) + (stats.transfersCount || 0) + (stats.returnsCount || 0)}
              <span className="text-xs text-slate-400 font-normal mr-1.5 font-sans">حركة تسوية</span>
            </h3>
            <p className="text-[10px] text-amber-600 mt-1 font-semibold">مطابقات جرد وتحويل مستودعات</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Pills for Movement Types */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'كل الحركات' },
            { id: 'RECEIPT', label: 'أذون استلام (وارد)' },
            { id: 'ISSUE', label: 'أذون صرف (منصرف)' },
            { id: 'ADJUSTMENT', label: 'تسويات جردية' },
            { id: 'RETURN', label: 'إرجاع مخزني' },
            { id: 'TRANSFER', label: 'تحويل بين مستودعات' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setTypeFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                typeFilter === pill.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث برقم الإذن، كود الصنف، أو المرجع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500"
          />
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3.5 px-4">رقم السند المخزني</th>
                <th className="py-3.5 px-4">نوع الحركة</th>
                <th className="py-3.5 px-4">كود واسم الصنف</th>
                <th className="py-3.5 px-4">المستودع</th>
                <th className="py-3.5 px-4 text-center">الكمية</th>
                <th className="py-3.5 px-4">تكلفة الوحدة</th>
                <th className="py-3.5 px-4">إجمالي القيمة</th>
                <th className="py-3.5 px-4">المرجع / السند</th>
                <th className="py-3.5 px-4">التاريخ والمسؤول</th>
                <th className="py-3.5 px-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.map((m) => {
                const meta = MOVEMENT_TYPES[m.movementType] || {
                  label: m.movementType,
                  badge: m.movementType,
                  color: 'text-slate-700 bg-slate-100 border-slate-200',
                  icon: ArrowLeftRight,
                };
                const IconComponent = meta.icon;
                const isPositive = m.movementType === 'RECEIPT' || m.movementType === 'RETURN';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Movement Number */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {m.movementNumber}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1 ${meta.color}`}>
                        <IconComponent className="w-3 h-3" />
                        <span>{meta.badge}</span>
                      </span>
                    </td>

                    {/* Part Code & Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{m.part?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-bold">
                        {m.part?.partCode} • {m.part?.category?.name || 'قطع غيار'}
                      </div>
                    </td>

                    {/* Warehouse */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {m.warehouse?.name}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-center font-mono font-black">
                      <span className={isPositive ? 'text-emerald-700' : 'text-slate-900'}>
                        {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                      </span>
                      <span className="text-[10px] font-normal text-slate-400 mr-1">
                        {m.part?.unitOfMeasure || 'وحدة'}
                      </span>
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {formatAmount(m.unitCost || 0)}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatAmount((m.quantity || 0) * (m.unitCost || 0))}
                    </td>

                    {/* Reference */}
                    <td className="py-3 px-4 text-slate-600 text-[11px] font-mono">
                      <div>{m.referenceType || 'سند يدوي'}</div>
                      {m.referenceId && <div className="text-[10px] text-slate-400">{m.referenceId}</div>}
                    </td>

                    {/* Date & User */}
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-mono text-[11px]">
                        {new Date(m.movementDate).toLocaleDateString('ar-SA')}
                      </div>
                      <div className="text-[10px] text-slate-400">{m.createdBy || 'مسؤول النظام'}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        معتمد
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMovements.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700 text-sm">لا توجد حركات مخزنية مسجلة تطابق البحث</h4>
            <p className="text-xs text-slate-400 mt-1">يمكنك تسجيل إذن استلام أو صرف جديد بالضغط على الأزرار أعلاه.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: RECORD NEW STOCK MOVEMENT */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fleet-50 text-fleet-600 flex items-center justify-center border border-fleet-200">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تسجيل حركة مخزنية رسمية جديدة</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إصدار إذن استلام، إذن صرف، تسوية جردية، أو تحويل داخلي مع تحديث الأرصدة تلقائياً
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitMovement} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Movement Type Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  نوع الإذن / الحركة المخزنية <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {Object.entries(MOVEMENT_TYPES).map(([typeKey, meta]) => {
                    const isSelected = form.movementType === typeKey;
                    const IconComp = meta.icon;

                    return (
                      <div
                        key={typeKey}
                        onClick={() => setForm({ ...form, movementType: typeKey })}
                        className={`p-3 rounded-2xl border text-right cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-fleet-600 bg-fleet-50/50 shadow-sm ring-2 ring-fleet-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`p-1.5 rounded-lg border ${meta.color}`}>
                            <IconComp className="w-4 h-4" />
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-fleet-600" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{meta.badge}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{meta.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Part & Warehouse Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Part */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الصنف المستهدف (قطع غيار / زيوت / فلاتر) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.partId}
                    onChange={(e) => setForm({ ...form, partId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- اختر الصنف من الدليل --</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.partCode} — {p.name} ({p.unitOfMeasure})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warehouse */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المستودع <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.warehouseId}
                    onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- اختر المستودع --</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Warehouse if TRANSFER */}
              {form.movementType === 'TRANSFER' && (
                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1">
                    مستودع الوجهة المستلم للتحويل <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.targetWarehouseId}
                    onChange={(e) => setForm({ ...form, targetWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-200 bg-indigo-50/50"
                  >
                    <option value="">-- اختر المستودع المحول إليه --</option>
                    {warehouses
                      .filter((wh) => wh.id !== form.warehouseId)
                      .map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.name} ({wh.code})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Stock Preview Banner */}
              {selectedPart && form.warehouseId && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">الرصيد الفعلي الحالي بالمستودع:</span>
                    <strong className="text-slate-900 font-mono text-sm">
                      {currentStockInSelectedWh.toLocaleString()} {selectedPart.unitOfMeasure}
                    </strong>
                  </div>
                  <div className="text-left">
                    <span className="text-slate-500 block text-[11px]">الرصيد المتوقع بعد التنفيذ:</span>
                    <strong
                      className={`font-mono text-sm ${
                        projectedBalance > currentStockInSelectedWh
                          ? 'text-emerald-700'
                          : projectedBalance < currentStockInSelectedWh
                          ? 'text-blue-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {projectedBalance.toLocaleString()} {selectedPart.unitOfMeasure}
                    </strong>
                  </div>
                </div>
              )}

              {/* Quantity & Unit Cost */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الكمية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سعر تكلفة الوحدة (ر.س)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.unitCost}
                    onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Reference & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم السند المرجعي / الفاتورة / أمر الصيانة
                  </label>
                  <input
                    type="text"
                    value={form.referenceId}
                    onChange={(e) => setForm({ ...form, referenceId: e.target.value })}
                    placeholder="مثال: فاتورة رقم INV-4029 أو أمر صيانة MO-2026-001"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الحركة</label>
                  <input
                    type="date"
                    required
                    value={form.movementDate}
                    onChange={(e) => setForm({ ...form, movementDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان والملاحظات</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="سبب الحركة، اسم المورد، المستلم، أو محضر لجنة الجرد..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold shadow-md shadow-fleet-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'جارٍ الاعتماد...' : 'اعتماد وترحيل الحركة للمستودع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

