import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleTypeId = searchParams.get('vehicleTypeId');
    const systemName = searchParams.get('systemName');

    const where: any = {};
    if (vehicleTypeId) where.vehicleTypeId = vehicleTypeId;
    if (systemName) where.systemName = systemName;

    const specs = await prisma.vehicleLubricantSpec.findMany({
      where,
      include: {
        vehicleType: true,
        lubricantProduct: true,
      },
      orderBy: [{ vehicleTypeId: 'asc' }, { systemName: 'asc' }],
    });

    const vehicleTypes = await prisma.vehicleType.findMany({
      orderBy: { name: 'asc' },
    });

    const products = await prisma.lubricantProduct.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: specs,
      meta: {
        vehicleTypes,
        products,
      },
    });
  } catch (error: any) {
    console.error('Fetch specs error:', error);
    return NextResponse.json({ error: error.message || 'فشل في جلب مواصفات الزيوت' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      vehicleTypeId,
      lubricantProductId,
      systemName,
      requiredQuantity,
      changeIntervalKm,
      changeIntervalDays,
      notes,
    } = body;

    if (!vehicleTypeId || !lubricantProductId || !systemName) {
      return NextResponse.json(
        { error: 'نوع المركبة وصنف الزيت/الفلتر والنظام حقول مطلوبة' },
        { status: 400 }
      );
    }

    const newSpec = await prisma.vehicleLubricantSpec.create({
      data: {
        vehicleTypeId,
        lubricantProductId,
        systemName,
        requiredQuantity: parseFloat(requiredQuantity.toString()) || 1,
        changeIntervalKm: parseInt(changeIntervalKm.toString(), 10) || 10000,
        changeIntervalDays: parseInt(changeIntervalDays.toString(), 10) || 90,
        notes: notes?.trim() || null,
      },
      include: {
        vehicleType: true,
        lubricantProduct: true,
      },
    });

    if (user) {
      await logAuditEvent({
        userId: user.userId,
        action: 'CREATE_VEHICLE_LUBRICANT_SPEC',
        entityType: 'VEHICLE_LUBRICANT_SPEC',
        entityId: newSpec.id,
        newValues: newSpec,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم حفظ مواصفة التزييت المعيارية بنجاح',
      data: newSpec,
    });
  } catch (error: any) {
    console.error('Create spec error:', error);
    return NextResponse.json({ error: error.message || 'فشل في حفظ المواصفة' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    }

    await prisma.vehicleLubricantSpec.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'تم حذف المواصفة المعيارية بنجاح',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'فشل في حذف المواصفة' }, { status: 500 });
  }
}

