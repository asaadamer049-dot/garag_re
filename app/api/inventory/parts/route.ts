import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { partCode: { contains: search } },
        { name: { contains: search } },
        { partNumber: { contains: search } },
      ];
    }

    const [parts, categories, warehouses] = await Promise.all([
      prisma.part.findMany({
        where,
        include: {
          category: true,
          stockBalances: {
            include: { warehouse: true },
          },
        },
        orderBy: { partCode: 'asc' },
      }),
      prisma.partCategory.findMany(),
      prisma.warehouse.findMany({ where: { isActive: true } }),
    ]);

    return NextResponse.json({ data: { parts, categories, warehouses } });
  } catch (error) {
    console.error('Fetch inventory parts error:', error);
    return NextResponse.json({ error: 'فشل في جلب دليل قطع الغيار' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('INVENTORY_RECEIVE');
    const body = await req.json();

    const {
      partCode,
      name,
      categoryId,
      manufacturer,
      partNumber,
      unitOfMeasure,
      minimumStock,
      initialWarehouseId,
      initialQuantity,
      initialUnitCost,
    } = body;

    const existing = await prisma.part.findUnique({ where: { partCode } });
    if (existing) {
      return NextResponse.json({ error: 'كود الصنف مستخدم مسبقاً' }, { status: 400 });
    }

    const part = await prisma.$transaction(async (tx) => {
      const created = await tx.part.create({
        data: {
          partCode,
          name,
          categoryId,
          manufacturer,
          partNumber,
          unitOfMeasure: unitOfMeasure || 'PCS',
          minimumStock: parseFloat(minimumStock) || 5,
        },
      });

      if (initialWarehouseId && parseFloat(initialQuantity) > 0) {
        const qty = parseFloat(initialQuantity);
        const cost = parseFloat(initialUnitCost) || 0;

        await tx.stockBalance.create({
          data: {
            partId: created.id,
            warehouseId: initialWarehouseId,
            quantityOnHand: qty,
            quantityReserved: 0,
          },
        });

        await tx.stockMovement.create({
          data: {
            movementNumber: `SM-INIT-${Date.now().toString().slice(-6)}`,
            movementType: 'RECEIPT',
            partId: created.id,
            warehouseId: initialWarehouseId,
            quantity: qty,
            unitCost: cost,
            referenceType: 'OPENING_BALANCE',
            status: 'CONFIRMED',
            createdBy: user.fullName,
            approvedBy: user.fullName,
          },
        });
      }

      return created;
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE_PART',
      entityType: 'PART',
      entityId: part.id,
      newValues: part,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, part });
  } catch (error: any) {
    console.error('Create part error:', error);
    return NextResponse.json({ error: 'فشل في حفظ الصنف' }, { status: 500 });
  }
}
