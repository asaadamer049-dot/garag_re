'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Warehouse,
  FileText,
  X,
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle,
  Truck,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  Receipt,
  Boxes,
  Trash2,
  Layers,
  FileCheck2,
  Check,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

interface Part {
  id: string;
  name: string;
  partNumber: string;
  unitOfMeasure?: string;
  costPrice?: number;
}

interface Supplier {
  id: string;
  name: string;
  supplierCode: string;
  phone?: string;
}

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
}

interface PurchaseOrderItem {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxAmount?: number;
  lineTotal: number;
  part: Part;
}

interface GoodsReceiptItem {
  id: string;
  partId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  part: Part;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  warehouseId: string;
  receiptDate: string;
  status: string;
  receivedBy?: string;
  warehouse?: WarehouseItem;
  purchaseOrder?: {
    poNumber: string;
    supplier?: Supplier;
  };
  items: GoodsReceiptItem[];
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  createdBy?: string;
  notes?: string;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
  goodsReceipts?: GoodsReceipt[];
}

interface PurchaseRequestItem {
  id: string;
  partId: string;
  quantity: number;
  estimatedUnitPrice: number;
  part: Part;
}

interface PurchaseRequest {
  id: string;
  requestNumber: string;
  requestedBy: string;
  requestDate: string;
  justification?: string;
  status: string;
  items: PurchaseRequestItem[];
}

