import React from 'react';
import prisma from '@/lib/prisma';
import { getSystemCurrency } from '@/lib/currency-server';
import { PieChart, DollarSign, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BudgetsPage() {
  const currencyInfo = await getSystemCurrency();
  const departments = await prisma.department.findMany({
    include: {
      expenses: true,
      budgets: true,
    },
  });

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PieChart className="w-6 h-6 text-fleet-600" />
          <span>الميزانيات ومراكز التكلفة للإدارات</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          مقارنة الميزانيات التقديرية المعتمدة بالمصروفات الفعلية ومتابعة الانحرافات المالية
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => {
          const actualExpenses = dept.expenses.reduce((acc, e) => acc + e.totalAmount, 0);
          const allocatedBudget = 500000; // Standard allocation
          const usagePercent = Math.min(100, Math.round((actualExpenses / allocatedBudget) * 100));

          return (
            <div key={dept.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-fleet-700 bg-fleet-50 px-2 py-0.5 rounded border border-fleet-200">
                    {dept.code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1">{dept.name}</h3>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs text-slate-500 block">نسبة الاستهلاك</span>
                  <span className="text-lg font-extrabold text-fleet-700">{usagePercent}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    usagePercent > 85 ? 'bg-rose-500' : usagePercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block">المصروف الفعلي:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {currencyInfo.position === 'before'
                      ? `${currencyInfo.symbol} ${actualExpenses.toLocaleString()}`
                      : `${actualExpenses.toLocaleString()} ${currencyInfo.symbol}`}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-slate-400 block">الميزانية المعتمدة:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {currencyInfo.position === 'before'
                      ? `${currencyInfo.symbol} ${allocatedBudget.toLocaleString()}`
                      : `${allocatedBudget.toLocaleString()} ${currencyInfo.symbol}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
