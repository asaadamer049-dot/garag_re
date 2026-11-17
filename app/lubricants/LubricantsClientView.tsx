'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Droplet,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  Truck,
  Wrench,
  Layers,
  FileSpreadsheet,
  X,
  Edit2,
  Trash2,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Info,
  Car,
  Calendar,
  DollarSign,
  Check,
  RotateCcw,
  Boxes,
  Warehouse,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

// Product Type Helpers
const PRODUCT_TYPES: Record<string, { label: string; color: string; badge: string }> = {
  ENGINE_OIL: { label: 'زيوت محركات', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: 'محرك' },
  GEAR_OIL: { label: 'زيوت قير ودفرنس', color: 'text-blue-700 bg-blue-50 border-blue-200', badge: 'تروس / دفرنس' },
  ATF: { label: 'سوائل قير أوتوماتيك', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', badge: 'ATF أوتوماتيك' },
  HYDRAULIC: { label: 'زيوت هيدروليك', color: 'text-cyan-700 bg-cyan-50 border-cyan-200', badge: 'هيدروليك' },
  COOLANT: { label: 'سوائل تبريد ورديتر', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badge: 'ماء رديتر' },
  BRAKE_FLUID: { label: 'سوائل فرامل وقوابض', color: 'text-purple-700 bg-purple-50 border-purple-200', badge: 'فرامل DOT' },
  FILTER_OIL: { label: 'فلاتر زيت', color: 'text-rose-700 bg-rose-50 border-rose-200', badge: 'فلتر زيت' },
  FILTER_FUEL: { label: 'فلاتر وقود وفاصل مياه', color: 'text-orange-700 bg-orange-50 border-orange-200', badge: 'فلتر ديزل' },
  FILTER_AIR: { label: 'فلاتر هواء', color: 'text-teal-700 bg-teal-50 border-teal-200', badge: 'فلتر هواء' },
  FILTER_HYDRAULIC: { label: 'فلاتر مجفف وهيدروليك', color: 'text-slate-700 bg-slate-100 border-slate-300', badge: 'مجفف هواء' },
};

const BASE_TYPES: Record<string, string> = {
  MINERAL: 'معدني Mineral',
  SEMI_SYNTHETIC: 'نصف تخليقي Semi-Synthetic',
  SYNTHETIC: 'تخليقي بالكامل Full Synthetic',
  NA: 'غير منطبق N/A',
};

const SYSTEM_NAMES: Record<string, string> = {
  ENGINE: 'المحرك (Engine)',
  TRANSMISSION: 'ناقل الحركة (Transmission)',
  DIFFERENTIAL: 'الدفرنس والمحاور (Differential)',
  HYDRAULIC: 'الهيدروليك والروافع (Hydraulic)',
  COOLING: 'دورة التبريد (Cooling)',
  FILTERS: 'الفلاتر الدورية (Filters)',
};

export default function LubricantsClientView() {
  const { formatAmount } = useCurrency();

  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<'products' | 'specs' | 'services' | 'alerts'>('products');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [specs, setSpecs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertCounts, setAlertCounts] = useState({ totalVehicles: 0, overdue: 0, dueSoon: 0, ok: 0 });
  const [stats, setStats] = useState<any>({});
  const [meta, setMeta] = useState<{ vehicleTypes: any[]; vehicles: any[]; warehouses?: any[] }>({ vehicleTypes: [], vehicles: [], warehouses: [] });
  const [syncing, setSyncing] = useState(false);

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [showSpecModal, setShowSpecModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    productCode: '',
    name: '',
    lubricantType: 'ENGINE_OIL',
    brand: '',
    viscosityGrade: '',
    specification: '',
    oilBase: 'MINERAL',
    defaultIntervalKm: 10000,
    defaultIntervalDays: 90,
    approxCost: 25,
    unitOfMeasure: 'LITER',
    initialStock: 100,
    warehouseId: '',
  });

  const [specForm, setSpecForm] = useState({
    vehicleTypeId: '',
    lubricantProductId: '',
    systemName: 'ENGINE',
    requiredQuantity: 12,
    changeIntervalKm: 10000,
    changeIntervalDays: 90,
    notes: '',
  });

  const [serviceForm, setServiceForm] = useState({
    vehicleId: '',
    odometerReading: '',
    serviceDate: new Date().toISOString().split('T')[0],
    performedBy: 'ورشة الصيانة السريعة - الفني المناوب',
    notes: '',
    intervalKm: 10000,
    intervalDays: 90,
    selectedItems: [] as { lubricantProductId: string; quantity: number; unitCost: number }[],
  });

  // Action status message
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, specsRes, srvRes, alertsRes] = await Promise.all([
        fetch('/api/lubricants'),
        fetch('/api/lubricants/specs'),
        fetch('/api/lubricants/services'),
        fetch('/api/lubricants/alerts'),
      ]);

      const prodData = await prodRes.json();
      const specsData = await specsRes.json();
      const srvData = await srvRes.json();
      const alertsData = await alertsRes.json();

      if (prodData.data) {
        setProducts(prodData.data);
        setStats(prodData.stats || {});
        setMeta(prodData.meta || { vehicleTypes: [], vehicles: [] });
      }
      if (specsData.data) setSpecs(specsData.data);
      if (srvData.data) setServices(srvData.data);
      if (alertsData.data) {
        setAlerts(alertsData.data);
        if (alertsData.counts) setAlertCounts(alertsData.counts);
      }
    } catch (e: any) {
      console.error(e);
      showToast('حدث خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesType =
        productTypeFilter === 'ALL'
          ? true
          : productTypeFilter === 'ENGINE'
          ? p.lubricantType === 'ENGINE_OIL'
          : productTypeFilter === 'GEAR'
          ? ['GEAR_OIL', 'ATF'].includes(p.lubricantType)
          : productTypeFilter === 'HYDRAULIC_COOLANT'
          ? ['HYDRAULIC', 'COOLANT', 'BRAKE_FLUID'].includes(p.lubricantType)
          : productTypeFilter === 'FILTERS'
          ? p.lubricantType.startsWith('FILTER_')
          : p.lubricantType === productTypeFilter;

      const matchesSearch =
        !searchQuery ||
        p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.viscosityGrade && p.viscosityGrade.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.specification && p.specification.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesType && matchesSearch;
    });
  }, [products, productTypeFilter, searchQuery]);

  // Sync inventory with parts catalog
  const handleSyncInventory = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/lubricants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_inventory' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في مزامنة المخزون');
      showToast(data.message || 'تمت مزامنة وتسجيل الأصناف في المخزون بنجاح');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Handle open Product Modal
  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      productCode: `OIL-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      lubricantType: 'ENGINE_OIL',
      brand: 'Mobil Delvac',
      viscosityGrade: '15W-40',
      specification: 'API CK-4 / CI-4 | ACEA E9 | MB 228.31',
      oilBase: 'MINERAL',
      defaultIntervalKm: 10000,
      defaultIntervalDays: 90,
      approxCost: 22.5,
      unitOfMeasure: 'LITER',
      initialStock: 100,
      warehouseId: meta.warehouses && meta.warehouses.length > 0 ? meta.warehouses[0].id : '',
    });
    setShowProductModal(true);
  };

  const openEditProductModal = (prod: any) => {
    setEditingProduct(prod);
    setProductForm({
      productCode: prod.productCode,
      name: prod.name,
      lubricantType: prod.lubricantType,
      brand: prod.brand || '',
      viscosityGrade: prod.viscosityGrade || '',
      specification: prod.specification || '',
      oilBase: prod.oilBase || 'MINERAL',
      defaultIntervalKm: prod.defaultIntervalKm || 10000,
      defaultIntervalDays: prod.defaultIntervalDays || 90,
      approxCost: prod.approxCost || 0,
      unitOfMeasure: prod.unitOfMeasure || 'LITER',
      initialStock: 0,
      warehouseId: '',
    });
    setShowProductModal(true);
  };

  // Submit Product (Create / Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingProduct ? `/api/lubricants/${editingProduct.id}` : '/api/lubricants';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'فشل في حفظ المنتج');

      showToast(data.message || 'تم حفظ الصنف بنجاح');
      setShowProductModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف الصنف "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/lubricants/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في حذف الصنف');
      showToast('تم حذف الصنف بنجاح');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Open Service Modal
  const openNewServiceModal = (vehicleId?: string) => {
    const vId = vehicleId || (meta.vehicles.length > 0 ? meta.vehicles[0].id : '');
    const vehicle = meta.vehicles.find((v) => v.id === vId);

    // Pick recommended engine oil and filter as defaults
    const defaultOil = products.find((p) => p.lubricantType === 'ENGINE_OIL') || products[0];
    const defaultFilter = products.find((p) => p.lubricantType === 'FILTER_OIL');

    const initialItems: any[] = [];
    if (defaultOil) {
      initialItems.push({
        lubricantProductId: defaultOil.id,
        quantity: 12,
        unitCost: defaultOil.approxCost || 22.5,
      });
    }
    if (defaultFilter) {
      initialItems.push({
        lubricantProductId: defaultFilter.id,
        quantity: 1,
        unitCost: defaultFilter.approxCost || 45,
      });
    }

    setServiceForm({
      vehicleId: vId,
      odometerReading: vehicle ? vehicle.currentOdometer.toString() : '0',
      serviceDate: new Date().toISOString().split('T')[0],
      performedBy: 'ورشة الصيانة السريعة - الفني المناوب',
      notes: 'تغيير زيت المحرك الدوري مع استبدال فلتر الزيت وفحص مستوى الزيوت والسوائل المتبقية.',
      intervalKm: defaultOil?.defaultIntervalKm || 10000,
      intervalDays: defaultOil?.defaultIntervalDays || 90,
      selectedItems: initialItems,
    });

    setShowServiceModal(true);
  };

  // Submit Service Record
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceForm.selectedItems.length === 0) {
      showToast('يرجى إضافة صنف واحد على الأقل من الزيوت أو الفلاتر', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/lubricants/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: serviceForm.vehicleId,
          odometerReading: parseFloat(serviceForm.odometerReading),
          serviceDate: serviceForm.serviceDate,
          performedBy: serviceForm.performedBy,
          notes: serviceForm.notes,
          intervalKm: serviceForm.intervalKm,
          intervalDays: serviceForm.intervalDays,
          items: serviceForm.selectedItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في تسجيل العملية');

      showToast(data.message || 'تم تسجيل عملية تغيير الزيت والفلاتر بنجاح');
      setShowServiceModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Vehicle Spec
  const handleSaveSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/lubricants/specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في حفظ المواصفة');

      showToast('تم حفظ مواصفة التزييت المعيارية بنجاح');
      setShowSpecModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Spec
  const handleDeleteSpec = async (id: string) => {
    if (!confirm('هل تريد حذف هذه المواصفة المعيارية؟')) return;
    try {
      const res = await fetch(`/api/lubricants/specs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل في حذف المواصفة');
      showToast('تم حذف المواصفة المعيارية');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-fleet-50 text-fleet-600 flex items-center justify-center border border-fleet-200/60 shadow-sm">
              <Droplet className="w-6 h-6" />
            </div>
            <span>إدارة الزيوت والفلاتر واللزوجة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            مواصفات زيوت المحركات ونواقل الحركة، فترات التغيير الكيلومترية والزمنية، وجودة المنتجات
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openNewServiceModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>تسجيل تغيير زيت / فلتر</span>
          </button>

          <button
            onClick={openNewProductModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-fleet-600 hover:bg-fleet-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-fleet-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف زيت / فلتر</span>
          </button>

          <button
            onClick={() => {
              if (meta.vehicleTypes.length > 0 && products.length > 0) {
                setSpecForm({
                  vehicleTypeId: meta.vehicleTypes[0].id,
                  lubricantProductId: products[0].id,
                  systemName: 'ENGINE',
                  requiredQuantity: 14,
                  changeIntervalKm: 15000,
                  changeIntervalDays: 90,
                  notes: 'معايير التزييت الموصى بها من المصنع',
                });
              }
              setShowSpecModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>مواصفة طراز مركبة</span>
          </button>

          <button
            onClick={handleSyncInventory}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-all cursor-pointer shadow-sm disabled:opacity-60"
            title="مزامنة وتسجيل كافة الأصناف في دليل قطع الغيار والمستودعات"
          >
            <Boxes className="w-4 h-4 text-blue-600" />
            <span>{syncing ? 'جارٍ المزامنة...' : 'مزامنة مع دليل المخزون'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">أصناف الزيوت المعتمدة</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              {(stats.engineOils || 0) + (stats.gearTransmissionOils || 0) + (stats.hydraulicsCoolants || 0)}
              <span className="text-xs text-slate-400 font-normal mr-1.5">صنف ولزوجة</span>
            </h3>
            <p className="text-[10px] text-amber-600 mt-1 font-semibold">
              {stats.engineOils || 0} محركات • {stats.gearTransmissionOils || 0} جير ودفرنس
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Droplet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">الفلاتر المعتمدة</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              {stats.filters || 0}
              <span className="text-xs text-slate-400 font-normal mr-1.5">نوع فلتر</span>
            </h3>
            <p className="text-[10px] text-rose-600 mt-1 font-semibold">زيت • ديزل • هواء • مجفف</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <Filter className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">رصيد المخزون المتوفر</p>
            <h3 className="text-xl font-black text-blue-700 mt-1 font-mono">
              {(stats.totalStockUnits || 0).toLocaleString()}
              <span className="text-xs text-slate-400 font-normal mr-1.5 font-sans">لتر / حبة</span>
            </h3>
            <p className="text-[10px] text-blue-600 mt-1 font-semibold">مسجل بالمستودع المركزي</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('alerts')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-fleet-300 transition-all"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500">استحقاق التغيير (تنبيهات)</p>
            <h3 className="text-xl font-black text-rose-600 mt-1">
              {alertCounts.overdue + alertCounts.dueSoon}
              <span className="text-xs text-slate-400 font-normal mr-1.5">مركبة مستحقة</span>
            </h3>
            <p className="text-[10px] text-rose-500 mt-1 font-semibold">
              {alertCounts.overdue} متأخرة فوراً • {alertCounts.dueSoon} مستحقة قريباً
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('services')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-fleet-300 transition-all"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500">عمليات التغيير المنفذة</p>
            <h3 className="text-xl font-black text-emerald-600 mt-1">
              {stats.totalServices || 0}
              <span className="text-xs text-slate-400 font-normal mr-1.5">عملية مسجلة</span>
            </h3>
            <p className="text-[10px] text-emerald-600 mt-1 font-semibold">سجل الصيانة الميدانية السريعة</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'products'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Droplet className="w-4 h-4" />
          <span>أصناف الزيوت والفلاتر واللزوجة</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'alerts'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>مراقبة استحقاق التغيير والأسطول</span>
          {(alertCounts.overdue > 0 || alertCounts.dueSoon > 0) && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold font-mono">
              {alertCounts.overdue + alertCounts.dueSoon}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('specs')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'specs'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>مواصفات وسعات طرازات المركبات</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {specs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'services'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل عمليات تغيير الزيت والفلاتر</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {services.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PRODUCTS & VISCOSITY GRADES */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'ENGINE', label: 'زيوت محركات' },
                { id: 'GEAR', label: 'نواقل حركة ودفرنس' },
                { id: 'HYDRAULIC_COOLANT', label: 'هيدروليك وتبريد' },
                { id: 'FILTERS', label: 'فلاتر معتمدة' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setProductTypeFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    productTypeFilter === btn.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث بالاسم، كود الصنف، اللزوجة، أو المعايير..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500 transition-all"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((lube) => {
              const typeMeta = PRODUCT_TYPES[lube.lubricantType] || {
                label: lube.lubricantType,
                color: 'text-slate-700 bg-slate-50 border-slate-200',
                badge: 'عام',
              };

              return (
                <div
                  key={lube.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Code & Viscosity Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                        {lube.productCode}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-fleet-50 text-fleet-700 border border-fleet-200 font-mono">
                        {lube.viscosityGrade || 'معتمد'}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{lube.name}</h3>

                    {/* Brand & Unit */}
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span>العلامة:</span>
                      <strong className="text-slate-800">{lube.brand || 'معتمدة'}</strong>
                      <span className="text-slate-300">|</span>
                      <span>الوحدة:</span>
                      <span className="font-mono text-slate-700 font-semibold">{lube.unitOfMeasure}</span>
                    </p>

                    {/* Badges Row: Base & Quality Specs */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${typeMeta.color}`}
                      >
                        {typeMeta.label}
                      </span>
                      {lube.oilBase && lube.oilBase !== 'NA' && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {BASE_TYPES[lube.oilBase] || lube.oilBase}
                        </span>
                      )}
                    </div>

                    {/* Specification / Approvals */}
                    {lube.specification && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-fleet-600" />
                          <span>معايير الجودة والاعتمادات:</span>
                        </div>
                        <p className="font-medium text-slate-700">{lube.specification}</p>
                      </div>
                    )}

                    {/* Intervals & Cost */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">فترة التغيير الموصى بها</span>
                        <div className="font-bold text-slate-800 flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-fleet-600" />
                          <span>{lube.defaultIntervalKm?.toLocaleString()} كم</span>
                          <span className="text-slate-300">/</span>
                          <span>{lube.defaultIntervalDays} يوم</span>
                        </div>
                      </div>

                      <div className="space-y-0.5 text-left">
                        <span className="text-[10px] text-slate-400 block">التكلفة التقديرية</span>
                        <span className="font-bold text-emerald-700 font-mono text-[12px]">
                          {formatAmount(lube.approxCost || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Warehouse Inventory Stock Status */}
                    {(() => {
                      const stockBalances = lube.part?.stockBalances || [];
                      const totalStock = stockBalances.reduce((sum: number, sb: any) => sum + (sb.quantityOnHand || 0), 0);
                      const minStock = lube.part?.minimumStock || 10;
                      const unitLabel = lube.unitOfMeasure === 'LITER' ? 'لتر' : 'حبة';
                      const isOutOfStock = totalStock <= 0;
                      const isLowStock = !isOutOfStock && totalStock <= minStock;

                      return (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                              <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                              <span>رصيد المستودع الحالي:</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isOutOfStock
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : isLowStock
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isOutOfStock ? 'نفذ من المخزون' : isLowStock ? 'مخزون منخفض' : 'متوفر بالمخزون'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono font-black text-slate-900 text-sm">
                                {totalStock.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">{unitLabel}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              التصنيف: <strong className="text-slate-700 font-bold">{lube.part?.category?.name || 'الزيوت والمشحمات'}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => openEditProductModal(lube)}
                      className="flex items-center gap-1 text-slate-500 hover:text-fleet-600 transition-colors cursor-pointer py-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(lube.id, lube.name)}
                      className="flex items-center gap-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer py-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-sm">لا توجد أصناف تطابق البحث</h4>
              <p className="text-xs text-slate-400 mt-1">يمكنك إضافة صنف زيت أو فلتر جديد بالضغط على الزر أعلاه.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DUE & OVERDUE FLEET ALERTS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>لوحة مراقبة استحقاق تغيير الزيوت والفلاتر للأسطول</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مقارنة العدادات اللحظية ومواعيد آخر تغيير، لاكتشاف المركبات المتأخرة أو المستحقة خلال فترة الأمان.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{alertCounts.overdue} متأخرة</span>
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>{alertCounts.dueSoon} مستحقة قريباً</span>
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{alertCounts.ok} سارية وبحالة ممتازة</span>
              </span>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">كود المركبة</th>
                    <th className="py-3 px-4">رقم اللوحة والطراز</th>
                    <th className="py-3 px-4">السائق المسؤول</th>
                    <th className="py-3 px-4">العداد الحالي</th>
                    <th className="py-3 px-4">عداد آخر تغيير</th>
                    <th className="py-3 px-4">عداد الاستحقاق</th>
                    <th className="py-3 px-4">المتبقي (كم / يوم)</th>
                    <th className="py-3 px-4">حالة الاستحقاق</th>
                    <th className="py-3 px-4 text-center">إجراء فوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map((al) => {
                    const isOverdue = al.status === 'OVERDUE';
                    const isDueSoon = al.status === 'DUE_SOON';

                    return (
                      <tr
                        key={al.vehicleId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isOverdue ? 'bg-rose-50/20' : isDueSoon ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {al.internalCode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{al.plateNumber}</div>
                          <div className="text-[10px] text-slate-400">{al.modelName}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{al.driverName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {al.currentOdometer?.toLocaleString()} كم
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {al.lastServiceOdo?.toLocaleString()} كم
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {al.nextDueOdo?.toLocaleString()} كم
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`font-mono font-bold ${
                              isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {isOverdue ? `متأخر بـ ${Math.abs(al.kmRemaining).toLocaleString()} كم` : `${al.kmRemaining.toLocaleString()} كم`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isOverdue
                              ? `متأخر ${Math.abs(al.daysRemaining)} يوم`
                              : `متبقي ${al.daysRemaining} يوم`}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isDueSoon
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOverdue ? 'bg-rose-600' : isDueSoon ? 'bg-amber-600' : 'bg-emerald-600'
                              }`}
                            ></span>
                            <span>{al.statusLabel}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openNewServiceModal(al.vehicleId)}
                            className="px-3 py-1.5 rounded-xl bg-fleet-50 hover:bg-fleet-600 hover:text-white text-fleet-700 text-xs font-bold border border-fleet-200 transition-all cursor-pointer"
                          >
                            تسجيل تغيير
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VEHICLE LUBRICATION & FILTER SPECS */}
      {activeTab === 'specs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-fleet-600" />
                <span>جدول المعايير والمواصفات المعتمدة لكل طراز مركبة</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد الكميات المعيارية (باللتر أو القطع) وفترات التغيير الموصى بها لكل فئة شاحنة أو مركبة.
              </p>
            </div>
            <button
              onClick={() => {
                if (meta.vehicleTypes.length > 0 && products.length > 0) {
                  setSpecForm({
                    vehicleTypeId: meta.vehicleTypes[0].id,
                    lubricantProductId: products[0].id,
                    systemName: 'ENGINE',
                    requiredQuantity: 12,
                    changeIntervalKm: 10000,
                    changeIntervalDays: 90,
                    notes: '',
                  });
                }
                setShowSpecModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-fleet-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-fleet-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مواصفة معيارية</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">فئة / طراز المركبة</th>
                    <th className="py-3 px-4">النظام المستهدف</th>
                    <th className="py-3 px-4">الصنف واللزوجة المعتمدة</th>
                    <th className="py-3 px-4">الكمية المطلوبة</th>
                    <th className="py-3 px-4">فترة التغيير (كيلومتر)</th>
                    <th className="py-3 px-4">فترة التغيير (أيام)</th>
                    <th className="py-3 px-4">ملاحظات التشغيل</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {specs.map((sp) => (
                    <tr key={sp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sp.vehicleType?.name || 'فئة عامة'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                          {SYSTEM_NAMES[sp.systemName] || sp.systemName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{sp.lubricantProduct?.name}</div>
                        <div className="text-[10px] text-fleet-600 font-mono font-bold">
                          {sp.lubricantProduct?.viscosityGrade || sp.lubricantProduct?.productCode}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {sp.requiredQuantity} {sp.lubricantProduct?.unitOfMeasure === 'PIECE' ? 'قطعة' : 'لتر'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {sp.changeIntervalKm?.toLocaleString()} كم
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{sp.changeIntervalDays} يوم</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                        {sp.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteSpec(sp.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="حذف المواصفة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SERVICE OPERATIONS LOG */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>سجل عمليات تغيير الزيوت والفلاتر المنفذة ميدانياً</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                أرشيف كامل لعمليات التزييت والصيانة السريعة مع قراءات العدادات والأصناف المصروفة.
              </p>
            </div>
            <button
              onClick={() => openNewServiceModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل عملية جديدة</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">رقم العملية</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">كود ولوحة المركبة</th>
                    <th className="py-3 px-4">قراءة العداد الحالية</th>
                    <th className="py-3 px-4">الزيوت والفلاتر المستبدلة</th>
                    <th className="py-3 px-4">الاستحقاق القادم (عداد / تاريخ)</th>
                    <th className="py-3 px-4">القائم بالعمل</th>
                    <th className="py-3 px-4">التكلفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-fleet-700">
                        {srv.serviceNumber || 'LUBE-SRV'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {new Date(srv.serviceDate).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {srv.vehicle?.internalCode} — {srv.vehicle?.plateNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {srv.vehicle?.vehicleType?.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {srv.odometerReading?.toLocaleString()} كم
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {srv.items?.map((it: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span className="font-semibold text-slate-800">
                                {it.lubricantProduct?.name}
                              </span>
                              <span className="text-slate-400 font-mono">
                                ({it.quantity} {it.lubricantProduct?.unitOfMeasure === 'PIECE' ? 'حبة' : 'لتر'})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {srv.nextDueOdometer?.toLocaleString()} كم
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {srv.nextDueDate ? new Date(srv.nextDueDate).toLocaleDateString('ar-SA') : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {srv.performedBy || 'ورشة الصيانة'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {formatAmount(srv.totalCost || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {/* ========================================================================= */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fleet-50 text-fleet-600 flex items-center justify-center border border-fleet-200">
                  <Droplet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingProduct ? 'تعديل صنف زيت أو فلتر' : 'إضافة صنف زيت أو فلتر جديد'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تسجيل مواصفات اللزوجة، الجودة، وفترات التغيير الكيلومترية والزمنية.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كود الصنف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={productForm.productCode}
                    onChange={(e) => setProductForm({ ...productForm, productCode: e.target.value })}
                    placeholder="مثال: OIL-15W40-ENG"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500 disabled:opacity-60"
                  />
                </div>

                {/* Product Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع المنتج / التصنيف <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={productForm.lubricantType}
                    onChange={(e) => setProductForm({ ...productForm, lubricantType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500"
                  >
                    <optgroup label="زيوت المحركات ونواقل الحركة">
                      <option value="ENGINE_OIL">زيت محرك ديزل / بنزين</option>
                      <option value="GEAR_OIL">زيت تروس ودفرنس (Gear / Differential)</option>
                      <option value="ATF">سائل ناقل حركة أوتوماتيكي ومقود (ATF)</option>
                    </optgroup>
                    <optgroup label="السوائل الهيدروليكية والتبريد">
                      <option value="HYDRAULIC">زيت هيدروليك وروافع صناعية</option>
                      <option value="COOLANT">سائل تبريد رديتر مركز</option>
                      <option value="BRAKE_FLUID">سائل فرامل وقوابض (DOT)</option>
                    </optgroup>
                    <optgroup label="الفلاتر الأصلية المعتمدة">
                      <option value="FILTER_OIL">فلتر زيت محرك</option>
                      <option value="FILTER_FUEL">فلتر وقود ديزل وفاصل مياه</option>
                      <option value="FILTER_AIR">فلتر هواء محرك</option>
                      <option value="FILTER_HYDRAULIC">خرطوشة مجفف هواء الفرامل / هيدروليك</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المنتج والمواصفة التجارية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="مثال: زيت محرك ديزل فائق التحمل 15W-40 CI-4"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Brand */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العلامة التجارية</label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    placeholder="Mobil, Shell, Mann, Total"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500"
                  />
                </div>

                {/* Viscosity Grade */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    درجة اللزوجة (Viscosity Grade)
                  </label>
                  <input
                    type="text"
                    value={productForm.viscosityGrade}
                    onChange={(e) => setProductForm({ ...productForm, viscosityGrade: e.target.value })}
                    placeholder="15W-40, 10W-40, 80W-90, ATF"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500"
                  />
                </div>

                {/* Oil Base */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الأساس التخليقي</label>
                  <select
                    value={productForm.oilBase}
                    onChange={(e) => setProductForm({ ...productForm, oilBase: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500"
                  >
                    <option value="MINERAL">معدني (Mineral Base)</option>
                    <option value="SEMI_SYNTHETIC">نصف تخليقي (Semi-Synthetic)</option>
                    <option value="SYNTHETIC">تخليقي بالكامل (Fully Synthetic)</option>
                    <option value="NA">غير منطبق (للفلاتر)</option>
                  </select>
                </div>
              </div>

              {/* Quality Specifications */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  معايير الجودة والاعتمادات الرسمية (Quality Specs & OEM Approvals)
                </label>
                <input
                  type="text"
                  value={productForm.specification}
                  onChange={(e) => setProductForm({ ...productForm, specification: e.target.value })}
                  placeholder="API CK-4/CI-4/SL | ACEA E9 | MB 228.31 | MAN M 3275 | Cummins CES 20086"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fleet-500/20 focus:border-fleet-500"
                />
              </div>

              {/* Intervals & Unit & Cost */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    فترة التغيير (كيلومتر)
                  </label>
                  <input
                    type="number"
                    value={productForm.defaultIntervalKm}
                    onChange={(e) => setProductForm({ ...productForm, defaultIntervalKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    فترة التغيير (أيام)
                  </label>
                  <input
                    type="number"
                    value={productForm.defaultIntervalDays}
                    onChange={(e) => setProductForm({ ...productForm, defaultIntervalDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الوحدة</label>
                  <select
                    value={productForm.unitOfMeasure}
                    onChange={(e) => setProductForm({ ...productForm, unitOfMeasure: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="LITER">لتر (LITER)</option>
                    <option value="PIECE">قطعة / فلتر (PIECE)</option>
                    <option value="CAN">جالون / عبوة (CAN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">السعر التقديري</label>
                  <input
                    type="number"
                    step="0.5"
                    value={productForm.approxCost}
                    onChange={(e) => setProductForm({ ...productForm, approxCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Initial Warehouse Stock */}
              {!editingProduct && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                      <span>المستودع المستلم للرصيد الأولي</span>
                    </label>
                    <select
                      value={productForm.warehouseId}
                      onChange={(e) => setProductForm({ ...productForm, warehouseId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-blue-200 bg-white"
                    >
                      {meta.warehouses && meta.warehouses.length > 0 ? (
                        meta.warehouses.map((wh: any) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.name} ({wh.code})
                          </option>
                        ))
                      ) : (
                        <option value="">المستودع الرئيسي - الرياض</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-blue-600" />
                      <span>الرصيد الافتتاحي في المخزون</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.initialStock}
                      onChange={(e) => setProductForm({ ...productForm, initialStock: Number(e.target.value) })}
                      placeholder="مثال: 200 لتر أو 30 حبة"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-blue-200 bg-white"
                    />
                    <span className="text-[10px] text-blue-700 mt-0.5 block">
                      سيتم تسجيل الصنف ورصيده فوراً في دليل قطع الغيار والمخزون
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold shadow-md shadow-fleet-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'جارٍ الحفظ...' : editingProduct ? 'تحديث الصنف' : 'إضافة الصنف الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD SPECIFICATION TO VEHICLE TYPE */}
      {/* ========================================================================= */}
      {showSpecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">إضافة مواصفة تزييت معيارية لطراز مركبة</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ربط نوع المركبة بالزيوت والفلاتر والسعات المعتمدة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSpecModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpec} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  فئة / نوع المركبة <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={specForm.vehicleTypeId}
                  onChange={(e) => setSpecForm({ ...specForm, vehicleTypeId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                >
                  <option value="">-- اختر فئة المركبة --</option>
                  {meta.vehicleTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>
                      {vt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target System & Lubricant Product */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    النظام المستهدف <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={specForm.systemName}
                    onChange={(e) => setSpecForm({ ...specForm, systemName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="ENGINE">المحرك (Engine)</option>
                    <option value="TRANSMISSION">ناقل الحركة (Transmission)</option>
                    <option value="DIFFERENTIAL">الدفرنس والمحاور (Differential)</option>
                    <option value="HYDRAULIC">الهيدروليك والروافع</option>
                    <option value="FILTERS">الفلاتر الدورية (Filters)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    صنف الزيت أو الفلتر المعتمد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={specForm.lubricantProductId}
                    onChange={(e) => {
                      const selProd = products.find((p) => p.id === e.target.value);
                      setSpecForm({
                        ...specForm,
                        lubricantProductId: e.target.value,
                        changeIntervalKm: selProd?.defaultIntervalKm || specForm.changeIntervalKm,
                        changeIntervalDays: selProd?.defaultIntervalDays || specForm.changeIntervalDays,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- اختر الصنف --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productCode} — {p.name} ({p.viscosityGrade || 'معتمد'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Required Quantity & Intervals */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    الكمية المعيارية (لتر/قطع)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={specForm.requiredQuantity}
                    onChange={(e) => setSpecForm({ ...specForm, requiredQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    فترة التغيير (كم)
                  </label>
                  <input
                    type="number"
                    required
                    value={specForm.changeIntervalKm}
                    onChange={(e) => setSpecForm({ ...specForm, changeIntervalKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    فترة التغيير (أيام)
                  </label>
                  <input
                    type="number"
                    required
                    value={specForm.changeIntervalDays}
                    onChange={(e) => setSpecForm({ ...specForm, changeIntervalDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التشغيل والورشة</label>
                <textarea
                  rows={2}
                  value={specForm.notes}
                  onChange={(e) => setSpecForm({ ...specForm, notes: e.target.value })}
                  placeholder="ملاحظات حول طريقة التعبئة، نوع الفلاتر التابعة، وفحص الرواسب..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSpecModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold shadow-md"
                >
                  {submitting ? 'جارٍ الحفظ...' : 'حفظ المواصفة المعيارية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD OIL CHANGE SERVICE */}
      {/* ========================================================================= */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تسجيل عملية تغيير زيت وفلاتر جديدة</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    توثيق تغيير الزيوت الميدانية واحتساب موعد وعداد الاستحقاق القادم تلقائياً.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المركبة المستهدفة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={serviceForm.vehicleId}
                    onChange={(e) => {
                      const v = meta.vehicles.find((x) => x.id === e.target.value);
                      setServiceForm({
                        ...serviceForm,
                        vehicleId: e.target.value,
                        odometerReading: v ? v.currentOdometer.toString() : serviceForm.odometerReading,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- اختر المركبة --</option>
                    {meta.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.internalCode} — {v.plateNumber} ({v.vehicleType?.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Odometer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    قراءة العداد الحالية (كم) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={serviceForm.odometerReading}
                    onChange={(e) => setServiceForm({ ...serviceForm, odometerReading: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التنفيذ</label>
                  <input
                    type="date"
                    required
                    value={serviceForm.serviceDate}
                    onChange={(e) => setServiceForm({ ...serviceForm, serviceDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Performed By */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القائم بالعمل / الورشة</label>
                  <input
                    type="text"
                    value={serviceForm.performedBy}
                    onChange={(e) => setServiceForm({ ...serviceForm, performedBy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Items Section: Selected Lubricants and Filters */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-fleet-600" />
                    <span>الزيوت والفلاتر المصروفة في هذه العملية</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (products.length > 0) {
                        setServiceForm({
                          ...serviceForm,
                          selectedItems: [
                            ...serviceForm.selectedItems,
                            { lubricantProductId: products[0].id, quantity: 1, unitCost: products[0].approxCost || 20 },
                          ],
                        });
                      }
                    }}
                    className="text-[11px] font-bold text-fleet-600 hover:text-fleet-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف آخر</span>
                  </button>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  {serviceForm.selectedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select
                          value={item.lubricantProductId}
                          onChange={(e) => {
                            const newItems = [...serviceForm.selectedItems];
                            const sel = products.find((p) => p.id === e.target.value);
                            newItems[idx] = {
                              ...newItems[idx],
                              lubricantProductId: e.target.value,
                              unitCost: sel?.approxCost || newItems[idx].unitCost,
                            };
                            setServiceForm({ ...serviceForm, selectedItems: newItems });
                          }}
                          className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.viscosityGrade || p.productCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...serviceForm.selectedItems];
                            newItems[idx].quantity = Number(e.target.value);
                            setServiceForm({ ...serviceForm, selectedItems: newItems });
                          }}
                          className="w-full px-2 py-1 text-xs font-mono font-bold text-center border border-slate-200 rounded-lg"
                          title="الكمية"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="0.5"
                          value={item.unitCost}
                          onChange={(e) => {
                            const newItems = [...serviceForm.selectedItems];
                            newItems[idx].unitCost = Number(e.target.value);
                            setServiceForm({ ...serviceForm, selectedItems: newItems });
                          }}
                          className="w-full px-2 py-1 text-xs font-mono text-center border border-slate-200 rounded-lg text-emerald-700"
                          title="سعر الوحدة"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newItems = serviceForm.selectedItems.filter((_, i) => i !== idx);
                          setServiceForm({ ...serviceForm, selectedItems: newItems });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Total Cost Display */}
                  <div className="flex items-center justify-between pt-2 px-1 text-xs font-bold text-slate-700">
                    <span>إجمالي تكلفة الزيوت والفلاتر:</span>
                    <span className="font-mono text-emerald-700 text-sm">
                      {formatAmount(
                        serviceForm.selectedItems.reduce(
                          (acc, it) => acc + (it.quantity || 0) * (it.unitCost || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Due Intervals */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    فترة الاستحقاق القادمة (كم)
                  </label>
                  <input
                    type="number"
                    value={serviceForm.intervalKm}
                    onChange={(e) => setServiceForm({ ...serviceForm, intervalKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    الاستحقاق القادم عند العداد:{' '}
                    <strong className="text-slate-700">
                      {(
                        (parseFloat(serviceForm.odometerReading) || 0) +
                        (serviceForm.intervalKm || 10000)
                      ).toLocaleString()}{' '}
                      كم
                    </strong>
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    فترة الاستحقاق القادمة (أيام)
                  </label>
                  <input
                    type="number"
                    value={serviceForm.intervalDays}
                    onChange={(e) => setServiceForm({ ...serviceForm, intervalDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    يتم احتساب التاريخ القادم بناءً عليها
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الفحص والتشغيل</label>
                <textarea
                  rows={2}
                  value={serviceForm.notes}
                  onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                  placeholder="ملاحظات حول حالة الزيت القديم ولونه، وفحص تسريبات الصرة والفلتر..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {submitting ? 'جارٍ التسجيل...' : 'تسجيل وحساب الاستحقاق القادم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
