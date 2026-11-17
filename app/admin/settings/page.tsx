'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Save,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Clock,
  RotateCcw,
  Coins,
  Percent,
  Bell,
  PackageX,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';
import { SUPPORTED_CURRENCIES, getCurrencyByCode, DEFAULT_CURRENCY, CurrencyInfo } from '@/lib/currency';
import { useCurrency } from '@/context/CurrencyContext';

export default function SettingsPage() {
  const { updateCurrencyState } = useCurrency();

  // Settings State
  const [selectedCurrency, setSelectedCurrency] = useState<string>('SAR');
  const [isCustomCurrency, setIsCustomCurrency] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('ر.س');
  const [currencyName, setCurrencyName] = useState('ريال سعودي');
  const [currencyPosition, setCurrencyPosition] = useState<'before' | 'after'>('after');
  const [vatPercentage, setVatPercentage] = useState('15');
  const [alertDaysBeforeExpiry, setAlertDaysBeforeExpiry] = useState('30');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Backup State
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState('');
  const [backupError, setBackupError] = useState('');

  // Fetch Settings
  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/system/settings');
      if (res.ok) {
        const data = await res.json();
        const code = data.currency || 'SAR';
        const isStandard = SUPPORTED_CURRENCIES.some((c) => c.code === code);

        setSelectedCurrency(isStandard ? code : 'CUSTOM');
        setIsCustomCurrency(!isStandard);
        if (!isStandard) {
          setCustomCode(code);
        }

        setCurrencySymbol(data.currencySymbol || 'ر.س');
        setCurrencyName(data.currencyName || 'ريال سعودي');
        setCurrencyPosition(data.currencyPosition || 'after');
        setVatPercentage(data.vatPercentage || '15');
        setAlertDaysBeforeExpiry(data.alertDaysBeforeExpiry || '30');
        setAllowNegativeStock(Boolean(data.allowNegativeStock));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Fetch Backups
  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/system/backup');
      const data = await res.json();
      if (data.backups) {
        setBackups(data.backups);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBackups();
  }, []);

  // When standard currency is chosen from dropdown
  const handleCurrencySelect = (code: string) => {
    if (code === 'CUSTOM') {
      setIsCustomCurrency(true);
      setSelectedCurrency('CUSTOM');
      return;
    }

    setIsCustomCurrency(false);
    setSelectedCurrency(code);
    const info = getCurrencyByCode(code);
    if (info) {
      setCurrencySymbol(info.symbol);
      setCurrencyName(info.nameAr);
      setCurrencyPosition(info.position);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess('');
    setSettingsError('');

    try {
      const effectiveCode = isCustomCurrency
        ? customCode.trim().toUpperCase() || 'CUSTOM'
        : selectedCurrency;

      if (!effectiveCode) {
        setSettingsError('يرجى تحديد رمز العملة');
        setSavingSettings(false);
        return;
      }

      const payload = {
        currency: effectiveCode,
        currencySymbol: currencySymbol.trim(),
        currencyName: currencyName.trim(),
        currencyPosition,
        vatPercentage: Number(vatPercentage) || 0,
        alertDaysBeforeExpiry: Number(alertDaysBeforeExpiry) || 30,
        allowNegativeStock,
      };

      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setSettingsError(data.error || 'فشل في حفظ الإعدادات');
        setSavingSettings(false);
        return;
      }

      // Update global context so changes reflect immediately across the app
      updateCurrencyState({
        currency: effectiveCode,
        symbol: currencySymbol.trim(),
        name: currencyName.trim(),
        position: currencyPosition,
      });

      setSettingsSuccess('تم حفظ إعدادات العملة ومعايير النظام بنجاح!');
      setTimeout(() => setSettingsSuccess(''), 5000);
    } catch (err) {
      setSettingsError('حدث خطأ أثناء الاتصال بالخادم لحفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };

  // Backup Trigger
  const handleTriggerBackup = async () => {
    setBackupLoading(true);
    setBackupSuccess('');
    setBackupError('');

    try {
      const res = await fetch('/api/system/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setBackupError(data.error || 'فشل في إنشاء النسخة الاحتياطية');
        setBackupLoading(false);
        return;
      }

      setBackupSuccess('تم أخذ نسخة احتياطية كاملة لقاعدة البيانات وحفظها على وحدة التخزين بنجاح!');
      fetchBackups();
    } catch {
      setBackupError('حدث خطأ بالاتصال بالخادم الداخلي');
    } finally {
      setBackupLoading(false);
    }
  };

  // Sample formatted amount for preview
  const previewAmount = (val: number) => {
    const formatted = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currencyPosition === 'before' ? `${currencySymbol} ${formatted}` : `${formatted} ${currencySymbol}`;
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-fleet-600" />
          <span>إعدادات النظام والعملة والنسخ الاحتياطي</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          تكوين العملة الرسمية للمشروع، الضرائب، تنبيهات الاستحقاق، وإدارة النسخ الاحتياطية للخادم المحلي
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* System & Currency Settings Form (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Coins className="w-5 h-5 text-fleet-600" />
              <span>إعدادات عملة المشروع والمعايير المالية</span>
            </h3>
            <span className="text-[11px] font-medium text-fleet-700 bg-fleet-50 px-2.5 py-1 rounded-full border border-fleet-200">
              إعدادات عامة
            </span>
          </div>

          {settingsSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{settingsSuccess}</span>
            </div>
          )}

          {settingsError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{settingsError}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Currency Selection Section */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-fleet-600" />
                  <span>عملة النظام والمشروع (Project Currency) *</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  يتم تطبيقها على كافة المصروفات، فواتير الشراء، وتكاليف الصيانة والوقود
                </span>
              </div>

              {/* Main Currency Dropdown */}
              <div>
                <select
                  disabled={loadingSettings}
                  value={selectedCurrency}
                  onChange={(e) => handleCurrencySelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-fleet-500 focus:border-fleet-500 transition-all shadow-sm"
                >
                  <optgroup label="العملات الشائعة والمحلية">
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.nameAr} ({c.code} - {c.symbol}) — {c.nameEn}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="خيارات إضافية">
                    <option value="CUSTOM">عملة أخرى / مخصصة (Custom Currency)...</option>
                  </optgroup>
                </select>
              </div>

              {/* If Custom Currency Selected */}
              {isCustomCurrency && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      رمز العملة (ISO Code) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: QAR أو KWD"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      اسم العملة بالعربية *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ريال قطري"
                      value={currencyName}
                      onChange={(e) => setCurrencyName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Currency Customization Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    رمز العرض المختصر (Symbol)
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="ر.س أو $ أو د.إ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">الرمز الظاهر بجانب الأرقام (مثل: ر.س أو $)</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    موضع رمز العملة
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setCurrencyPosition('after')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                        currencyPosition === 'after'
                          ? 'bg-fleet-600 text-white border-fleet-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${currencyPosition === 'after' ? 'opacity-100' : 'opacity-0'}`} />
                      <span>بعد الرقم (100 {currencySymbol})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrencyPosition('before')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                        currencyPosition === 'before'
                          ? 'bg-fleet-600 text-white border-fleet-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${currencyPosition === 'before' ? 'opacity-100' : 'opacity-0'}`} />
                      <span>قبل الرقم ({currencySymbol} 100)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Visual Preview */}
              <div className="p-3.5 bg-gradient-to-r from-fleet-50 to-emerald-50 rounded-xl border border-fleet-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-fleet-900">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-fleet-600" />
                    <span>معاينة مباشرة لعرض المبالغ في النظام (Live Preview):</span>
                  </span>
                  <span className="text-[10px] font-mono text-fleet-700 font-bold bg-white px-2 py-0.5 rounded border border-fleet-200">
                    {isCustomCurrency ? customCode || 'CUSTOM' : selectedCurrency}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    <span className="block text-[10px] text-slate-500">تعبئة وقود</span>
                    <span className="text-xs font-bold text-slate-900 font-mono mt-0.5 block">
                      {previewAmount(345.5)}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    <span className="block text-[10px] text-slate-500">أمر صيانة</span>
                    <span className="text-xs font-bold text-fleet-700 font-mono mt-0.5 block">
                      {previewAmount(1850.0)}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    <span className="block text-[10px] text-slate-500">إجمالي المصروفات</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono mt-0.5 block">
                      {previewAmount(24900.0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Other System Parameters */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                المعايير التشغيلية والضريبية الإضافية
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-slate-500" />
                    <span>نسبة ضريبة القيمة المضافة (VAT %)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={vatPercentage}
                      onChange={(e) => setVatPercentage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-fleet-500"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-slate-500" />
                    <span>فترة التنبيه المسبق لانتهاء الوثائق (أيام)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={alertDaysBeforeExpiry}
                    onChange={(e) => setAlertDaysBeforeExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-fleet-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={allowNegativeStock}
                    onChange={(e) => setAllowNegativeStock(e.target.checked)}
                    className="w-4 h-4 rounded text-fleet-600 focus:ring-fleet-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      السماح بالصرف بالسالب في المستودعات (Allow Negative Stock)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      عند التعطيل، يمنع النظام صرف أي قطعة غيار إذا كان الرصيد الفعلي لا يكفي (يوصى بالتعطيل)
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={fetchSettings}
                disabled={savingSettings}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
              >
                إلغاء التغييرات
              </button>
              <button
                type="submit"
                disabled={savingSettings || loadingSettings}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-500 text-white font-bold text-xs shadow-md shadow-fleet-600/30 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'جاري الحفظ...' : 'حفظ إعدادات العملة والنظام'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Database & Backups Management (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-fleet-600" />
              <span>إدارة النسخ الاحتياطي (Backups)</span>
            </h3>
            <button
              onClick={handleTriggerBackup}
              disabled={backupLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{backupLoading ? 'جاري الأخذ...' : 'أخذ نسخة الآن'}</span>
            </button>
          </div>

          {backupSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{backupSuccess}</span>
            </div>
          )}

          {backupError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{backupError}</span>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-600">النسخ الاحتياطية المتوفرة على الخادم المحلي:</h4>
            <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-lg border border-slate-100">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="py-2 px-2.5">اسم ملف النسخة</th>
                    <th className="py-2 px-2.5">الحجم</th>
                    <th className="py-2 px-2.5">تاريخ الإنشاء</th>
                    <th className="py-2 px-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingBackups ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        جاري فحص مجلد النسخ...
                      </td>
                    </tr>
                  ) : backups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        لم يتم أخذ نسخ احتياطية يدوية بعد.
                      </td>
                    </tr>
                  ) : (
                    backups.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-mono font-semibold text-slate-800 text-[11px]">
                          {b.filename}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-600 text-[11px]">{b.sizeFormatted}</td>
                        <td className="py-2 px-2.5 text-slate-500 text-[11px]">
                          {new Date(b.createdAt).toLocaleString('ar-SA')}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            سليمة
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800 block mb-1">تعليمات الاستعادة (Disaster Recovery):</strong>
            لاستعادة أي نسخة احتياطية في حال تعطل الخادم، قم بإيقاف خدمة التطبيق ثم استبدل الملف{' '}
            <code className="font-mono bg-white px-1 border border-slate-300 rounded">prisma/fleet_erp.db</code>{' '}
            بملف النسخة الاحتياطية المطلوب، ثم أعد تشغيل الخدمة.
          </div>
        </div>
      </div>
    </div>
  );
}
