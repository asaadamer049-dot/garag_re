import React from 'react';
import prisma from '@/lib/prisma';
import { ShieldAlert, Search, Filter, Clock, User, Database, ArrowUpDown } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
  const auditLogs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-purple-600" />
          <span>سجل التدقيق الرقابي غير القابل للتعديل</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          تسجيل موثق لكافة الحركات الحساسة: الاعتمادات، إلغاء السجلات، التعديل المالي، حركات المستودعات، والصلاحيات
        </p>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="py-3.5 px-4 font-bold">وقت وتاريخ الحركة</th>
                <th className="py-3.5 px-4 font-bold">نوع الإجراء (Action)</th>
                <th className="py-3.5 px-4 font-bold">الكيان المتأثر</th>
                <th className="py-3.5 px-4 font-bold">معرف الكيان</th>
                <th className="py-3.5 px-4 font-bold">المستخدم المنفذ</th>
                <th className="py-3.5 px-4 font-bold">عنوان IP</th>
                <th className="py-3.5 px-4 font-bold">تفاصيل التغيير (Values)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    لا توجد سجلات تدقيق مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('ar-SA')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 text-xs">
                      {log.entityType}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {log.entityId ? `${log.entityId.slice(0, 8)}...` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {log.user ? log.user.fullName : 'النظام الداخلي'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="max-w-xs truncate font-mono text-[11px] text-slate-500" title={log.newValuesJson || ''}>
                        {log.newValuesJson || log.oldValuesJson || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
