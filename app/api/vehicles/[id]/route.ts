import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        vehicleType: true,
        brandModel: true,
        department: true,
        assignedDriver: true,
        odometerReadings: {
          orderBy: { readingDate: 'desc' },
          take: 30,
        },
        maintenanceOrders: {
          include: {
            tasks: true,
            parts: { include: { part: true, warehouse: true } },
            supplier: true,
          },
          orderBy: { openedAt: 'desc' },
          take: 20,
        },
        fuelTransactions: {
          include: { supplier: true, driver: true },
          orderBy: { transactionDate: 'desc' },
          take: 20,
        },
        documents: {
          include: { renewals: true },
          orderBy: { expiryDate: 'asc' },
        },
        expenses: {
          include: { category: true, payments: true },
          orderBy: { expenseDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ data: vehicle });
  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    return NextResponse.json({ error: 'فشل في جلب ملف المركبة' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth('VEHICLES_MANAGE');
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        plateNumber: body.plateNumber,
        departmentId: body.departmentId || null,
        assignedDriverId: body.assignedDriverId || null,
        status: body.status,
        ownershipType: body.ownershipType,
        notes: body.notes,
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE_VEHICLE',
      entityType: 'VEHICLE',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, vehicle: updated });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    console.error('Error updating vehicle:', error);
    return NextResponse.json({ error: 'فشل في تحديث بيانات المركبة' }, { status: 500 });
  }
}
