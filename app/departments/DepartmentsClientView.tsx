'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  Users,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRightLeft,
  Check,
  Power,
  Layers,
  UserCheck,
} from 'lucide-react';

interface VehicleSummary {
  id: string;
  internalCode: string;
  plateNumber: string;
  status: string;
  vehicleType?: { name: string } | null;
  brandModel?: { brand: string; model: string } | null;
}

interface UserSummary {
  id: string;
  fullName: string;
  role: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
  managerUserId?: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    vehicles: number;
    drivers: number;
    users: number;
    budgets: number;
  };
  vehicles: VehicleSummary[];
  users: UserSummary[];
}

export default function DepartmentsClientView() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<UserSummary[]>([]);
  const [stats, setStats] = useState({
    totalDepartments: 0,
    activeDepartments: 0,
    totalVehicles: 0,
    assignedVehiclesCount: 0,
    unassignedVehiclesCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    managerUserId: '',
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch departments data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/departments');
      const json = await res.json();
      if (json.success && json.data) {
        setDepartments(json.data.departments || []);
        setManagers(json.data.managers || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && d.isActive) ||
        (statusFilter === 'INACTIVE' && !d.isActive);
      return matchSearch && matchStatus;
    });
  }, [departments, searchTerm, statusFilter]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      managerUserId: '',
      isActive: true,
    });
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      managerUserId: dept.managerUserId || '',
      isActive: dept.isActive,
    });
    setShowAddEditModal(true);
  };

  // Submit Save Department (Create / Update)
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('اسم الإدارة حقل إلزامي');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const action = editingDept ? 'update' : 'create';
      const body = editingDept
        ? { action, id: editingDept.id, ...formData }
        : { action, ...formData };

      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في حفظ بيانات الإدارة');
      }

      setSuccessMessage(data.message || 'تم حفظ بيانات الإدارة بنجاح');
      setShowAddEditModal(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ الإدارة');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (dept: Department) => {
    setDeptToDelete(dept);
    setReassignTargetId('');
    setShowDeleteModal(true);
  };

  // Submit Delete Department
  const handleConfirmDelete = async () => {
    if (!deptToDelete) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: deptToDelete.id,
          reassignToDepartmentId: reassignTargetId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في حذف الإدارة');
      }

      setSuccessMessage(data.message || 'تم حذف الإدارة بنجاح');
      setShowDeleteModal(false);
      setDeptToDelete(null);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حذف الإدارة');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (dept: Department) => {
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          id: dept.id,
          isActive: !dept.isActive,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message);
        fetchData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
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
            <span>الإدارات التابعة وأقسام الأسطول</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            إدارة وتعديل الإدارات التابعة لها المركبات (إضافة، تعديل، حذف، وأرشفة)، وتوزيع المركبات والسائقين على قطاعات العمل
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/vehicles"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow"
          >
            <Truck className="w-4 h-4 text-fleet-600" />
            <span>سجل المركبات</span>
          </Link>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-fleet-600 hover:bg-fleet-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-fleet-200 shadow-fleet-100"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة إدارة جديدة</span>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>إجمالي الإدارات</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{stats.totalDepartments}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">قسم وإدارة بالمنشأة</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium mb-1">
            <span>الإدارات النشطة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{stats.activeDepartments}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">متاحة لتعيين المركبات</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-medium mb-1">
            <span>مركبات موزعة على إدارات</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">{stats.assignedVehiclesCount}</div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">مركبة تحت إشراف إداري</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium mb-1">
            <span>مركبات عامة (بدون إدارة)</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">{stats.unassignedVehiclesCount}</div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">يمكن تعيينها للإدارات</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم الإدارة أو الكود..."
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
            <option value="ALL">جميع الإدارات</option>
            <option value="ACTIVE">نشطة فقط</option>
            <option value="INACTIVE">معطلة / مؤرشفة</option>
          </select>
        </div>
      </div>

      {/* Departments Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fleet-600" />
            <span>جاري تحميل بيانات الإدارات...</span>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            لا توجد إدارات مطابقة لمعايير البحث. اضغط على "+ إضافة إدارة جديدة" للبدء.
          </div>
        ) : (
          filteredDepartments.map((dept) => {
            const isExpanded = expandedDeptId === dept.id;

            return (
              <div
                key={dept.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm ${
                  dept.isActive ? 'border-slate-200/90 hover:shadow-md' : 'border-slate-200 bg-slate-50/50 opacity-80'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                        {dept.code}
                      </span>
                      {dept.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          نشطة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          معطلة
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(dept)}
                        title={dept.isActive ? 'إلغاء تفعيل الإدارة' : 'تفعيل الإدارة'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          dept.isActive
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(dept)}
                        title="تعديل الإدارة"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-fleet-600 hover:bg-slate-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenDeleteModal(dept)}
                        title="حذف الإدارة"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Department Name */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-fleet-600 flex-shrink-0" />
                      <span>{dept.name}</span>
                    </h3>
                  </div>

                  {/* Summary Counters */}
                  <div className="grid grid-cols-3 gap-2.5 p-2.5 bg-slate-50 rounded-xl text-center text-xs border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">المركبات التابعة</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{dept._count.vehicles}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">السائقين المعينين</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{dept._count.drivers}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">الموظفين</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{dept._count.users}</span>
                    </div>
                  </div>

                  {/* Bottom Expand Toggle */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedDeptId(isExpanded ? null : dept.id)}
                      className="text-xs font-bold text-fleet-600 hover:text-fleet-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>
                        {isExpanded ? 'إخفاء المركبات التابعة' : `عرض المركبات التابعة (${dept._count.vehicles})`}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <Link
                      href={`/vehicles?search=${encodeURIComponent(dept.name)}`}
                      className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      <span>تصفية في السجل</span>
                      <ArrowRightLeft className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Expanded Vehicles List */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/60 p-4 space-y-2 rounded-b-2xl">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                      <span>المركبات المسجلة تحت ({dept.name}):</span>
                      <span className="font-mono text-slate-500 text-[11px]">{dept.vehicles.length} مركبة</span>
                    </div>

                    {dept.vehicles.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">
                        لا توجد مركبات مسندة لهذه الإدارة حالياً. يمكنك إسناد المركبات من شاشة سجل المركبات.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {dept.vehicles.map((v) => (
                          <div
                            key={v.id}
                            className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {v.internalCode}
                              </span>
                              <span className="font-bold text-slate-800">{v.plateNumber}</span>
                              <span className="text-slate-400 text-[11px]">
                                {v.brandModel?.brand} {v.brandModel?.model}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {v.status === 'ACTIVE' ? 'نشطة' : v.status}
                              </span>
                              <Link
                                href={`/vehicles/${v.id}`}
                                className="text-fleet-600 hover:text-fleet-700 font-bold text-[11px]"
                              >
                                ملف المركبة
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: CREATE / EDIT DEPARTMENT */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-fleet-100 text-fleet-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingDept ? `تعديل إدارة: ${editingDept.name}` : 'إضافة إدارة جديدة للمركبات'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تحديد الاسم والكود والمدير المسؤول لقطاع العمليات
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الإدارة / القسم <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: إدارة النقل والعمليات الميدانية"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كود الإدارة (رمز مختصر فريد)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="مثال: OPS, MAINT, PROJECTS (يولد تلقائياً إن ترك فارغاً)"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-fleet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المدير المسؤول (اختياري)
                </label>
                <select
                  value={formData.managerUserId}
                  onChange={(e) => setFormData({ ...formData, managerUserId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fleet-500"
                >
                  <option value="">-- بدون مدير محدد --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-fleet-600 focus:ring-fleet-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    تفعيل الإدارة وجعلها نشطة لتعيين المركبات
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
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
                  <span>{editingDept ? 'حفظ التعديلات' : 'إضافة الإدارة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SAFE DELETE MODAL (معالجة ذكية لنقل المركبات) */}
      {showDeleteModal && deptToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">حذف الإدارة</h3>
                  <p className="text-[11px] text-rose-700">
                    تأكيد حذف: <span className="font-bold font-mono">{deptToDelete.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {deptToDelete._count.vehicles > 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>تنبيه: يوجد {deptToDelete._count.vehicles} مركبة تابعة لهذه الإدارة!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    لحماية بيانات وسجلات المركبات، يرجى اختيار الإدارة البديلة لنقل المركبات إليها، أو تركها فارغة لجعلها مركبات عامة بدون إدارة:
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      نقل المركبات والسائقين إلى:
                    </label>
                    <select
                      value={reassignTargetId}
                      onChange={(e) => setReassignTargetId(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">-- جعل المركبات عامة (بدون إدارة محددة) --</option>
                      {departments
                        .filter((d) => d.id !== deptToDelete.id)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            نقل إلى: {d.name} ({d.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف إدارة <span className="font-bold text-slate-900">({deptToDelete.name})</span> نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>تأكيد الحذف والنقل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
