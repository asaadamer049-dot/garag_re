import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;

    const transactions = await prisma.fuelTransaction.findMany({
      where,
      include: {
        vehicle: { include: { brandModel: true } },
        supplier: true,
        driver: true,
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });

    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error('Fetch fuel transactions error:', error);
    return NextResponse.json({ error: 'فشل في جلب سجلات الوقود' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('FUEL_LOG');
    const body = await req.json();

    const {
      vehicleId,
      fuelType,
      odometerReading,
      quantityLiters,
      unitPrice,
      totalAmount,
      supplierId,
      stationName,
      invoiceNumber,
      driverId,
      paymentMethod,
      notes,
    } = body;

    const currentOdo = parseFloat(odometerReading);
    const liters = parseFloat(quantityLiters);
    const pricePerLiter = parseFloat(unitPrice);
    const total = parseFloat(totalAmount) || liters * pricePerLiter;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        fuelTransactions: {
          orderBy: { odometerReading: 'desc' },
          take: 1,
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    if (currentOdo < vehicle.currentOdometer) {
      return NextResponse.json(
        {
          error: `قراءة العداد الحالية (${currentOdo} كم) أقل من عداد المركبة المسجل (${vehicle.currentOdometer} كم).`,
        },
        { status: 400 }
      );
    }

    const count = await prisma.fuelTransaction.count();
    const transactionNumber = `FL-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Record Fuel Transaction
      const fuelRecord = await tx.fuelTransaction.create({
        data: {
          transactionNumber,
          vehicleId,
          fuelType: fuelType || vehicle.fuelType,
          odometerReading: currentOdo,
          quantityLiters: liters,
          unitPrice: pricePerLiter,
          totalAmount: total,
          supplierId: supplierId || null,
          stationName: stationName || null,
          invoiceNumber: invoiceNumber || null,
          driverId: driverId || vehicle.assignedDriverId || null,
          paymentMethod: paymentMethod || 'CARD',
          status: 'APPROVED',
          createdBy: user.fullName,
          approvedBy: user.fullName,
          notes,
        },
      });

      // 2. Update Vehicle Odometer
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentOdometer: currentOdo,
          odometerUpdatedAt: new Date(),
        },
      });

      // 3. Record in Odometer History
      await tx.vehicleOdometerReading.create({
        data: {
          vehicleId,
          readingValue: currentOdo,
          sourceType: 'FUEL',
          sourceReferenceId: fuelRecord.id,
          recordedBy: user.fullName,
          notes: `تسجيل وقود (${liters} لتر بمحطة ${stationName || 'عامة'})`,
        },
      });

      // 4. Calculate Distance and Fuel Efficiency
      const previousFuel = vehicle.fuelTransactions[0];
      if (previousFuel && currentOdo > previousFuel.odometerReading) {
        const distance = currentOdo - previousFuel.odometerReading;
        const consumptionPer100km = (liters / distance) * 100;
        const costPerKm = total / distance;

        const currentMonth = new Date().toISOString().slice(0, 7); // e.g. 2026-10

        await tx.fuelMonthlySummary.upsert({
          where: {
            vehicleId_yearMonth: {
              vehicleId,
              yearMonth: currentMonth,
            },
          },
          update: {
            totalLiters: { increment: liters },
            totalCost: { increment: total },
            distanceTraveled: { increment: distance },
            consumptionPer100km,
            costPerKm,
            calculationStatus: 'VALID',
          },
          create: {
            vehicleId,
            yearMonth: currentMonth,
            totalLiters: liters,
            totalCost: total,
            distanceTraveled: distance,
            consumptionPer100km,
            costPerKm,
            calculationStatus: 'VALID',
          },
        });
      }

      return fuelRecord;
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'LOG_FUEL',
      entityType: 'FUEL_TRANSACTION',
      entityId: transaction.id,
      newValues: transaction,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    console.error('Fuel transaction error:', error);
    return NextResponse.json({ error: 'فشل في حفظ معاملة الوقود' }, { status: 500 });
  }
}
