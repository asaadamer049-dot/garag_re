'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  X,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Edit,
  ExternalLink,
  Check,
  Layers,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  totalAmount: number;
  status: string;
  orderDate: string;
}

interface SupplierInvoice {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  purchaseOrderId?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  createdAt: string;
  supplier?: {
    id: string;
    name: string;
    supplierCode: string;
    phone?: string | null;
  };
  purchaseOrder?: {
    id: string;
    poNumber: string;
    status: string;
    totalAmount: number;
  } | null;
}

interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  taxNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  isActive: boolean;
  createdAt: string;
  invoices: SupplierInvoice[];
  purchaseOrders: PurchaseOrderSummary[];
}

interface PurchaseOrderOption {
  id: string;
  poNumber: string;
  totalAmount: number;
  status: string;
  supplierId: string;
  supplier?: {
    name: string;
  };
}

export default function SuppliersClientView() {
  const { formatAmount } = useCurrency();

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'INVOICES' | 'PAYABLES'>('DIRECTORY');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalInvoices: 0,
    unpaidInvoicesCount: 0,
    totalInvoicesAmount: 0,
    totalPaidAmount: 0,
    totalOutstanding: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<string>('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<SupplierInvoice | null>(null);
  const [paymentInputAmount, setPaymentInputAmount] = useState<number>(0);

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    supplierCode: '',
    taxNumber: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: 'آجل 30 يوم',
  });

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    purchaseOrderId: '',
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    paidAmount: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all suppliers and invoices data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/procurement/suppliers');
      const json = await res.json();
      if (json.success && json.data) {
        setSuppliers(json.data.suppliers || []);
        setInvoices(json.data.invoices || []);
        setPurchaseOrders(json.data.purchaseOrders || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.taxNumber && s.taxNumber.includes(searchTerm));
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.isActive) ||
        (statusFilter === 'INACTIVE' && !s.isActive);
      return matchSearch && matchStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.purchaseOrder?.poNumber && inv.purchaseOrder.poNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Handle Open Create / Edit Supplier
  const handleOpenSupplierModal = (sup?: Supplier) => {
    if (sup) {
      setEditingSupplier(sup);
      setSupplierForm({
        name: sup.name,
        supplierCode: sup.supplierCode,
        taxNumber: sup.taxNumber || '',
        phone: sup.phone || '',
        email: sup.email || '',
        address: sup.address || '',
        paymentTerms: sup.paymentTerms || 'آجل 30 يوم',
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({
        name: '',
        supplierCode: '',
        taxNumber: '',
        phone: '',
        email: '',
        address: '',
        paymentTerms: 'آجل 30 يوم',
      });
    }
    setShowSupplierModal(true);
  };

  // Submit Supplier Create / Update
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      setErrorMessage('اسم المورد حقل إلزامي');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const action = editingSupplier ? 'update_supplier' : 'create_supplier';
      const body = editingSupplier
        ? { action, id: editingSupplier.id, ...supplierForm }
        : { action, ...supplierForm };

      const res = await fetch('/api/procurement/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في حفظ بيانات المورد');
      }

      setSuccessMessage(data.message || 'تم حفظ بيانات المورد بنجاح');
      setShowSupplierModal(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ المورد');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Invoice Modal
  const handleOpenInvoiceModal = (supplierId?: string) => {
    const sId = supplierId || (suppliers.length > 0 ? suppliers[0].id : '');
    setPreselectedSupplierId(sId);
    setInvoiceForm({
      supplierId: sId,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      purchaseOrderId: '',
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      paidAmount: 0,
    });
    setShowInvoiceModal(true);
  };

  // When PO is selected in Invoice Form, autofill financial values
  const handleSelectPoForInvoice = (poId: string) => {
    const selectedPO = purchaseOrders.find((po) => po.id === poId);
    if (selectedPO) {
      const sub = selectedPO.totalAmount / 1.15;
      const tax = selectedPO.totalAmount - sub;
      setInvoiceForm((prev) => ({
        ...prev,
        purchaseOrderId: poId,
        supplierId: selectedPO.supplierId || prev.supplierId,
        subtotal: parseFloat(sub.toFixed(2)),
        taxAmount: parseFloat(tax.toFixed(2)),
        totalAmount: selectedPO.totalAmount,
      }));
    } else {
      setInvoiceForm((prev) => ({
        ...prev,
        purchaseOrderId: '',
      }));
    }
  };

  // Submit Invoice Create
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.supplierId || !invoiceForm.invoiceNumber) {
      setErrorMessage('المورد ورقم الفاتورة حقول إلزامية');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const res = await fetch('/api/procurement/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_invoice',
          ...invoiceForm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في تسجيل فاتورة الشراء');
      }

      setSuccessMessage(data.message || 'تم تسجيل فاتورة الشراء بنجاح');
      setShowInvoiceModal(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل فاتورة الشراء');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (inv: SupplierInvoice) => {
    setSelectedInvoiceForPayment(inv);
    const remaining = inv.totalAmount - inv.paidAmount;
    setPaymentInputAmount(remaining > 0 ? remaining : 0);
    setShowPaymentModal(true);
  };

  // Submit Payment
  const handleConfirmPayment = async () => {
    if (!selectedInvoiceForPayment || paymentInputAmount <= 0) {
      setErrorMessage('يرجى تحديد مبلغ سداد صحيح أكبر من الصفر');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const res = await fetch('/api/procurement/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          invoiceId: selectedInvoiceForPayment.id,
          paymentAmount: paymentInputAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في تسجيل دفعة السداد');
      }

      setSuccessMessage(data.message || 'تم تسجيل دفعة السداد بنجاح');
      setShowPaymentModal(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل السداد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Alert Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-fleet-50 border border-fleet-100 flex items-center justify-center text-fleet-600">
              <Building2 className="w-5 h-5" />
            </div>
            <span>دليل الموردين وفواتير الشراء</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            إدارة الموردين المعتمدين، السجلات الضريبية، شروط السداد، وتسجيل فواتير الشراء ومطابقتها مع أوامر التوريد ومتابعة الذمم الدائنة
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenSupplierModal()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow"
          >
            <Building2 className="w-4 h-4 text-fleet-600" />
            <span>+ مورد معتمد جديد</span>
          </button>

          <button
            onClick={() => handleOpenInvoiceModal()}
            className="px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-fleet-200 shadow-fleet-100"
          >
            <Receipt className="w-4 h-4" />
            <span>+ تسجيل فاتورة شراء جديدة</span>
          </button>

          <button
            onClick={fetchData}
            title="تحديث البيانات"
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-fleet-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>الموردين المعتمدين</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{stats.totalSuppliers}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">مورد مسجل بالنظام</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-medium mb-1">
            <span>فواتير المشتريات</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-600">{stats.totalInvoices}</div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">فاتورة مورد مسجلة</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium mb-1">
            <span>فواتير مستحقة</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600">{stats.unpaidInvoicesCount}</div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">بانتظار السداد</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>إجمالي الفواتير</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 truncate">
            {formatAmount(stats.totalInvoicesAmount)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">شاملة الضريبة 15%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium mb-1">
            <span>المسدد للموردين</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-bold font-mono text-emerald-600 truncate">
            {formatAmount(stats.totalPaidAmount)}
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">مدفوعات مؤكدة</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium mb-1">
            <span>الذمم الدائنة المتبقية</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-sm font-bold font-mono text-rose-600 truncate">
            {formatAmount(stats.totalOutstanding)}
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">متبقي واجب سداده</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('DIRECTORY')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'DIRECTORY'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>دليل الموردين المعتمدين (Suppliers)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
            {suppliers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'INVOICES'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>فواتير الشراء ومطابقة التوريد (Invoices)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PAYABLES')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'PAYABLES'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>كشف حساب ومستحقات الموردين (Accounts Payable)</span>
        </button>
      </div>

      {/* TAB 1: SUPPLIERS DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث باسم المورد، الكود، أو الرقم الضريبي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fleet-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>الحالة:</span>
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fleet-500"
              >
                <option value="ALL">جميع الموردين</option>
                <option value="ACTIVE">موردين نشطين فقط</option>
                <option value="INACTIVE">غير نشطين</option>
              </select>
            </div>
          </div>

          {/* Suppliers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fleet-600" />
                <span>جاري تحميل دليل الموردين...</span>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                لا يوجد موردين مطابقين لبحثك. اضغط على "+ مورد معتمد جديد" لإضافة مورد.
              </div>
            ) : (
              filteredSuppliers.map((sup) => {
                const totalInvoiced = sup.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
                const totalPaid = sup.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
                const outstanding = totalInvoiced - totalPaid;

                return (
                  <div
                    key={sup.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                            {sup.supplierCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>مورد معتمد</span>
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenSupplierModal(sup)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-fleet-600 hover:bg-slate-50 transition-colors"
                          title="تعديل بيانات المورد"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Supplier Name */}
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{sup.name}</h3>

                      {/* Details list */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">الرقم الضريبي:</span>
                          <span className="font-mono font-semibold text-slate-800">{sup.taxNumber || 'غير مسجل'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">شروط السداد:</span>
                          <span className="font-semibold text-slate-800">{sup.paymentTerms || 'آجل'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-mono">{sup.phone || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{sup.email || '-'}</span>
                        </div>
                      </div>

                      {sup.address && (
                        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{sup.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Financial Summary & Actions */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">أوامر الشراء</span>
                          <span className="font-mono font-bold text-slate-800">{sup.purchaseOrders.length}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الفواتير</span>
                          <span className="font-mono font-bold text-slate-800">{sup.invoices.length}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الرصيد المستحق</span>
                          <span className={`font-mono font-bold ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatAmount(outstanding)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenInvoiceModal(sup.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-fleet-50 hover:bg-fleet-100 text-fleet-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-fleet-200 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>+ تسجيل فاتورة للمورد</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم الفاتورة، المورد، أو رقم أمر الشراء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fleet-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>حالة السداد:</span>
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fleet-500"
              >
                <option value="ALL">جميع الفواتير</option>
                <option value="POSTED">مستحقة السداد (غير مدفوعة)</option>
                <option value="PARTIALLY_PAID">مدفوعة جزئياً</option>
                <option value="PAID">مسددة بالكامل</option>
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">رقم الفاتورة</th>
                    <th className="py-3.5 px-4">المورد المعتمد</th>
                    <th className="py-3.5 px-4">أمر الشراء المرتبط</th>
                    <th className="py-3.5 px-4">تاريخ الفاتورة</th>
                    <th className="py-3.5 px-4">تاريخ الاستحقاق</th>
                    <th className="py-3.5 px-4">المبلغ قبل الضريبة</th>
                    <th className="py-3.5 px-4">ضريبة 15%</th>
                    <th className="py-3.5 px-4">الإجمالي الكلي</th>
                    <th className="py-3.5 px-4">المسدد</th>
                    <th className="py-3.5 px-4">المتبقي</th>
                    <th className="py-3.5 px-4 text-center">الحالة</th>
                    <th className="py-3.5 px-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fleet-600" />
                        <span>جاري تحميل فواتير الشراء...</span>
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        لا توجد فواتير مطابقة لبحثك. اضغط على "+ تسجيل فاتورة شراء جديدة" لإضافة فاتورة.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const remaining = inv.totalAmount - inv.paidAmount;
                      const isFullyPaid = inv.status === 'PAID' || remaining <= 0;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{inv.supplier?.name}</td>
                          <td className="py-3.5 px-4">
                            {inv.purchaseOrder ? (
                              <span className="font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {inv.purchaseOrder.poNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">مشتريات مباشرة</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {new Date(inv.invoiceDate).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {inv.dueDate ? (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {new Date(inv.dueDate).toLocaleDateString('ar-SA')}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{formatAmount(inv.subtotal)}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{formatAmount(inv.taxAmount)}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{formatAmount(inv.totalAmount)}</td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700">{formatAmount(inv.paidAmount)}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                            {formatAmount(remaining > 0 ? remaining : 0)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isFullyPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" />
                                <span>مسددة بالكامل</span>
                              </span>
                            ) : inv.status === 'PARTIALLY_PAID' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3" />
                                <span>سداد جزئي</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertCircle className="w-3 h-3" />
                                <span>مستحقة السداد</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {!isFullyPaid && (
                              <button
                                onClick={() => handleOpenPaymentModal(inv)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 mx-auto transition-colors"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>سداد دفعة</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNTS PAYABLE SUMMARY */}
      {activeTab === 'PAYABLES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-fleet-600" />
                <span>كشف حساب الذمم الدائنة ومستحقات الموردين</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                متابعة أرصدة كل مورد، إجمالي الفواتير، المبالغ المسددة، والنسبة المئوية للإيفاء بالالتزامات
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">كود المورد</th>
                    <th className="py-3 px-4">اسم المورد التجاري</th>
                    <th className="py-3 px-4">شروط السداد</th>
                    <th className="py-3 px-4">عدد الفواتير</th>
                    <th className="py-3 px-4">إجمالي المطالبات</th>
                    <th className="py-3 px-4">إجمالي المسدد</th>
                    <th className="py-3 px-4">الرصيد المستحق (الذمة)</th>
                    <th className="py-3 px-4">نسبة السداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => {
                    const totalInv = s.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
                    const totalPaid = s.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
                    const balance = totalInv - totalPaid;
                    const percentPaid = totalInv > 0 ? Math.round((totalPaid / totalInv) * 100) : 100;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.supplierCode}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{s.name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{s.paymentTerms || 'آجل'}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">{s.invoices.length} فواتير</td>
                        <td className="py-3.5 px-4 font-mono text-slate-800">{formatAmount(totalInv)}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700">{formatAmount(totalPaid)}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                          {formatAmount(balance > 0 ? balance : 0)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-fleet-600 h-full rounded-full transition-all"
                                style={{ width: `${percentPaid}%` }}
                              ></div>
                            </div>
                            <span className="font-mono font-bold text-[11px] text-slate-700">{percentPaid}%</span>
                          </div>
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

      {/* MODAL 1: ADD / EDIT SUPPLIER */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-fleet-100 text-fleet-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingSupplier ? 'تعديل بيانات المورد المعتمد' : 'إضافة مورد معتمد جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-500">تسجيل بيانات المنشأة، الرقم الضريبي، وشروط الائتمان والسداد</p>
                </div>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المورد / الشركة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="مثال: شركة الزيوت والتشحيم الوطنية المعتمدة"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كود المورد (اختياري)</label>
                  <input
                    type="text"
                    disabled={!!editingSupplier}
                    value={supplierForm.supplierCode}
                    onChange={(e) => setSupplierForm({ ...supplierForm, supplierCode: e.target.value })}
                    placeholder="مثال: SUP-LUB-01"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-fleet-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي (VAT Number)</label>
                  <input
                    type="text"
                    value={supplierForm.taxNumber}
                    onChange={(e) => setSupplierForm({ ...supplierForm, taxNumber: e.target.value })}
                    placeholder="310XXXXXXXX0003"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="011XXXXXXX"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="orders@supplier.com"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شروط السداد المعتمدة</label>
                  <select
                    value={supplierForm.paymentTerms}
                    onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  >
                    <option value="نقدي فوري">نقدي فوري</option>
                    <option value="آجل 15 يوم">آجل 15 يوم</option>
                    <option value="آجل 30 يوم">آجل 30 يوم</option>
                    <option value="آجل 45 يوم">آجل 45 يوم</option>
                    <option value="آجل 60 يوم">آجل 60 يوم</option>
                    <option value="آجل 90 يوم">آجل 90 يوم</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والمدينة</label>
                  <input
                    type="text"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    placeholder="مثال: الرياض - المنطقة الصناعية الثانية"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingSupplier ? 'حفظ التعديلات' : 'تسجيل المورد'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER PURCHASE INVOICE */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تسجيل فاتورة شراء ومطابقة التوريد</h3>
                  <p className="text-[11px] text-slate-500">توثيق الفاتورة الرسمية الصادرة من المورد وربطها بأمر الشراء</p>
                </div>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المورد المعتمد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={invoiceForm.supplierId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">أمر الشراء المرتبط (اختياري)</label>
                  <select
                    value={invoiceForm.purchaseOrderId}
                    onChange={(e) => handleSelectPoForInvoice(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  >
                    <option value="">-- بدون ربط بأمر شراء (مشتريات مباشرة) --</option>
                    {purchaseOrders
                      .filter((po) => !invoiceForm.supplierId || po.supplierId === invoiceForm.supplierId)
                      .map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.poNumber} ({formatAmount(po.totalAmount)}) - {po.status}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم فاتورة المورد <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    placeholder="INV-XXXX"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>
              </div>

              {/* Financial values */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">المبالغ وضريبة القيمة المضافة:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">المبلغ قبل الضريبة</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={invoiceForm.subtotal}
                      onChange={(e) => {
                        const sub = parseFloat(e.target.value) || 0;
                        const tax = sub * 0.15;
                        setInvoiceForm({
                          ...invoiceForm,
                          subtotal: sub,
                          taxAmount: parseFloat(tax.toFixed(2)),
                          totalAmount: parseFloat((sub + tax).toFixed(2)),
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-fleet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">ضريبة 15%</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={invoiceForm.taxAmount}
                      onChange={(e) => {
                        const tax = parseFloat(e.target.value) || 0;
                        setInvoiceForm({
                          ...invoiceForm,
                          taxAmount: tax,
                          totalAmount: parseFloat((invoiceForm.subtotal + tax).toFixed(2)),
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-fleet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">الإجمالي الكلي</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={invoiceForm.totalAmount}
                      onChange={(e) => {
                        const tot = parseFloat(e.target.value) || 0;
                        setInvoiceForm({ ...invoiceForm, totalAmount: tot });
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-fleet-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] text-slate-600 mb-1">المبلغ المسدد مقدماً (إن وجد)</label>
                  <input
                    type="number"
                    min="0"
                    max={invoiceForm.totalAmount}
                    step="any"
                    value={invoiceForm.paidAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full sm:w-1/2 p-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-fleet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>تسجيل الفاتورة واعتمادها</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تسجيل سداد دفعة للمورد</h3>
                  <p className="text-[11px] text-emerald-800">
                    فاتورة رقم: <span className="font-mono font-bold">{selectedInvoiceForPayment.invoiceNumber}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">المورد:</span>
                  <span className="font-bold text-slate-800">{selectedInvoiceForPayment.supplier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">إجمالي قيمة الفاتورة:</span>
                  <span className="font-mono font-bold text-slate-900">{formatAmount(selectedInvoiceForPayment.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المسدد سابقاً:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatAmount(selectedInvoiceForPayment.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-rose-600 font-bold">المتبقي الواجب سداده:</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {formatAmount(selectedInvoiceForPayment.totalAmount - selectedInvoiceForPayment.paidAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مبلغ الدفعة الحالية المراد سدادها <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoiceForPayment.totalAmount - selectedInvoiceForPayment.paidAmount}
                  step="any"
                  value={paymentInputAmount}
                  onChange={(e) => setPaymentInputAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={submitting || paymentInputAmount <= 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>تأكيد تسجيل السداد</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