export default function ProcurementOrdersClientView() {
  const { formatAmount } = useCurrency();

  const [activeTab, setActiveTab] = useState<'POS' | 'PRS' | 'RECEIPTS'>('POS');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [stats, setStats] = useState({
    totalPOs: 0,
    pendingDelivery: 0,
    completedPOs: 0,
    totalSpend: 0,
    totalRequests: 0,
    totalReceipts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  // Modals state
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showNewPrModal, setShowNewPrModal] = useState(false);
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<PurchaseOrder | null>(null);

  // New PO form state
  const [newPoSupplierId, setNewPoSupplierId] = useState('');
  const [newPoDeliveryDate, setNewPoDeliveryDate] = useState('');
  const [newPoNotes, setNewPoNotes] = useState('');
  const [newPoItems, setNewPoItems] = useState<Array<{ partId: string; quantity: number; unitPrice: number }>>([
    { partId: '', quantity: 1, unitPrice: 0 },
  ]);

  // Receive goods form state
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('');
  const [receivedByName, setReceivedByName] = useState('أمين المستودع الرئيسي');
  const [receiveItemsData, setReceiveItemsData] = useState<Array<{ partId: string; partName: string; orderedQty: number; receivedQty: number; unitCost: number }>>([]);

  // New PR form state
  const [newPrRequestedBy, setNewPrRequestedBy] = useState('مشرف الصيانة الدورية');
  const [newPrJustification, setNewPrJustification] = useState('');
  const [newPrItems, setNewPrItems] = useState<Array<{ partId: string; quantity: number; estimatedPrice: number }>>([
    { partId: '', quantity: 1, estimatedPrice: 0 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Fetch all procurement data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/procurement/orders');
      const json = await res.json();
      if (json.success && json.data) {
        setPurchaseOrders(json.data.purchaseOrders || []);
        setPurchaseRequests(json.data.purchaseRequests || []);
        setGoodsReceipts(json.data.goodsReceipts || []);
        setSuppliers(json.data.suppliers || []);
        setParts(json.data.parts || []);
        setWarehouses(json.data.warehouses || []);
        if (json.data.warehouses?.length > 0 && !receiveWarehouseId) {
          setReceiveWarehouseId(json.data.warehouses[0].id);
        }
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Error fetching procurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchSearch =
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.items.some((it) => it.part?.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || po.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, searchTerm, statusFilter]);

  // Open Receive Modal
  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPoForReceive(po);
    const initialItems = po.items.map((it) => ({
      partId: it.partId,
      partName: it.part?.name || 'صنف غير محدد',
      orderedQty: it.quantity,
      receivedQty: it.quantity, // Default to full delivery
      unitCost: it.unitPrice,
    }));
    setReceiveItemsData(initialItems);
    if (warehouses.length > 0) {
      setReceiveWarehouseId(warehouses[0].id);
    }
    setShowReceiveModal(true);
  };

  // Submit Receive Goods (Goods Receipt -> Stock Update)
  const handleConfirmReceipt = async () => {
    if (!selectedPoForReceive || !receiveWarehouseId) {
      setActionErrorMessage('يرجى اختيار المستودع المستلم');
      return;
    }

    try {
      setSubmitting(true);
      setActionErrorMessage(null);
      const res = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive_goods',
          purchaseOrderId: selectedPoForReceive.id,
          warehouseId: receiveWarehouseId,
          receivedBy: receivedByName,
          items: receiveItemsData.map((it) => ({
            partId: it.partId,
            orderedQuantity: it.orderedQty,
            receivedQuantity: it.receivedQty,
            unitCost: it.unitCost,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في استلام وتوريد البضاعة');
      }

      setActionSuccessMessage(data.message || 'تم توريد البضاعة وإضافة الكميات للمخزون بنجاح!');
      setShowReceiveModal(false);
      fetchData();
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'حدث خطأ أثناء توريد الأصناف');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit New Purchase Order
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoSupplierId) {
      setActionErrorMessage('يرجى اختيار المورد المعتمد');
      return;
    }
    const validItems = newPoItems.filter((it) => it.partId && it.quantity > 0);
    if (validItems.length === 0) {
      setActionErrorMessage('يرجى اختيار صنف واحد على الأقل وتحديد الكمية');
      return;
    }

    try {
      setSubmitting(true);
      setActionErrorMessage(null);
      const res = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_po',
          supplierId: newPoSupplierId,
          expectedDeliveryDate: newPoDeliveryDate || null,
          notes: newPoNotes,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في إصدار أمر الشراء');
      }

      setActionSuccessMessage(data.message || 'تم إصدار أمر الشراء بنجاح');
      setShowNewPoModal(false);
      setNewPoItems([{ partId: '', quantity: 1, unitPrice: 0 }]);
      setNewPoSupplierId('');
      setNewPoDeliveryDate('');
      setNewPoNotes('');
      fetchData();
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'حدث خطأ أثناء إصدار أمر الشراء');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit New Purchase Request (PR)
  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = newPrItems.filter((it) => it.partId && it.quantity > 0);
    if (validItems.length === 0) {
      setActionErrorMessage('يرجى إضافة صنف واحد على الأقل لطلب الشراء');
      return;
    }

    try {
      setSubmitting(true);
      setActionErrorMessage(null);
      const res = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_pr',
          requestedBy: newPrRequestedBy,
          justification: newPrJustification,
          items: validItems.map((it) => ({
            partId: it.partId,
            quantity: it.quantity,
            estimatedUnitPrice: it.estimatedPrice,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في حفظ طلب الشراء');
      }

      setActionSuccessMessage(data.message || 'تم تسجيل طلب الشراء بنجاح');
      setShowNewPrModal(false);
      setNewPrItems([{ partId: '', quantity: 1, estimatedPrice: 0 }]);
      setNewPrJustification('');
      fetchData();
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'حدث خطأ أثناء حفظ طلب الشراء');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate Subtotal for new PO modal
  const poModalCalculations = useMemo(() => {
    const subtotal = newPoItems.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [newPoItems]);

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Notifications */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{actionErrorMessage}</span>
          </div>
          <button onClick={() => setActionErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-fleet-50 border border-fleet-100 flex items-center justify-center text-fleet-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span>طلبات وأوامر الشراء والتوريد</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            الدورة الشاملة للمشتريات: طلبات الشراء الداخلية ⬅️ أوامر الشراء المعتمدة ⬅️ أذون الفحص والاستلام المخزني والتوريد الفوري للأرصدة
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowNewPrModal(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow"
          >
            <FileText className="w-4 h-4 text-fleet-600" />
            <span>+ طلب شراء داخلي (PR)</span>
          </button>

          <button
            onClick={() => setShowNewPoModal(true)}
            className="px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-fleet-200 shadow-fleet-100"
          >
            <Plus className="w-4 h-4" />
            <span>+ أمر شراء رسمي جديد (PO)</span>
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
            <span>إجمالي الأوامر</span>
            <ShoppingCart className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{stats.totalPOs}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">أمر شراء مسجل</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium mb-1">
            <span>بانتظار التوريد</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600">{stats.pendingDelivery}</div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">جاهزة للاستلام المخزني</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium mb-1">
            <span>مكتملة وموردة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600">{stats.completedPOs}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">تم استلامها بالمستودع</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-medium mb-1">
            <span>طلبات الشراء</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-600">{stats.totalRequests}</div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">طلب داخلي من الورش</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/20 shadow-sm">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-medium mb-1">
            <span>أذون الاستلام (GR)</span>
            <Boxes className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-600">{stats.totalReceipts}</div>
          <div className="text-[10px] text-indigo-600/80 mt-0.5">إذن توريد للمستودع</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>إجمالي المشتريات</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 truncate">
            {formatAmount(stats.totalSpend)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">شاملة ضريبة 15%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('POS')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'POS'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>أوامر الشراء الرسمية (Purchase Orders)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
            {purchaseOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PRS')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'PRS'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>طلبات الشراء الداخلية (Purchase Requests)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
            {purchaseRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('RECEIPTS')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'RECEIPTS'
              ? 'border-fleet-600 text-fleet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>أذون الاستلام والتوريد المخزني (Goods Receipts)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
            {goodsReceipts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'POS' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم الأمر، المورد، أو اسم الصنف..."
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
                <option value="ALL">جميع الحالات</option>
                <option value="ISSUED">صادر للمورد (بانتظار التوريد)</option>
                <option value="PARTIALLY_RECEIVED">مستلم جزئياً</option>
                <option value="COMPLETED">مكتمل ومورد للمخزون</option>
                <option value="DRAFT">مسودة</option>
              </select>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">رقم أمر الشراء</th>
                    <th className="py-3.5 px-4">المورد المعتمد</th>
                    <th className="py-3.5 px-4">تاريخ الأمر</th>
                    <th className="py-3.5 px-4">التسليم المتوقع</th>
                    <th className="py-3.5 px-4">عدد الأصناف</th>
                    <th className="py-3.5 px-4">المجموع قبل الضريبة</th>
                    <th className="py-3.5 px-4">الإجمالي شامل الضريبة</th>
                    <th className="py-3.5 px-4 text-center">الحالة</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fleet-600" />
                        <span>جاري تحميل أوامر الشراء...</span>
                      </td>
                    </tr>
                  ) : filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        لا توجد أوامر شراء مطابقة لمعايير البحث. اضغط على "+ أمر شراء رسمي جديد" لإصدار أول أمر.
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po) => {
                      const isExpanded = expandedPoId === po.id;
                      const isReadyForReceive = po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED';

                      return (
                        <React.Fragment key={po.id}>
                          <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-slate-50/40' : ''}`}>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                <span>{po.poNumber}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800">{po.supplier?.name || '-'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{po.supplier?.supplierCode}</div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600">
                              {new Date(po.orderDate).toLocaleDateString('ar-SA')}
                            </td>

                            <td className="py-3.5 px-4 text-slate-500">
                              {po.expectedDeliveryDate ? (
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {new Date(po.expectedDeliveryDate).toLocaleDateString('ar-SA')}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {po.items.length} أصناف
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-600">
                              {formatAmount(po.subtotal)}
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                              {formatAmount(po.totalAmount)}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {po.status === 'COMPLETED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  <span>مكتمل ومورد</span>
                                </span>
                              ) : po.status === 'ISSUED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  <span>بانتظار التوريد</span>
                                </span>
                              ) : po.status === 'PARTIALLY_RECEIVED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Truck className="w-3 h-3" />
                                  <span>استلام جزئي</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                  {po.status}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {isReadyForReceive && (
                                  <button
                                    onClick={() => openReceiveModal(po)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                  >
                                    <ArrowDownLeft className="w-3.5 h-3.5" />
                                    <span>استلام وتوريد للمستودع</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-medium transition-colors"
                                >
                                  {isExpanded ? 'إخفاء الأصناف' : 'عرض الأصناف'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Items Breakdown */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={9} className="p-4">
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner space-y-3">
                                  <div className="flex items-center justify-between text-xs">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <Boxes className="w-4 h-4 text-fleet-600" />
                                      <span>بنود أمر الشراء ({po.poNumber})</span>
                                    </h4>
                                    <span className="text-[11px] text-slate-500">
                                      مسؤول الإصدار: <span className="font-semibold text-slate-700">{po.createdBy || 'إدارة المشتريات'}</span>
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-right text-xs">
                                      <thead className="bg-slate-100/70 border-y border-slate-200 text-slate-600">
                                        <tr>
                                          <th className="py-2 px-3">#</th>
                                          <th className="py-2 px-3">رقم الصنف (SKU)</th>
                                          <th className="py-2 px-3">اسم الصنف والمواصفات</th>
                                          <th className="py-2 px-3">الوحدة</th>
                                          <th className="py-2 px-3">الكمية المطلوبة</th>
                                          <th className="py-2 px-3">سعر الوحدة</th>
                                          <th className="py-2 px-3">الضريبة 15%</th>
                                          <th className="py-2 px-3">الإجمالي</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {po.items.map((item, idx) => (
                                          <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.part?.partNumber}</td>
                                            <td className="py-2.5 px-3 font-semibold text-slate-900">{item.part?.name}</td>
                                            <td className="py-2.5 px-3 text-slate-600">{item.part?.unitOfMeasure || 'وحدة'}</td>
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.quantity}</td>
                                            <td className="py-2.5 px-3 font-mono">{formatAmount(item.unitPrice)}</td>
                                            <td className="py-2.5 px-3 font-mono text-slate-500">{formatAmount(item.taxAmount || item.lineTotal * 0.15)}</td>
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatAmount(item.lineTotal + (item.taxAmount || item.lineTotal * 0.15))}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Goods Receipts history if any */}
                                  {po.goodsReceipts && po.goodsReceipts.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>أذون الاستلام المخزني المرتبطة بهذا الأمر:</span>
                                      </span>
                                      <div className="flex flex-wrap gap-2">
                                        {po.goodsReceipts.map((gr) => (
                                          <div key={gr.id} className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-3">
                                            <span className="font-mono font-bold">{gr.receiptNumber}</span>
                                            <span>المستودع: {gr.warehouse?.name}</span>
                                            <span>تاريخ الاستلام: {new Date(gr.receiptDate).toLocaleDateString('ar-SA')}</span>
                                            <span className="font-semibold text-slate-700">المستلم: {gr.receivedBy}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE REQUESTS (PRs) */}
      {activeTab === 'PRS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-fleet-600" />
                  <span>طلبات الشراء الداخلية المرفوعة من الورش والمستودعات</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  تتيح للمشرفين طلب الأصناف قبل إصدار أمر الشراء الرسمي للموردين
                </p>
              </div>
              <button
                onClick={() => setShowNewPrModal(true)}
                className="px-3.5 py-2 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ طلب شراء جديد</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">رقم الطلب</th>
                    <th className="py-3 px-4">مقدم الطلب</th>
                    <th className="py-3 px-4">تاريخ الطلب</th>
                    <th className="py-3 px-4">مبرر الشراء</th>
                    <th className="py-3 px-4">عدد الأصناف</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا توجد طلبات شراء داخلية حالياً. اضغط على "+ طلب شراء جديد" لإضافة طلب.
                      </td>
                    </tr>
                  ) : (
                    purchaseRequests.map((pr) => (
                      <tr key={pr.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{pr.requestNumber}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{pr.requestedBy}</td>
                        <td className="py-3.5 px-4 text-slate-500">{new Date(pr.requestDate).toLocaleDateString('ar-SA')}</td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{pr.justification || '-'}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">{pr.items.length} أصناف</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {pr.status === 'PENDING' ? 'قيد المراجعة والاعتماد' : pr.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              // Pre-populate new PO from this PR
                              setNewPoItems(pr.items.map(it => ({ partId: it.partId, quantity: it.quantity, unitPrice: it.estimatedUnitPrice })));
                              setShowNewPoModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-fleet-200 bg-fleet-50 hover:bg-fleet-100 text-fleet-700 font-bold text-[11px] transition-colors"
                          >
                            تحويل إلى أمر شراء رسمي (PO)
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GOODS RECEIPTS (GRs) */}
      {activeTab === 'RECEIPTS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>سجل أذون الاستلام والتوريد المخزني الفعلي (Goods Receipts)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                كل إذن استلام معتمد ينعكس تلقائياً كزيادة في رصيد المستودع وحركة استلام بضاعة (RECEIPT) رسمية
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">رقم إذن الاستلام</th>
                    <th className="py-3 px-4">رقم أمر الشراء المرتبط</th>
                    <th className="py-3 px-4">المستودع المستلم</th>
                    <th className="py-3 px-4">تاريخ الاستلام</th>
                    <th className="py-3 px-4">أمين المستودع</th>
                    <th className="py-3 px-4">عدد الأصناف المستلمة</th>
                    <th className="py-3 px-4">حالة الإذن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {goodsReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا توجد أذون استلام مسجلة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    goodsReceipts.map((gr) => (
                      <tr key={gr.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{gr.receiptNumber}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{gr.purchaseOrder?.poNumber || '-'}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center gap-1.5 mt-3.5">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          <span>{gr.warehouse?.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{new Date(gr.receiptDate).toLocaleDateString('ar-SA')}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{gr.receivedBy || '-'}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{gr.items.length} أصناف</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>مورد ومعتمد بالمخزون</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE PURCHASE ORDER */}
      {showNewPoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-fleet-100 text-fleet-700 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">إصدار أمر شراء رسمي جديد (Purchase Order)</h3>
                  <p className="text-[11px] text-slate-500">إرسال تعميد شراء رسمي للمورد المعتمد بأسعار وكميات محددة</p>
                </div>
              </div>
              <button onClick={() => setShowNewPoModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المورد المعتمد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newPoSupplierId}
                    onChange={(e) => setNewPoSupplierId(e.target.value)}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ التسليم المتوقع</label>
                  <input
                    type="date"
                    value={newPoDeliveryDate}
                    onChange={(e) => setNewPoDeliveryDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>
              </div>

              {/* Items Line Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-fleet-600" />
                    <span>بنود الأصناف المطلوبة</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPoItems([...newPoItems, { partId: '', quantity: 1, unitPrice: 0 }])}
                    className="text-xs text-fleet-600 hover:text-fleet-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند آخر</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">الصنف من الدليل</th>
                        <th className="py-2.5 px-3 w-28">الكمية</th>
                        <th className="py-2.5 px-3 w-32">سعر الوحدة</th>
                        <th className="py-2.5 px-3 w-28">الإجمالي</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newPoItems.map((item, index) => {
                        const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                        return (
                          <tr key={index} className="bg-white">
                            <td className="py-2 px-3">
                              <select
                                value={item.partId}
                                onChange={(e) => {
                                  const selectedPart = parts.find((p) => p.id === e.target.value);
                                  const updated = [...newPoItems];
                                  updated[index].partId = e.target.value;
                                  if (selectedPart?.costPrice) {
                                    updated[index].unitPrice = selectedPart.costPrice;
                                  }
                                  setNewPoItems(updated);
                                }}
                                required
                                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fleet-500"
                              >
                                <option value="">-- اختر الصنف --</option>
                                {parts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.partNumber})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...newPoItems];
                                  updated[index].quantity = parseFloat(e.target.value) || 0;
                                  setNewPoItems(updated);
                                }}
                                required
                                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-fleet-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const updated = [...newPoItems];
                                  updated[index].unitPrice = parseFloat(e.target.value) || 0;
                                  setNewPoItems(updated);
                                }}
                                required
                                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-fleet-500"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">
                              {formatAmount(lineTotal)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {newPoItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setNewPoItems(newPoItems.filter((_, i) => i !== index))}
                                  className="text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500">
                  يتم تطبيق ضريبة القيمة المضافة بنسبة <span className="font-bold text-slate-700">15%</span> تلقائياً حسب الأنظمة
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-500 block text-[10px]">المجموع الفرعي</span>
                    <span className="font-mono font-bold text-slate-800">{formatAmount(poModalCalculations.subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ضريبة 15%</span>
                    <span className="font-mono font-bold text-slate-800">{formatAmount(poModalCalculations.tax)}</span>
                  </div>
                  <div className="border-r border-slate-300 pr-4">
                    <span className="text-slate-500 block text-[10px]">الإجمالي الكلي المطلوب</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">{formatAmount(poModalCalculations.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شروط وملاحظات التوريد</label>
                <textarea
                  rows={2}
                  value={newPoNotes}
                  onChange={(e) => setNewPoNotes(e.target.value)}
                  placeholder="مثال: التوريد لمستودع الرياض الرئيسي، مطابقة شهادات المنشأ والمواصفات الفنية المعتمدة..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewPoModal(false)}
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
                  <span>إصدار أمر الشراء الرسمي</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEIVE GOODS & SUPPLY TO WAREHOUSE (GOODS RECEIPT) */}
      {showReceiveModal && selectedPoForReceive && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    فحص واستلام وتوريد للمخزون (Goods Receipt)
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    أمر الشراء: <span className="font-mono font-bold">{selectedPoForReceive.poNumber}</span> | المورد:{' '}
                    <span className="font-bold">{selectedPoForReceive.supplier?.name}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
                <FileCheck2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">التوريد المباشر للمستودع:</span>
                  بمجرد تأكيد هذا الإذن، سيتم فوراً تحديث رصيد الأصناف الفعلي في المستودع المختار، وإنشاء حركة مخزنية رسمية (RECEIPT) برقم أمر الشراء وتغيير حالة الأمر إلى مكتمل.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المستودع المستلم <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={receiveWarehouseId}
                    onChange={(e) => setReceiveWarehouseId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">أمين المستودع المستلم</label>
                  <input
                    type="text"
                    value={receivedByName}
                    onChange={(e) => setReceivedByName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Items receiving table */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">الأصناف والكميات المستلمة فعلياً</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">اسم الصنف</th>
                        <th className="py-2.5 px-3 w-28">الكمية بالأمر</th>
                        <th className="py-2.5 px-3 w-32">الكمية المستلمة</th>
                        <th className="py-2.5 px-3 w-28">سعر الوحدة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receiveItemsData.map((item, index) => (
                        <tr key={item.partId} className="bg-white">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{item.partName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{item.orderedQty}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              max={item.orderedQty}
                              step="any"
                              value={item.receivedQty}
                              onChange={(e) => {
                                const updated = [...receiveItemsData];
                                updated[index].receivedQty = parseFloat(e.target.value) || 0;
                                setReceiveItemsData(updated);
                              }}
                              className="w-full text-xs p-1.5 bg-emerald-50/50 border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{formatAmount(item.unitCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReceipt}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>تأكيد الاستلام والتوريد الفوري للمخزون</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE PURCHASE REQUEST (PR) */}
      {showNewPrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">إنشاء طلب شراء داخلي (Purchase Request)</h3>
                  <p className="text-[11px] text-slate-500">رفع احتياجات ورشة الصيانة أو المستودع للاعتماد</p>
                </div>
              </div>
              <button onClick={() => setShowNewPrModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePR} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">مقدم الطلب</label>
                  <input
                    type="text"
                    value={newPrRequestedBy}
                    onChange={(e) => setNewPrRequestedBy(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">مبرر الشراء / الغرض</label>
                  <input
                    type="text"
                    value={newPrJustification}
                    onChange={(e) => setNewPrJustification(e.target.value)}
                    placeholder="مثال: تعويض حد الأمان لزيوت المحركات وفلاتر الوقود"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                  />
                </div>
              </div>

              {/* Items Line Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">الأصناف المطلوبة</label>
                  <button
                    type="button"
                    onClick={() => setNewPrItems([...newPrItems, { partId: '', quantity: 1, estimatedPrice: 0 }])}
                    className="text-xs text-fleet-600 hover:text-fleet-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف آخر</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">الصنف</th>
                        <th className="py-2.5 px-3 w-28">الكمية المطلوبة</th>
                        <th className="py-2.5 px-3 w-32">السعر التقديري</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newPrItems.map((item, index) => (
                        <tr key={index} className="bg-white">
                          <td className="py-2 px-3">
                            <select
                              value={item.partId}
                              onChange={(e) => {
                                const selectedPart = parts.find((p) => p.id === e.target.value);
                                const updated = [...newPrItems];
                                updated[index].partId = e.target.value;
                                if (selectedPart?.costPrice) {
                                  updated[index].estimatedPrice = selectedPart.costPrice;
                                }
                                setNewPrItems(updated);
                              }}
                              required
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-fleet-500"
                            >
                              <option value="">-- اختر الصنف --</option>
                              {parts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.partNumber})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...newPrItems];
                                updated[index].quantity = parseFloat(e.target.value) || 0;
                                setNewPrItems(updated);
                              }}
                              required
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-fleet-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.estimatedPrice}
                              onChange={(e) => {
                                const updated = [...newPrItems];
                                updated[index].estimatedPrice = parseFloat(e.target.value) || 0;
                                setNewPrItems(updated);
                              }}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-fleet-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            {newPrItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setNewPrItems(newPrItems.filter((_, i) => i !== index))}
                                className="text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewPrModal(false)}
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
                  <span>تسجيل طلب الشراء الداخلي</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
