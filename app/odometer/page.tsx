'use client';

import React, { useState, useEffect } from 'react';
import { Gauge, Plus, AlertCircle, CheckCircle2, Search, AlertTriangle } from 'lucide-react';

export default function OdometerPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [readingValue, setReadingValue] = useState('');
  const [sourceType, setSourceType] = useState('MANUAL');
  const [notes, setNotes] = useState('');
  const [isCorrection, setIsCorrection] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      if (data.data) {
        setVehicles(data.data);
        if (data.data.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(data.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    setIsAnomaly(false);

    try {
      const res = await fetch('/api/odometer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          readingValue,
          sourceType,
          notes,
          isCorrection,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل في حفظ قراءة العداد');
        if (data.isAnomaly || data.isSuspicious) {
          setIsAnomaly(true);
        }
        setSubmitting(false);
        return;
      }

      setSuccess('تم تسجيل واعتماد قراءة العداد بنجاح!');
      setReadingValue('');
      setNotes('');
      setIsCorrection(false);
      fetchVehicles();
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Gauge className="w-6 h-6 text-fleet-600" />
          <span>سجل قراءات العداد والمسافات</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          تسجيل وتدقيق المسافات المقطوعة، ضبط الشذوذ والتناقضات، وتوثيق سجلات التصحيح المعتمدة
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-fleet-600" />
            <span>تسجيل قراءة عداد جديدة</span>
          </h3>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{error}</span>
                {isAnomaly && (
                  <div className="mt-2 pt-2 border-t border-rose-200/60">
                    <label className="flex items-center gap-2 font-bold cursor-pointer text-rose-900">
                      <input
                        type="checkbox"
                        checked={isCorrection}
                        onChange={(e) => setIsCorrection(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>تأكيد اعتماد القراءة كإجراء تصحيح رسمي مصرح به</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المركبة المستهدفة *</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm font-medium"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.internalCode} - {v.plateNumber} ({v.brandModel?.brand} {v.brandModel?.model})
                  </option>
                ))}
              </select>
            </div>

            {selectedVehicle && (
              <div className="p-3 bg-fleet-50/60 rounded-xl border border-fleet-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">القراءة الحالية المعتمدة:</span>
                <span className="font-mono font-bold text-fleet-700 text-sm">
                  {selectedVehicle.currentOdometer?.toLocaleString()} كم
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">قراءة العداد الجديدة (كم) *</label>
              <input
                type="number"
                required
                step="any"
                value={readingValue}
                onChange={(e) => setReadingValue(e.target.value)}
                placeholder="أدخل القراءة بالكيلومتر"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">مصدر القراءة</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm"
              >
                <option value="MANUAL">فحص يدوي دوري</option>
                <option value="MAINTENANCE">عند أمر الصيانة</option>
                <option value="FUEL">عند تعبئة الوقود</option>
                <option value="GPS">نظام تتبع GPS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات / سبب التسجيل</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="ملاحظات توثيقية إضافية..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-fleet-600 hover:bg-fleet-500 text-white font-bold rounded-xl shadow-md shadow-fleet-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? 'جاري التحقق والحفظ...' : 'اعتماد وتسجيل القراءة'}
            </button>
          </form>
        </div>

        {/* Fleet Odometer Summary Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4">أحدث قراءات العدادات المعتمدة للأسطول</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 font-bold">الرقم الداخلي</th>
                  <th className="py-3 px-3 font-bold">اللوحة</th>
                  <th className="py-3 px-3 font-bold">العداد الحالي</th>
                  <th className="py-3 px-3 font-bold">تاريخ آخر قراءة</th>
                  <th className="py-3 px-3 font-bold">السائق المعين</th>
                  <th className="py-3 px-3 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{v.internalCode}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{v.plateNumber}</td>
                    <td className="py-3 px-3 font-mono font-bold text-fleet-700 text-sm">
                      {v.currentOdometer?.toLocaleString()} كم
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {v.odometerUpdatedAt
                        ? new Date(v.odometerUpdatedAt).toLocaleDateString('ar-SA')
                        : 'افتتاحي'}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{v.assignedDriver?.fullName || 'غير معين'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        سليم
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
