'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto"
    >
      <Printer className="w-4 h-4" />
      <span>طباعة / تصدير التقرير PDF</span>
    </button>
  );
}
