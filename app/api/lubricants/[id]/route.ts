import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.lubricantProduct.findUnique({
      where: { id },
      include: {
        specs: {
          include: {
            vehicleType: true,
          },
        },
        serviceItems: {
          take: 10,
          include: {
            lubricantService: {
              include: {
                vehicle: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'فشل في جلب بيانات المنتج' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await req.json();

    const existing = await prisma.lubricantProduct.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
    }

    const {
      name,
      lubricantType,
      brand,
      viscosityGrade,
      specification,
      oilBase,
      defaultIntervalKm,
      defaultIntervalDays,
      approxCost,
      unitOfMeasure,
      isActive,
    } = body;

    const updated = await prisma.lubricantProduct.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(lubricantType && { lubricantType }),
        brand: brand !== undefined ? brand?.trim() || null : existing.brand,
        viscosityGrade: viscosityGrade !== undefined ? viscosityGrade?.trim() || null : existing.viscosityGrade,
        specification: specification !== undefined ? specification?.trim() || null : existing.specification,
        oilBase: oilBase !== undefined ? oilBase : existing.oilBase,
        defaultIntervalKm: defaultIntervalKm !== undefined ? parseInt(defaultIntervalKm.toString(), 10) : existing.defaultIntervalKm,
        defaultIntervalDays: defaultIntervalDays !== undefined ? parseInt(defaultIntervalDays.toString(), 10) : existing.defaultIntervalDays,
        approxCost: approxCost !== undefined ? parseFloat(approxCost.toString()) : existing.approxCost,
        unitOfMeasure: unitOfMeasure || existing.unitOfMeasure,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    if (user) {
      await logAuditEvent({
        userId: user.userId,
        action: 'UPDATE_LUBRICANT_PRODUCT',
        entityType: 'LUBRICANT_PRODUCT',
        entityId: id,
        oldValues: existing,
        newValues: updated,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات الصنف بنجاح',
      data: updated,
    });
  } catch (error: any) {
    console.error('Update lubricant error:', error);
    return NextResponse.json({ error: error.message || 'فشل في تحديث المنتج' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    // Check if used in service items
    const usedCount = await prisma.lubricantServiceItem.count({
      where: { lubricantProductId: id },
    });
    if (usedCount > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف هذا الصنف لارتباطه بـ (${usedCount}) عمليات تغيير زيوت مسجلة. يمكنك تعطيله بدلاً من ذلك.` },
        { status: 400 }
      );
    }

    const existing = await prisma.lubricantProduct.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
    }

    await prisma.lubricantProduct.delete({ where: { id } });

    if (user) {
      await logAuditEvent({
        userId: user.userId,
        action: 'DELETE_LUBRICANT_PRODUCT',
        entityType: 'LUBRICANT_PRODUCT',
        entityId: id,
        oldValues: existing,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الصنف بنجاح',
    });
  } catch (error: any) {
    console.error('Delete lubricant error:', error);
    return NextResponse.json({ error: error.message || 'فشل في حذف المنتج' }, { status: 500 });
  }
}

