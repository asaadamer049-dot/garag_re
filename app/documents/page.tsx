'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Calendar,
  RotateCw,
  Clock,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

export default function DocumentsPage() {
  const { symbol } = useCurrency();
  const [documents, setDocuments] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedDocForRenew, setSelectedDocForRenew] = useState<any>(null);

  // New Document Form State
  const [formData, setFormData] = useState({
    vehicleId: '',
    documentType: 'REGISTRATION',
    documentNumber: '',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    issuingAuthority: 'الإدارة العامة للمرور',
    fees: '300',
    recordExpense: true,
    notes: '',
  });

  // Renewal Form State
  const [renewalData, setRenewalData] = useState({
    newExpiryDate: '',
    fees: '300',
    insuranceCost: '0',
    inspectionCost: '0',
    receiptNumber: '',
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (typeFilter) q.set('documentType', typeFilter);

      const res = await fetch(`/api/documents?${q.toString()}`);
      const data = await res.json();
      if (data.data) {
        setDocuments(data.data.documents || []);
        setVehicles(data.data.vehicles || []);
        if (data.data.vehicles?.length > 0 && !formData.vehicleId) {
          setFormData((prev) => ({ ...prev, vehicleId: data.data.vehicles[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter]);

  // Handle Add Document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشل في حفظ بيانات الوثيقة');
        setSubmitting(false);
        return;
      }

      setFormSuccess('تمت إضافة الوثيقة وترحيل الرسوم للمصروفات بنجاح!');
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
        setFormData((prev) => ({
          ...prev,
          documentNumber: '',
          notes: '',
        }));
        fetchDocuments();
      }, 700);
    } catch {
      setFormError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Renew Modal
  const openRenew = (doc: any) => {
    setSelectedDocForRenew(doc);
    // Suggest 1 year from current expiry or today
    const currentExpiry = new Date(doc.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const nextYear = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    setRenewalData({
      newExpiryDate: nextYear.toISOString().slice(0, 10),
      fees: doc.documentType === 'REGISTRATION' ? '300' : '0',
      insuranceCost: doc.documentType === 'INSURANCE' ? '1200' : '0',
      inspectionCost: doc.documentType === 'PERIODIC_INSPECTION' ? '150' : '0',
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      notes: '',
    });
    setFormError('');
    setFormSuccess('');
    setShowRenewModal(true);
  };

  // Handle Renew Document
  const handleRenewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForRenew) return;
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch(`/api/documents/${selectedDocForRenew.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renewalData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشل في تجديد الوثيقة');
        setSubmitting(false);
        return;
      }

      setFormSuccess('تم تجديد الوثيقة وتحديث تاريخ الانتهاء وتسجيل المصروف بنجاح!');
      setTimeout(() => {
        setShowRenewModal(false);
        setFormSuccess('');
        fetchDocuments();
      }, 700);
    } catch {
      setFormError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered documents by search
  const filteredDocs = documents.filter((doc) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      doc.documentNumber.toLowerCase().includes(term) ||
      doc.vehicle?.internalCode?.toLowerCase().includes(term) ||
      doc.vehicle?.plateNumber?.toLowerCase().includes(term) ||
      doc.issuingAuthority?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-fleet-600" />
            <span>التراخيص والوثائق الرسمية للمركبات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل وتجديد رخص السير (الاستمارات)، وثائق التأمين، شهادات الفحص الدوري، وتتبع تواريخ الانتهاء والرسوم
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setFormSuccess('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-sm shadow-md shadow-fleet-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة ترخيص / وثيقة جديدة</span>
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
            placeholder="بحث برقم الوثيقة، اللوحة، أو الكود الداخلي..."
            className="w-full pl-3 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fleet-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fleet-500 text-slate-800 font-medium"
          >
            <option value="">جميع أنواع الوثائق</option>
            <option value="REGISTRATION">رخص سير (استمارات)</option>
            <option value="INSURANCE">وثائق تأمين</option>
            <option value="PERIODIC_INSPECTION">فحص دوري فني</option>
            <option value="OPERATING_CARD">كروت تشغيل ونقل</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">المركبة</th>
                <th className="py-3.5 px-4 font-bold">نوع الوثيقة</th>
                <th className="py-3.5 px-4 font-bold">رقم الوثيقة</th>
                <th className="py-3.5 px-4 font-bold">جهة الإصدار</th>
                <th className="py-3.5 px-4 font-bold">تاريخ الإصدار</th>
                <th className="py-3.5 px-4 font-bold">تاريخ الانتهاء</th>
                <th className="py-3.5 px-4 font-bold">المتبقي</th>
                <th className="py-3.5 px-4 font-bold">الحالة</th>
                <th className="py-3.5 px-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    جاري تحميل التراخيص والوثائق...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد وثائق مسجلة مطابقة لمعايير البحث. انقر فوق زر "إضافة ترخيص / وثيقة جديدة" لإدخال أول وثيقة.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const now = Date.now();
                  const expiry = new Date(doc.expiryDate).getTime();
                  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                  const isExpired = diffDays <= 0;
                  const isSoon = diffDays > 0 && diffDays <= 30;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {doc.vehicle?.internalCode} ({doc.vehicle?.plateNumber})
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {doc.documentType === 'REGISTRATION'
                          ? 'رخصة سير (استمارة)'
                          : doc.documentType === 'INSURANCE'
                          ? 'وثيقة تأمين شامل'
                          : doc.documentType === 'PERIODIC_INSPECTION'
                          ? 'شهادة فحص دوري'
                          : doc.documentType === 'OPERATING_CARD'
                          ? 'كرت تشغيل نقل'
                          : doc.documentType}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {doc.documentNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {doc.issuingAuthority || 'المرور'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {new Date(doc.issueDate).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {new Date(doc.expiryDate).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {isExpired ? (
                          <span className="text-rose-600 font-bold">منتهية منذ {Math.abs(diffDays)} يوم</span>
                        ) : (
                          <span className={isSoon ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                            باقي {diffDays} يوم
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isExpired
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isSoon
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isExpired ? 'منتهية الصلاحية' : isSoon ? 'تستحق التجديد' : 'سارية ومطابقة'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openRenew(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fleet-50 hover:bg-fleet-100 text-fleet-700 text-xs font-bold border border-fleet-200 transition-colors"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>تجديد الوثيقة</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Modal: إضافة ترخيص / وثيقة جديدة */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-fleet-600" />
                <span>إدخال ترخيص أو وثيقة جديدة للمركبة</span>
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

            <form onSubmit={handleCreateDocument} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المركبة المستهدفة *</label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.internalCode} - {v.plateNumber} ({v.brandModel?.brand} {v.brandModel?.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الوثيقة *</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => {
                      const dt = e.target.value;
                      let authority = 'الإدارة العامة للمرور';
                      let fee = '300';
                      if (dt === 'INSURANCE') {
                        authority = 'شركة التعاونية / نجم';
                        fee = '1200';
                      } else if (dt === 'PERIODIC_INSPECTION') {
                        authority = 'مركز الفحص الفني الدوري';
                        fee = '150';
                      } else if (dt === 'OPERATING_CARD') {
                        authority = 'الهيئة العامة للنقل (TGA)';
                        fee = '100';
                      }
                      setFormData({
                        ...formData,
                        documentType: dt,
                        issuingAuthority: authority,
                        fees: fee,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  >
                    <option value="REGISTRATION">رخصة سير (استمارة)</option>
                    <option value="INSURANCE">وثيقة تأمين شامل / ضد الغير</option>
                    <option value="PERIODIC_INSPECTION">شهادة فحص دوري فني</option>
                    <option value="OPERATING_CARD">بطاقة تشغيل نقل (TGA)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الوثيقة / الرخصة *</label>
                  <input
                    type="text"
                    required
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="مثال: 1092837482"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">جهة الإصدار</label>
                  <input
                    type="text"
                    value={formData.issuingAuthority}
                    onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الإصدار *</label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الانتهاء *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Financial linkage */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">رسوم الإصدار / التكلفة ({symbol})</label>
                  <label className="flex items-center gap-1.5 text-xs text-fleet-700 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.recordExpense}
                      onChange={(e) => setFormData({ ...formData, recordExpense: e.target.checked })}
                      className="rounded text-fleet-600 focus:ring-fleet-500"
                    />
                    <span>تسجيل الرسوم في المصروفات المالية تلقائياً</span>
                  </label>
                </div>
                <input
                  type="number"
                  step="any"
                  value={formData.fees}
                  onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات توثيقية إضافية</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات الشروط أو القيود الفنية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                ></textarea>
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
                  {submitting ? 'جاري الحفظ...' : 'حفظ الوثيقة واعتمادها'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: تجديد وثيقة قائمة */}
      {showRenewModal && selectedDocForRenew && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-fleet-600" />
                <span>تجديد وثيقة: {selectedDocForRenew.vehicle?.internalCode}</span>
              </h3>
              <button
                onClick={() => setShowRenewModal(false)}
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

            <div className="p-3 bg-fleet-50/60 rounded-xl border border-fleet-100 text-xs space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">نوع الوثيقة:</span>
                <span className="font-bold text-slate-800">{selectedDocForRenew.documentType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الوثيقة:</span>
                <span className="font-mono font-bold text-slate-800">{selectedDocForRenew.documentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الانتهاء الحالي:</span>
                <span className="font-mono text-rose-600 font-bold">
                  {new Date(selectedDocForRenew.expiryDate).toLocaleDateString('ar-SA')}
                </span>
              </div>
            </div>

            <form onSubmit={handleRenewDocument} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الانتهاء الجديد *</label>
                <input
                  type="date"
                  required
                  value={renewalData.newExpiryDate}
                  onChange={(e) => setRenewalData({ ...renewalData, newExpiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رسوم التجديد الحكومية ({symbol})</label>
                  <input
                    type="number"
                    step="any"
                    value={renewalData.fees}
                    onChange={(e) => setRenewalData({ ...renewalData, fees: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تكلفة التأمين / الفحص (إن وجد)</label>
                  <input
                    type="number"
                    step="any"
                    value={renewalData.insuranceCost}
                    onChange={(e) => setRenewalData({ ...renewalData, insuranceCost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الإيصال / المرجع البنكي (سداد)</label>
                <input
                  type="text"
                  value={renewalData.receiptNumber}
                  onChange={(e) => setRenewalData({ ...renewalData, receiptNumber: e.target.value })}
                  placeholder="رقم إيصال سداد أو الفاتورة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات التجديد</label>
                <textarea
                  value={renewalData.notes}
                  onChange={(e) => setRenewalData({ ...renewalData, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات توثيقية إضافية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold shadow-md shadow-fleet-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'جاري التجديد...' : 'اعتماد التجديد وتحديث التاريخ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
