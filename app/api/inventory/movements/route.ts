import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const warehouseId = searchParams.get('warehouseId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: any = {};
    if (type && type !== 'ALL') where.movementType = type;
    if (warehouseId) where.warehouseId = warehouseId;
    if (search) {
      where.OR = [
        { movementNumber: { contains: search } },
        { referenceType: { contains: search } },
        { referenceId: { contains: search } },
        { part: { name: { contains: search } } },
        { part: { partCode: { contains: search } } },
      ];
    }

    const [movements, total, parts, warehouses] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          part: {
            include: {
              category: true,
            },
          },
          warehouse: true,
        },
        orderBy: { movementDate: 'desc' },
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
      prisma.part.findMany({
        where: { isActive: true },
        include: {
          stockBalances: {
            include: { warehouse: true },
          },
          category: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.warehouse.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Statistics
    const allMovements = await prisma.stockMovement.findMany({ select: { movementType: true, quantity: true, unitCost: true } });
    const stats = {
      totalMovements: allMovements.length,
      receiptsCount: allMovements.filter(m => m.movementType === 'RECEIPT').length,
      issuesCount: allMovements.filter(m => m.movementType === 'ISSUE').length,
      adjustmentsCount: allMovements.filter(m => m.movementType === 'ADJUSTMENT').length,
      returnsCount: allMovements.filter(m => m.movementType === 'RETURN').length,
      transfersCount: allMovements.filter(m => m.movementType === 'TRANSFER').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        movements,
        total,
        stats,
        parts,
        warehouses,
      },
    });
  } catch (error: any) {
    console.error('Fetch stock movements error:', error);
    return NextResponse.json({ error: error.message || 'فشل في جلب حركات المخزون' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      movementType, // RECEIPT, ISSUE, ADJUSTMENT, RETURN, TRANSFER
      partId,
      warehouseId,
      targetWarehouseId, // Used for TRANSFER
      quantity,
      unitCost = 0,
      referenceType = 'MANUAL_VOUCHER',
      referenceId,
      notes,
    } = body;

    if (!movementType || !partId || !warehouseId || !quantity) {
      return NextResponse.json(
        { error: 'نوع الحركة، الصنف، المستودع، والكمية حقول إلزامية' },
        { status: 400 }
      );
    }

    const qty = parseFloat(quantity.toString());
    if (qty <= 0) {
      return NextResponse.json({ error: 'الكمية يجب أن تكون أكبر من الصفر' }, { status: 400 });
    }

    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) {
      return NextResponse.json({ error: 'الصنف المحدد غير موجود' }, { status: 404 });
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      return NextResponse.json({ error: 'المستودع المحدد غير موجود' }, { status: 404 });
    }

    // Get current stock balance
    const currentStock = await prisma.stockBalance.findUnique({
      where: {
        partId_warehouseId: {
          partId,
          warehouseId,
        },
      },
    });

    const currentQtyOnHand = currentStock ? currentStock.quantityOnHand : 0;

    // Check availability for ISSUE
    if (movementType === 'ISSUE' || movementType === 'TRANSFER') {
      if (currentQtyOnHand < qty) {
        return NextResponse.json(
          {
            error: `رصيد الصنف الحالي بالمستودع (${currentQtyOnHand} ${part.unitOfMeasure}) غير كافٍ لصرف كمية (${qty} ${part.unitOfMeasure})`,
          },
          { status: 400 }
        );
      }
    }

    // Generate movement number
    const count = await prisma.stockMovement.count();
    const prefix =
      movementType === 'RECEIPT'
        ? 'RCV'
        : movementType === 'ISSUE'
        ? 'ISS'
        : movementType === 'ADJUSTMENT'
        ? 'ADJ'
        : movementType === 'RETURN'
        ? 'RET'
        : 'TRF';
    const movementNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Perform updates in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update primary warehouse stock balance
      if (movementType === 'RECEIPT' || movementType === 'RETURN') {
        await tx.stockBalance.upsert({
          where: { partId_warehouseId: { partId, warehouseId } },
          update: { quantityOnHand: { increment: qty } },
          create: { partId, warehouseId, quantityOnHand: qty, quantityReserved: 0 },
        });
      } else if (movementType === 'ISSUE') {
        await tx.stockBalance.update({
          where: { partId_warehouseId: { partId, warehouseId } },
          data: { quantityOnHand: { decrement: qty } },
        });
      } else if (movementType === 'ADJUSTMENT') {
        // In adjustment, body.adjustmentMode can be 'NEW_BALANCE' or 'DIFFERENCE'
        const newBalance = body.newTargetBalance !== undefined ? parseFloat(body.newTargetBalance.toString()) : currentQtyOnHand + qty;
        await tx.stockBalance.upsert({
          where: { partId_warehouseId: { partId, warehouseId } },
          update: { quantityOnHand: newBalance },
          create: { partId, warehouseId, quantityOnHand: newBalance, quantityReserved: 0 },
        });
      } else if (movementType === 'TRANSFER') {
        if (!targetWarehouseId || targetWarehouseId === warehouseId) {
          throw new Error('يرجى تحديد مستودع وجهة مختلف لعملية التحويل');
        }
        // Deduct from source
        await tx.stockBalance.update({
          where: { partId_warehouseId: { partId, warehouseId } },
          data: { quantityOnHand: { decrement: qty } },
        });
        // Add to target
        await tx.stockBalance.upsert({
          where: { partId_warehouseId: { partId, warehouseId: targetWarehouseId } },
          update: { quantityOnHand: { increment: qty } },
          create: { partId, warehouseId: targetWarehouseId, quantityOnHand: qty, quantityReserved: 0 },
        });
      }

      // 2. Create StockMovement record
      const createdMovement = await tx.stockMovement.create({
        data: {
          movementNumber,
          movementType,
          partId,
          warehouseId,
          quantity: qty,
          unitCost: parseFloat(unitCost.toString()) || 0,
          referenceType: referenceType || 'MANUAL_VOUCHER',
          referenceId: referenceId?.trim() || notes?.trim() || null,
          movementDate: body.movementDate ? new Date(body.movementDate) : new Date(),
          status: 'CONFIRMED',
          createdBy: user?.fullName || 'أمين المستودع',
        },
        include: {
          part: true,
          warehouse: true,
        },
      });

      return createdMovement;
    });

    if (user) {
      await logAuditEvent({
        userId: user.userId,
        action: `CREATE_STOCK_MOVEMENT_${movementType}`,
        entityType: 'STOCK_MOVEMENT',
        entityId: result.id,
        newValues: result,
      });
    }

    const typeArabic =
      movementType === 'RECEIPT'
        ? 'إذن استلام مخزني'
        : movementType === 'ISSUE'
        ? 'إذن صرف مخزني'
        : movementType === 'ADJUSTMENT'
        ? 'إذن تسوية جردية'
        : movementType === 'RETURN'
        ? 'إذن إرجاع مخزني'
        : 'إذن تحويل بين مستودعات';

    return NextResponse.json({
      success: true,
      message: `تم اعتماد وتوثيق ${typeArabic} برقم (${result.movementNumber}) وتحديث الرصيد بالمستودع بنجاح`,
      data: result,
    });
  } catch (error: any) {
    console.error('Create stock movement error:', error);
    return NextResponse.json({ error: error.message || 'فشل في تسجيل الحركة المخزنية' }, { status: 500 });
  }
}

