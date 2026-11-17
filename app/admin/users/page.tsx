import React from 'react';
import prisma from '@/lib/prisma';
import {
  UserCheck,
  ShieldCheck,
  Users,
  Building,
  Key,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UsersAdminPage() {
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: {
        department: true,
        userRoles: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8 font-cairo" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-fleet-600" />
          <span>المستخدمون والأدوار والصلاحيات (RBAC)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          إدارة حسابات موظفي الشركة، تقسيم الأدوار القياسية، ومنح الصلاحيات الدقيقة مع مبدأ الفصل بين المهام
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-fleet-600" />
            <span>حسابات المستخدمين النشطة</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 font-bold">اسم المستخدم</th>
                <th className="py-3 px-3 font-bold">الاسم الكامل</th>
                <th className="py-3 px-3 font-bold">البريد الإلكتروني</th>
                <th className="py-3 px-3 font-bold">الإدارة / القسم</th>
                <th className="py-3 px-3 font-bold">الأدوار الممنوحة</th>
                <th className="py-3 px-3 font-bold">آخر تسجيل دخول</th>
                <th className="py-3 px-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {u.username}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {u.fullName}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {u.email}
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    {u.department ? u.department.name : 'الإدارة العامة'}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {u.userRoles.map((ur) => (
                        <span
                          key={ur.roleId}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fleet-50 text-fleet-700 border border-fleet-200"
                        >
                          {ur.role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ar-SA') : 'لم يسجل دخول بعد'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {u.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>نشط ومفعل</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>معطل</span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standard Roles Directory */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <span>الأدوار القياسية المعتمدة في النظام (Role-Based Access Control)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-sm">{r.name}</span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-semibold">
                  {r.rolePermissions.length} صلاحية
                </span>
              </div>
              <p className="text-xs text-slate-600">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
