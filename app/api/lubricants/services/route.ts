import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;

    const services = await prisma.lubricantService.findMany({
      where,
      include: {
        vehicle: {
          include: {
            brandModel: true,
            vehicleType: true,
            assignedDriver: true,
          },
        },
        items: {
          include: {
            lubricantProduct: true,
          },
        },
        maintenanceOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: { serviceDate: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: services,
    });
  } catch (error: any) {
    console.error('Fetch services error:', error);
    return NextResponse.json({ error: error.message || 'فشل في جلب سجلات تغيير الزيوت' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      vehicleId,
      odometerReading,
      serviceDate,
      performedBy,
      notes,
      items = [], // Array of { lubricantProductId, quantity, unitCost }
      intervalKm,
      intervalDays,
    } = body;

    if (!vehicleId || !odometerReading) {
      return NextResponse.json(
        { error: 'اختيار المركبة وقراءة العداد الحالي حقول إلزامية' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'يرجى تحديد صنف واحد على الأقل من الزيوت أو الفلاتر المنفذة' },
        { status: 400 }
      );
    }

    const currentOdo = parseFloat(odometerReading.toString());
    const sDate = serviceDate ? new Date(serviceDate) : new Date();

    // Determine the interval: use passed intervalKm, or fetch the lowest/recommended interval from the used products
    let nextOdo = 0;
    let nextDate: Date | null = null;

    let targetIntervalKm = intervalKm ? parseInt(intervalKm.toString(), 10) : 0;
    let targetIntervalDays = intervalDays ? parseInt(intervalDays.toString(), 10) : 0;

    if (!targetIntervalKm || !targetIntervalDays) {
      // Find default interval from the products included
      const pIds = items.map((it: any) => it.lubricantProductId);
      const prods = await prisma.lubricantProduct.findMany({
        where: { id: { in: pIds } },
      });

      // Filter for engine oil interval if present, else minimum interval
      const engineOil = prods.find(p => p.lubricantType === 'ENGINE_OIL');
      if (engineOil) {
        targetIntervalKm = engineOil.defaultIntervalKm || 10000;
        targetIntervalDays = engineOil.defaultIntervalDays || 90;
      } else {
        targetIntervalKm = Math.min(...prods.map(p => p.defaultIntervalKm || 10000));
        targetIntervalDays = Math.min(...prods.map(p => p.defaultIntervalDays || 90));
      }
    }

    nextOdo = currentOdo + targetIntervalKm;
    nextDate = new Date(sDate.getTime() + targetIntervalDays * 24 * 60 * 60 * 1000);

    // Calculate total cost
    let totalCost = 0;
    for (const it of items) {
      const q = parseFloat(it.quantity?.toString() || '1');
      const c = parseFloat(it.unitCost?.toString() || '0');
      totalCost += q * c;
    }

    // Auto generate service number
    const count = await prisma.lubricantService.count();
    const serviceNumber = `LUBE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newService = await prisma.lubricantService.create({
      data: {
        serviceNumber,
        vehicleId,
        serviceDate: sDate,
        odometerReading: currentOdo,
        nextDueOdometer: nextOdo,
        nextDueDate: nextDate,
        performedBy: performedBy?.trim() || 'فني الصيانة السريعة',
        totalCost,
        notes: notes?.trim() || null,
        items: {
          create: items.map((it: any) => ({
            lubricantProductId: it.lubricantProductId,
            quantity: parseFloat(it.quantity.toString()) || 1,
            unitCost: parseFloat(it.unitCost?.toString() || '0'),
          })),
        },
      },
      include: {
        vehicle: true,
        items: {
          include: {
            lubricantProduct: true,
          },
        },
      },
    });

    // Deduct stock for each item from the warehouse
    const primaryWarehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
    if (primaryWarehouse) {
      for (const it of items) {
        const prod = await prisma.lubricantProduct.findUnique({
          where: { id: it.lubricantProductId },
          include: { part: true },
        });
        if (prod?.partId) {
          const qty = parseFloat(it.quantity.toString()) || 1;
          await prisma.stockBalance.updateMany({
            where: {
              partId: prod.partId,
              warehouseId: primaryWarehouse.id,
            },
            data: {
              quantityOnHand: {
                decrement: qty,
              },
            },
          });

          await prisma.stockMovement.create({
            data: {
              movementNumber: `ISS-${serviceNumber}-${prod.productCode}`,
              movementType: 'ISSUE',
              partId: prod.partId,
              warehouseId: primaryWarehouse.id,
              quantity: qty,
              unitCost: parseFloat(it.unitCost?.toString() || '0'),
              referenceType: 'LUBRICANT_SERVICE',
              referenceId: newService.id,
              status: 'CONFIRMED',
              createdBy: performedBy || user?.fullName || 'ورشة الصيانة السريعة',
            },
          });
        }
      }
    }

    // Also update vehicle's current odometer if this reading is higher
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (vehicle && currentOdo > vehicle.currentOdometer) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { currentOdometer: currentOdo },
      });
    }

    if (user) {
      await logAuditEvent({
        userId: user.userId,
        action: 'RECORD_LUBRICANT_SERVICE',
        entityType: 'LUBRICANT_SERVICE',
        entityId: newService.id,
        newValues: newService,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل عملية تغيير الزيت والفلاتر واحتساب موعد الاستحقاق القادم بنجاح',
      data: newService,
    });
  } catch (error: any) {
    console.error('Create lubricant service error:', error);
    return NextResponse.json({ error: error.message || 'فشل في تسجيل عملية تغيير الزيت' }, { status: 500 });
  }
}

