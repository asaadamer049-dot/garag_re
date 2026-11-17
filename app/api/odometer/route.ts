import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('ODOMETER_LOG');
    const { vehicleId, readingValue, sourceType, notes, isCorrection } = await req.json();

    const val = parseFloat(readingValue);
    if (!vehicleId || isNaN(val) || val <= 0) {
      return NextResponse.json({ error: 'قيمة العداد غير صالحة' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    // Odometer anomaly checks
    if (val < vehicle.currentOdometer && !isCorrection) {
      return NextResponse.json(
        {
          error: `القراءة المدخلة (${val} كم) أقل من قراءة العداد الحالية المسجلة (${vehicle.currentOdometer} كم). لا يمكن التجاوز إلا بإجراء تصحيح مصرح.`,
          isAnomaly: true,
        },
        { status: 422 }
      );
    }

    // High jump check (e.g. jumping more than 10,000 km in a single entry without confirmation)
    if (val - vehicle.currentOdometer > 15000 && !isCorrection) {
      return NextResponse.json(
        {
          error: `فارق القراءة كبير جداً (+${(val - vehicle.currentOdometer).toLocaleString()} كم). يرجى التأكيد والتثبت قبل الاعتماد.`,
          isSuspicious: true,
        },
        { status: 422 }
      );
    }

    const reading = await prisma.$transaction(async (tx) => {
      const record = await tx.vehicleOdometerReading.create({
        data: {
          vehicleId,
          readingValue: val,
          sourceType: sourceType || 'MANUAL',
          recordedBy: user.fullName,
          notes: notes || (isCorrection ? 'إجراء تصحيح معتمد لقراءة العداد' : null),
        },
      });

      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentOdometer: val,
          odometerUpdatedAt: new Date(),
        },
      });

      return record;
    });

    await logAuditEvent({
      userId: user.userId,
      action: isCorrection ? 'CORRECT_ODOMETER' : 'LOG_ODOMETER',
      entityType: 'ODOMETER',
      entityId: reading.id,
      oldValues: { previousOdometer: vehicle.currentOdometer },
      newValues: { newOdometer: val },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, reading });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'غير مصرح بتسجيل قراءات العداد' }, { status: 403 });
    }
    console.error('Odometer logging error:', error);
    return NextResponse.json({ error: 'فشل في حفظ قراءة العداد' }, { status: 500 });
  }
}
