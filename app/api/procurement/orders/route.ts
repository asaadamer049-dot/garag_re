import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { supplier: { name: { contains: search } } },
      ];
    }

    const [purchaseOrders, purchaseRequests, goodsReceipts, suppliers, parts, warehouses] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: {
              part: true,
            },
          },
          goodsReceipts: {
            include: {
              warehouse: true,
              items: { include: { part: true } },
            },
          },
        },
        orderBy: { orderDate: 'desc' },
      }),
      prisma.purchaseRequest.findMany({
        include: {
          items: { include: { part: true } },
          department: true,
        },
        orderBy: { requestDate: 'desc' },
      }),
      prisma.goodsReceipt.findMany({
        include: {
          purchaseOrder: { include: { supplier: true } },
          warehouse: true,
          items: { include: { part: true } },
        },
        orderBy: { receiptDate: 'desc' },
      }),
      prisma.supplier.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.part.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
      prisma.warehouse.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const stats = {
      totalPOs: purchaseOrders.length,
      pendingDelivery: purchaseOrders.filter(po => ['ISSUED', 'PARTIALLY_RECEIVED'].includes(po.status)).length,
      completedPOs: purchaseOrders.filter(po => po.status === 'COMPLETED').length,
      totalSpend: purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
      totalRequests: purchaseRequests.length,
      totalReceipts: goodsReceipts.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        purchaseOrders,
        purchaseRequests,
        goodsReceipts,
        stats,
        suppliers,
        parts,
        warehouses,
      },
    });
  } catch (error: any) {
    console.error('Fetch procurement error:', error);
    return NextResponse.json({ error: error.message || 'فشل في جلب بيانات أوامر الشراء' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const action = body.action || 'create_po';

    // 1. ACTION: Create Purchase Order (أمر شراء رسمي)
    if (action === 'create_po') {
      const {
        supplierId,
        warehouseId,
        expectedDeliveryDate,
        items = [], // Array of { partId, quantity, unitPrice }
        notes,
      } = body;

      if (!supplierId || !items || items.length === 0) {
        return NextResponse.json({ error: 'المورد والأصناف المطلوبة حقول إلزامية' }, { status: 400 });
      }

      const count = await prisma.purchaseOrder.count();
      const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      // Calculate totals
      let subtotal = 0;
      const orderItemsData = items.map((it: any) => {
        const qty = parseFloat(it.quantity.toString()) || 1;
        const price = parseFloat(it.unitPrice.toString()) || 0;
        const lineTotal = qty * price;
        subtotal += lineTotal;
        return {
          partId: it.partId,
          quantity: qty,
          unitPrice: price,
          discountAmount: 0,
          taxAmount: lineTotal * 0.15,
          lineTotal,
        };
      });

      const taxAmount = subtotal * 0.15;
      const totalAmount = subtotal + taxAmount;

      const newPO = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId,
          orderDate: new Date(),
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          subtotal,
          taxAmount,
          totalAmount,
          status: 'ISSUED',
          createdBy: user?.fullName || 'إدارة المشتريات والعقود',
          items: {
            create: orderItemsData,
          },
        },
        include: {
          supplier: true,
          items: { include: { part: true } },
        },
      });

      if (user) {
        await logAuditEvent({
          userId: user.userId,
          action: 'CREATE_PURCHASE_ORDER',
          entityType: 'PURCHASE_ORDER',
          entityId: newPO.id,
          newValues: newPO,
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم إصدار أمر الشراء الرسمي برقم (${newPO.poNumber}) بنجاح`,
        data: newPO,
      });
    }

    // 2. ACTION: Receive Goods (فحص واستلام وتوريد للمخزون)
    if (action === 'receive_goods') {
      const {
        purchaseOrderId,
        warehouseId,
        items = [], // Array of { partId, receivedQuantity, unitCost }
        receivedBy,
        notes,
      } = body;

      if (!purchaseOrderId || !warehouseId || items.length === 0) {
        return NextResponse.json({ error: 'أمر الشراء والمستودع والأصناف المستلمة حقول مطلوبة' }, { status: 400 });
      }

      const po = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { supplier: true, items: true },
      });

      if (!po) {
        return NextResponse.json({ error: 'أمر الشراء غير موجود' }, { status: 404 });
      }

      const receiptCount = await prisma.goodsReceipt.count();
      const receiptNumber = `GR-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(4, '0')}`;

      // Transaction: create GoodsReceipt, increment StockBalance, create StockMovement
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Goods Receipt
        const goodsReceipt = await tx.goodsReceipt.create({
          data: {
            receiptNumber,
            purchaseOrderId,
            warehouseId,
            receiptDate: new Date(),
            status: 'APPROVED',
            receivedBy: receivedBy?.trim() || user?.fullName || 'أمين المستودع',
            items: {
              create: items.map((it: any) => ({
                partId: it.partId,
                orderedQuantity: parseFloat(it.orderedQuantity?.toString() || it.receivedQuantity?.toString()),
                receivedQuantity: parseFloat(it.receivedQuantity.toString()),
                rejectedQuantity: 0,
                unitCost: parseFloat(it.unitCost?.toString() || '0'),
              })),
            },
          },
          include: { items: true },
        });

        // 2. For each received item: update StockBalance & create StockMovement
        for (const it of items) {
          const qty = parseFloat(it.receivedQuantity.toString()) || 0;
          const cost = parseFloat(it.unitCost?.toString() || '0');

          if (qty > 0) {
            // Update / Upsert StockBalance
            await tx.stockBalance.upsert({
              where: {
                partId_warehouseId: {
                  partId: it.partId,
                  warehouseId,
                },
              },
              update: {
                quantityOnHand: { increment: qty },
              },
              create: {
                partId: it.partId,
                warehouseId,
                quantityOnHand: qty,
                quantityReserved: 0,
              },
            });

            // Create Official Stock Movement (RECEIPT)
            const mvtCount = await tx.stockMovement.count();
            await tx.stockMovement.create({
              data: {
                movementNumber: `RCV-PO-${Date.now().toString().slice(-4)}-${String(mvtCount + 1).padStart(3, '0')}`,
                movementType: 'RECEIPT',
                partId: it.partId,
                warehouseId,
                quantity: qty,
                unitCost: cost,
                referenceType: 'GOODS_RECEIPT',
                referenceId: `${po.poNumber} (${receiptNumber})`,
                status: 'CONFIRMED',
                createdBy: receivedBy || user?.fullName || 'أمين المستودع',
              },
            });
          }
        }

        // 3. Update Purchase Order Status to COMPLETED
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: 'COMPLETED' },
        });

        return goodsReceipt;
      });

      if (user) {
        await logAuditEvent({
          userId: user.userId,
          action: 'RECEIVE_GOODS_RECEIPT',
          entityType: 'GOODS_RECEIPT',
          entityId: result.id,
          newValues: result,
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم اعتماد إذن الاستلام المخزني (${result.receiptNumber}) وتوريد الأصناف وزيادة رصيد المستودع بنجاح`,
        data: result,
      });
    }

    // 3. ACTION: Create Purchase Request (طلب شراء داخلي)
    if (action === 'create_pr') {
      const {
        items = [], // Array of { partId, quantity, estimatedUnitPrice }
        justification,
        departmentId,
      } = body;

      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'الأصناف المطلوبة إلزامية' }, { status: 400 });
      }

      const count = await prisma.purchaseRequest.count();
      const requestNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const newPR = await prisma.purchaseRequest.create({
        data: {
          requestNumber,
          requestedBy: user?.fullName || 'مشرف الصيانة والورشة',
          departmentId: departmentId || null,
          justification: justification?.trim() || 'طلب شراء مواد وقطع غيار لتعويض حد الأمان للمخزون',
          status: 'PENDING',
          items: {
            create: items.map((it: any) => ({
              partId: it.partId,
              quantity: parseFloat(it.quantity.toString()) || 1,
              estimatedUnitPrice: parseFloat(it.estimatedUnitPrice?.toString() || '0'),
            })),
          },
        },
        include: {
          items: { include: { part: true } },
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم تسجيل طلب الشراء الداخلي برقم (${newPR.requestNumber}) بنجاح`,
        data: newPR,
      });
    }

    return NextResponse.json({ error: 'إجراء غير مدعوم' }, { status: 400 });
  } catch (error: any) {
    console.error('Procurement action error:', error);
    return NextResponse.json({ error: error.message || 'فشل في معالجة طلب المشتريات' }, { status: 500 });
  }
}

