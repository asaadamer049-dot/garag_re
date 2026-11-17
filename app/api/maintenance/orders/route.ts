import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const vehicleId = searchParams.get('vehicleId');

    const where: any = {};
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (vehicleId) where.vehicleId = vehicleId;

    const orders = await prisma.maintenanceOrder.findMany({
      where,
      include: {
        vehicle: {
          include: { brandModel: true },
        },
        supplier: true,
        tasks: true,
        parts: {
          include: { part: true, warehouse: true },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error('Fetch maintenance orders error:', error);
    return NextResponse.json({ error: 'فشل في جلب أوامر الصيانة' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('MAINTENANCE_CREATE');
    const body = await req.json();

    const {
      vehicleId,
      orderType,
      priority,
      complaint,
      diagnosis,
      odometerReading,
      workshopType,
      supplierId,
      assignedTo,
      tasks = [],
      parts = [],
      externalServiceCost = 0,
      otherCost = 0,
      notes,
    } = body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    // Generate Unique Order Number: MO-YYYYMM-XXXX
    const count = await prisma.maintenanceOrder.count();
    const orderNumber = `MO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.$transaction(async (tx) => {
      // 1. Calculate labor cost
      let totalLaborCost = 0;
      for (const t of tasks) {
        totalLaborCost += parseFloat(t.laborCost) || 0;
      }

      // 2. Create the maintenance order
      const newOrder = await tx.maintenanceOrder.create({
        data: {
          orderNumber,
          vehicleId,
          orderType: orderType || 'PERIODIC',
          priority: priority || 'MEDIUM',
          complaint,
          diagnosis,
          odometerReading: parseFloat(odometerReading) || vehicle.currentOdometer,
          workshopType: workshopType || 'INTERNAL',
          supplierId: supplierId || null,
          assignedTo: assignedTo || null,
          status: 'APPROVED',
          laborCost: totalLaborCost,
          externalServiceCost: parseFloat(externalServiceCost) || 0,
          otherCost: parseFloat(otherCost) || 0,
          notes,
          createdBy: user.fullName,
          approvedBy: user.fullName,
          approvedAt: new Date(),
        },
      });

      // 3. Create tasks
      if (tasks.length > 0) {
        await tx.maintenanceOrderTask.createMany({
          data: tasks.map((t: any) => ({
            maintenanceOrderId: newOrder.id,
            taskName: t.taskName,
            taskStatus: 'COMPLETED',
            laborCost: parseFloat(t.laborCost) || 0,
            notes: t.notes || null,
          })),
        });
      }

      // 4. Issue and link parts from inventory
      for (const p of parts) {
        const qty = parseFloat(p.quantity);
        const unitCost = parseFloat(p.unitCost);

        // Check stock balance
        const balance = await tx.stockBalance.findUnique({
          where: {
            partId_warehouseId: {
              partId: p.partId,
              warehouseId: p.warehouseId,
            },
          },
        });

        if (!balance || balance.quantityOnHand < qty) {
          throw new Error(`الرصيد المتاح من الصنف غير كافٍ في المخزن المحدد (المتاح: ${balance?.quantityOnHand || 0})`);
        }

        // Deduct inventory
        await tx.stockBalance.update({
          where: {
            partId_warehouseId: {
              partId: p.partId,
              warehouseId: p.warehouseId,
            },
          },
          data: {
            quantityOnHand: { decrement: qty },
          },
        });

        // Record stock movement
        const movNumber = `SM-ISSUE-${Date.now().toString().slice(-6)}`;
        const movement = await tx.stockMovement.create({
          data: {
            movementNumber: movNumber,
            movementType: 'ISSUE',
            partId: p.partId,
            warehouseId: p.warehouseId,
            quantity: qty,
            unitCost,
            referenceType: 'MAINTENANCE_ORDER',
            referenceId: newOrder.id,
            status: 'CONFIRMED',
            createdBy: user.fullName,
            approvedBy: user.fullName,
          },
        });

        // Add to order parts
        await tx.maintenanceOrderPart.create({
          data: {
            maintenanceOrderId: newOrder.id,
            partId: p.partId,
            warehouseId: p.warehouseId,
            quantity: qty,
            unitCost,
            stockIssueId: movement.id,
          },
        });
      }

      // 5. Update vehicle status
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: 'ACTIVE',
          currentOdometer: Math.max(vehicle.currentOdometer, parseFloat(odometerReading) || 0),
          odometerUpdatedAt: new Date(),
        },
      });

      // 6. Record Status History
      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceOrderId: newOrder.id,
          oldStatus: 'DRAFT',
          newStatus: 'APPROVED',
          changedBy: user.fullName,
          reason: 'اعتماد وبدء أمر الصيانة الفنية',
        },
      });

      return newOrder;
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE_MAINTENANCE_ORDER',
      entityType: 'MAINTENANCE_ORDER',
      entityId: order.id,
      newValues: order,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    if (error.message?.includes('الرصيد المتاح')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Maintenance order creation error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء أمر الصيانة' }, { status: 500 });
  }
}
