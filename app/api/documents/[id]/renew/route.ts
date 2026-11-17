import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth('VEHICLES_MANAGE');
    const { id } = await params;
    const body = await req.json();

    const {
      newExpiryDate,
      fees = 0,
      insuranceCost = 0,
      inspectionCost = 0,
      receiptNumber,
      notes,
    } = body;

    if (!newExpiryDate) {
      return NextResponse.json({ error: 'تاريخ الانتهاء الجديد مطلوب' }, { status: 400 });
    }

    const doc = await prisma.vehicleDocument.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!doc) {
      return NextResponse.json({ error: 'الوثيقة غير موجودة' }, { status: 404 });
    }

    const renewal = await prisma.$transaction(async (tx) => {
      // 1. Create Renewal Record
      const createdRenewal = await tx.vehicleDocumentRenewal.create({
        data: {
          vehicleDocumentId: id,
          renewalDate: new Date(),
          previousExpiryDate: doc.expiryDate,
          newExpiryDate: new Date(newExpiryDate),
          fees: parseFloat(fees) || 0,
          insuranceCost: parseFloat(insuranceCost) || 0,
          inspectionCost: parseFloat(inspectionCost) || 0,
          receiptNumber: receiptNumber || null,
          notes: notes || null,
          status: 'COMPLETED',
        },
      });

      // 2. Update Document Expiry Date & Status
      await tx.vehicleDocument.update({
        where: { id },
        data: {
          expiryDate: new Date(newExpiryDate),
          status: 'ACTIVE',
        },
      });

      // 3. Record in Expenses
      const totalRenewalCost =
        (parseFloat(fees) || 0) +
        (parseFloat(insuranceCost) || 0) +
        (parseFloat(inspectionCost) || 0);

      if (totalRenewalCost > 0) {
        let category = await tx.expenseCategory.findFirst({ where: { code: 'EXP-DOCS' } });
        if (!category) {
          category = await tx.expenseCategory.create({
            data: { code: 'EXP-DOCS', name: 'رسوم التراخيص والتأمين والفحص' },
          });
        }

        const count = await tx.expense.count();
        const expenseNumber = `EXP-REN-${Date.now().toString().slice(-6)}`;

        await tx.expense.create({
          data: {
            expenseNumber,
            vehicleId: doc.vehicleId,
            expenseCategoryId: category.id,
            description: `تجديد ${doc.documentType === 'REGISTRATION' ? 'رخصة سير' : doc.documentType === 'INSURANCE' ? 'وثيقة تأمين' : 'فحص دوري'} للمركبة ${doc.vehicle.internalCode}`,
            subtotal: totalRenewalCost,
            totalAmount: totalRenewalCost,
            sourceType: 'DOCUMENT_RENEWAL',
            sourceId: createdRenewal.id,
            paymentStatus: 'PAID',
            createdBy: user.fullName,
            approvedBy: user.fullName,
            approvedAt: new Date(),
          },
        });
      }

      return createdRenewal;
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'RENEW_VEHICLE_DOCUMENT',
      entityType: 'VEHICLE_DOCUMENT',
      entityId: id,
      newValues: renewal,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, renewal });
  } catch (error: any) {
    console.error('Renew document error:', error);
    return NextResponse.json({ error: 'فشل في تجديد الوثيقة' }, { status: 500 });
  }
}
