import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Fetch all active vehicles with their vehicleType and their latest lubricant service
    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'ACTIVE' },
      include: {
        vehicleType: {
          include: {
            lubricantSpecs: {
              where: { systemName: 'ENGINE' },
              include: { lubricantProduct: true },
            },
          },
        },
        brandModel: true,
        assignedDriver: true,
        lubricantServices: {
          orderBy: { serviceDate: 'desc' },
          take: 1,
          include: {
            items: {
              include: { lubricantProduct: true },
            },
          },
        },
      },
      orderBy: { internalCode: 'asc' },
    });

    const now = new Date();

    const vehicleAlerts = vehicles.map((v) => {
      const latestService = v.lubricantServices[0] || null;
      const engineSpec = v.vehicleType?.lubricantSpecs[0] || null;

      // Default interval if no service or spec: 10,000 km, 90 days
      const intervalKm = engineSpec?.changeIntervalKm || 10000;
      const intervalDays = engineSpec?.changeIntervalDays || 90;

      let lastServiceOdo = 0;
      let lastServiceDate: Date | null = null;
      let nextDueOdo = 0;
      let nextDueDate: Date | null = null;

      if (latestService) {
        lastServiceOdo = latestService.odometerReading;
        lastServiceDate = latestService.serviceDate;
        nextDueOdo = latestService.nextDueOdometer || (lastServiceOdo + intervalKm);
        nextDueDate = latestService.nextDueDate || new Date(new Date(lastServiceDate).getTime() + intervalDays * 24 * 3600 * 1000);
      } else {
        // No recorded service yet: due after interval from current odometer or now
        lastServiceOdo = Math.max(0, v.currentOdometer - 3000); // estimate
        nextDueOdo = lastServiceOdo + intervalKm;
        nextDueDate = new Date(now.getTime() + 15 * 24 * 3600 * 1000);
      }

      const kmRemaining = Math.round(nextDueOdo - v.currentOdometer);
      const daysRemaining = nextDueDate
        ? Math.round((new Date(nextDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 30;

      // Status determination
      let status: 'OVERDUE' | 'DUE_SOON' | 'OK' = 'OK';
      let statusLabel = 'ساري وبحالة ممتازة';
      let urgencyScore = 1; // 1 = ok, 2 = due soon, 3 = overdue

      if (kmRemaining <= 0 || daysRemaining <= 0) {
        status = 'OVERDUE';
        statusLabel = 'تغيير مطلوب فوراً (متأخر)';
        urgencyScore = 3;
      } else if (kmRemaining <= 1000 || daysRemaining <= 15) {
        status = 'DUE_SOON';
        statusLabel = 'مستحق قريباً';
        urgencyScore = 2;
      }

      // Usage percentage
      const totalInterval = nextDueOdo - lastServiceOdo || intervalKm;
      const kmUsed = v.currentOdometer - lastServiceOdo;
      const usagePercent = Math.min(100, Math.max(0, Math.round((kmUsed / totalInterval) * 100)));

      return {
        vehicleId: v.id,
        internalCode: v.internalCode,
        plateNumber: v.plateNumber,
        modelName: `${v.brandModel?.brand || ''} ${v.brandModel?.model || ''}`.trim() || v.vehicleType?.name || 'مركبة',
        vehicleTypeName: v.vehicleType?.name || 'شاحنة',
        driverName: v.assignedDriver?.fullName || 'غير محدد',
        currentOdometer: v.currentOdometer,
        lastServiceOdo,
        lastServiceDate,
        nextDueOdo,
        nextDueDate,
        kmRemaining,
        daysRemaining,
        usagePercent,
        status,
        statusLabel,
        urgencyScore,
        recommendedOil: engineSpec?.lubricantProduct?.name || 'زيت محرك 15W-40 CI-4',
        recommendedQuantity: engineSpec?.requiredQuantity || 12,
      };
    });

    // Sort by urgency: OVERDUE first, then DUE_SOON, then OK
    vehicleAlerts.sort((a, b) => b.urgencyScore - a.urgencyScore || a.kmRemaining - b.kmRemaining);

    const counts = {
      totalVehicles: vehicleAlerts.length,
      overdue: vehicleAlerts.filter((v) => v.status === 'OVERDUE').length,
      dueSoon: vehicleAlerts.filter((v) => v.status === 'DUE_SOON').length,
      ok: vehicleAlerts.filter((v) => v.status === 'OK').length,
    };

    return NextResponse.json({
      success: true,
      counts,
      data: vehicleAlerts,
    });
  } catch (error: any) {
    console.error('Fetch alerts error:', error);
    return NextResponse.json({ error: error.message || 'فشل في احتساب تنبيهات الزيوت' }, { status: 500 });
  }
}

