import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');
    const documentType = searchParams.get('documentType');

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (documentType) where.documentType = documentType;

    const [documents, vehicles] = await Promise.all([
      prisma.vehicleDocument.findMany({
        where,
        include: {
          vehicle: {
            include: { brandModel: true },
          },
          renewals: {
            orderBy: { renewalDate: 'desc' },
          },
        },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.vehicle.findMany({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: { internalCode: 'asc' },
      }),
    ]);

    return NextResponse.json({
      data: {
        documents,
        vehicles,
      },
    });
  } catch (error) {
    console.error('Fetch documents error:', error);
    return NextResponse.json({ error: 'فشل في جلب التراخيص والمستندات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('VEHICLES_MANAGE');
    const body = await req.json();

    const {
      vehicleId,
      documentType,
      documentNumber,
      issueDate,
      expiryDate,
      issuingAuthority,
      notes,
      fees = 0,
      recordExpense = false,
    } = body;

    if (!vehicleId || !documentType || !documentNumber || !issueDate || !expiryDate) {
      return NextResponse.json(
        { error: 'المركبة، نوع الوثيقة، رقم الوثيقة، تاريخ الإصدار، وتاريخ الانتهاء حقول إلزامية' },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicleDocument.create({
        data: {
          vehicleId,
          documentType,
          documentNumber,
          issueDate: new Date(issueDate),
          expiryDate: new Date(expiryDate),
          issuingAuthority: issuingAuthority || null,
          notes: notes || null,
          status: 'ACTIVE',
        },
      });

      // Optionally record financial expense for fees
      const feesAmount = parseFloat(fees) || 0;
      if (recordExpense && feesAmount > 0) {
        let category = await tx.expenseCategory.findFirst({ where: { code: 'EXP-DOCS' } });
        if (!category) {
          category = await tx.expenseCategory.create({
            data: { code: 'EXP-DOCS', name: 'رسوم التراخيص والتأمين والفحص' },
          });
        }

        const count = await tx.expense.count();
        const expenseNumber = `EXP-DOC-${Date.now().toString().slice(-6)}`;

        await tx.expense.create({
          data: {
            expenseNumber,
            vehicleId,
            expenseCategoryId: category.id,
            description: `رسوم استخراج ${documentType === 'REGISTRATION' ? 'رخصة سير' : documentType === 'INSURANCE' ? 'تأمين' : 'فحص دوري'} رقم (${documentNumber})`,
            subtotal: feesAmount,
            totalAmount: feesAmount,
            sourceType: 'DOCUMENT_ISSUANCE',
            sourceId: created.id,
            paymentStatus: 'PAID',
            createdBy: user.fullName,
            approvedBy: user.fullName,
            approvedAt: new Date(),
          },
        });
      }

      return created;
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE_VEHICLE_DOCUMENT',
      entityType: 'VEHICLE_DOCUMENT',
      entityId: doc.id,
      newValues: doc,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    console.error('Create document error:', error);
    return NextResponse.json({ error: 'فشل في حفظ بيانات الوثيقة' }, { status: 500 });
  }
}
