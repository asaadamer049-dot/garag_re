import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const where: any = {};
    if (status === 'ACTIVE') where.isActive = true;
    if (status === 'INACTIVE') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const [departments, totalVehicles, unassignedVehiclesCount, managers] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          _count: {
            select: {
              vehicles: true,
              drivers: true,
              users: true,
              budgets: true,
            },
          },
          vehicles: {
            select: {
              id: true,
              internalCode: true,
              plateNumber: true,
              status: true,
              vehicleType: { select: { name: true } },
              brandModel: { select: { brand: true, model: true } },
            },
            take: 20,
          },
          users: {
            where: { isActive: true },
            select: {
              id: true,
              fullName: true,
              userRoles: {
                select: {
                  role: { select: { name: true } },
                },
              },
            },
            take: 5,
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.vehicle.count(),
      prisma.vehicle.count({
        where: { departmentId: null },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          fullName: true,
          userRoles: {
            select: {
              role: { select: { name: true } },
            },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const mappedManagers = managers.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      role: m.userRoles?.[0]?.role?.name || 'موظف',
    }));

    const mappedDepartments = departments.map((d) => ({
      ...d,
      users: d.users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        role: u.userRoles?.[0]?.role?.name || 'موظف',
      })),
    }));

    const assignedVehiclesCount = totalVehicles - unassignedVehiclesCount;

    const stats = {
      totalDepartments: departments.length,
      activeDepartments: departments.filter((d) => d.isActive).length,
      totalVehicles,
      assignedVehiclesCount,
      unassignedVehiclesCount,
    };

    return NextResponse.json({
      success: true,
      data: {
        departments: mappedDepartments,
        stats,
        managers: mappedManagers,
      },
    });
  } catch (error: any) {
    console.error('Fetch departments error:', error);
    return NextResponse.json(
      { error: error.message || 'فشل في استرجاع قائمة الإدارات' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const action = body.action || 'create';

    // Get default company
    const company = await prisma.company.findFirst();
    const companyId = company ? company.id : 'default-company-id';

    // 1. ACTION: Create Department (إضافة إدارة جديدة)
    if (action === 'create') {
      const { name, code, managerUserId, isActive = true } = body;

      if (!name || name.trim() === '') {
        return NextResponse.json({ error: 'اسم الإدارة حقل إلزامي' }, { status: 400 });
      }

      let finalCode = code?.trim().toUpperCase();
      if (!finalCode) {
        const count = await prisma.department.count();
        finalCode = `DEPT-${String(count + 1).padStart(3, '0')}`;
      }

      // Check unique code
      const existing = await prisma.department.findUnique({
        where: { code: finalCode },
      });
      if (existing) {
        return NextResponse.json({ error: `كود الإدارة (${finalCode}) مستخدم مسبقاً، يرجى اختيار كود آخر` }, { status: 400 });
      }

      const newDept = await prisma.department.create({
        data: {
          companyId,
          code: finalCode,
          name: name.trim(),
          managerUserId: managerUserId || null,
          isActive: isActive !== undefined ? !!isActive : true,
        },
      });

      if (user) {
        await logAuditEvent({
          userId: user.userId,
          action: 'CREATE_DEPARTMENT',
          entityType: 'DEPARTMENT',
          entityId: newDept.id,
          newValues: newDept,
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم إضافة الإدارة (${newDept.name}) بنجاح`,
        data: newDept,
      });
    }

    // 2. ACTION: Update Department (تعديل إدارة قائمة)
    if (action === 'update') {
      const { id, name, code, managerUserId, isActive } = body;

      if (!id) {
        return NextResponse.json({ error: 'معرف الإدارة مفقود' }, { status: 400 });
      }
      if (!name || name.trim() === '') {
        return NextResponse.json({ error: 'اسم الإدارة حقل إلزامي' }, { status: 400 });
      }

      const existingDept = await prisma.department.findUnique({ where: { id } });
      if (!existingDept) {
        return NextResponse.json({ error: 'الإدارة غير موجودة' }, { status: 404 });
      }

      let finalCode = code ? code.trim().toUpperCase() : existingDept.code;
      if (finalCode !== existingDept.code) {
        const codeConflict = await prisma.department.findUnique({ where: { code: finalCode } });
        if (codeConflict && codeConflict.id !== id) {
          return NextResponse.json({ error: `كود الإدارة (${finalCode}) مستخدم مسبقاً` }, { status: 400 });
        }
      }

      const updatedDept = await prisma.department.update({
        where: { id },
        data: {
          name: name.trim(),
          code: finalCode,
          managerUserId: managerUserId !== undefined ? managerUserId : existingDept.managerUserId,
          isActive: isActive !== undefined ? !!isActive : existingDept.isActive,
        },
      });

      if (user) {
        await logAuditEvent({
          userId: user.userId,
          action: 'UPDATE_DEPARTMENT',
          entityType: 'DEPARTMENT',
          entityId: updatedDept.id,
          oldValues: existingDept,
          newValues: updatedDept,
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم تحديث بيانات الإدارة (${updatedDept.name}) بنجاح`,
        data: updatedDept,
      });
    }

    // 3. ACTION: Toggle Status (تفعيل أو إلغاء تفعيل الإدارة)
    if (action === 'toggle_status') {
      const { id, isActive } = body;
      if (!id) {
        return NextResponse.json({ error: 'معرف الإدارة مفقود' }, { status: 400 });
      }

      const updated = await prisma.department.update({
        where: { id },
        data: { isActive: !!isActive },
      });

      return NextResponse.json({
        success: true,
        message: `تم ${updated.isActive ? 'تفعيل' : 'إلغاء تفعيل'} الإدارة (${updated.name}) بنجاح`,
        data: updated,
      });
    }

    // 4. ACTION: Delete Department (حذف إدارة مع معالجة ذكية لنقل أو فك ارتباط المركبات)
    if (action === 'delete') {
      const { id, reassignToDepartmentId } = body;

      if (!id) {
        return NextResponse.json({ error: 'معرف الإدارة مفقود' }, { status: 400 });
      }

      const deptToDelete = await prisma.department.findUnique({
        where: { id },
        include: {
          _count: {
            select: { vehicles: true, drivers: true, users: true },
          },
        },
      });

      if (!deptToDelete) {
        return NextResponse.json({ error: 'الإدارة غير موجودة' }, { status: 404 });
      }

      // Safe transaction to reassign/unlink related records before deletion
      await prisma.$transaction(async (tx) => {
        const targetDeptId = reassignToDepartmentId && reassignToDepartmentId.trim() !== '' ? reassignToDepartmentId : null;

        // 1. Reassign / disassociate vehicles
        await tx.vehicle.updateMany({
          where: { departmentId: id },
          data: { departmentId: targetDeptId },
        });

        // 2. Reassign / disassociate drivers
        await tx.driver.updateMany({
          where: { departmentId: id },
          data: { departmentId: targetDeptId },
        });

        // 3. Reassign / disassociate users
        await tx.user.updateMany({
          where: { departmentId: id },
          data: { departmentId: targetDeptId },
        });

        // 4. Disassociate optional budget & expense links
        await tx.budget.updateMany({
          where: { departmentId: id },
          data: { departmentId: targetDeptId },
        });

        await tx.expense.updateMany({
          where: { departmentId: id },
          data: { departmentId: targetDeptId },
        });

        await tx.purchaseRequest.updateMany({
          where: { departmentId: id },
          data: { departmentId: targetDeptId },
        });

        // 5. Delete department
        await tx.department.delete({
          where: { id },
        });
      });

      if (user) {
        await logAuditEvent({
          userId: user.userId,
          action: 'DELETE_DEPARTMENT',
          entityType: 'DEPARTMENT',
          entityId: id,
          oldValues: deptToDelete,
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم حذف الإدارة (${deptToDelete.name}) بنجاح ونقل المركبات التابعة لها بأمان`,
      });
    }

    return NextResponse.json({ error: 'إجراء غير مدعوم' }, { status: 400 });
  } catch (error: any) {
    console.error('Department API error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء معالجة طلب الإدارات' },
      { status: 500 }
    );
  }
}
