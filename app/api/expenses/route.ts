import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');
    const categoryId = searchParams.get('categoryId');
    const paymentStatus = searchParams.get('paymentStatus');

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (categoryId) where.expenseCategoryId = categoryId;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        vehicle: true,
        category: true,
        supplier: true,
        department: true,
        payments: true,
      },
      orderBy: { expenseDate: 'desc' },
      take: 100,
    });

    return NextResponse.json({ data: expenses });
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ error: 'فشل في جلب سجل المصروفات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('EXPENSES_APPROVE');
    const body = await req.json();

    const {
      vehicleId,
      departmentId,
      expenseCategoryId,
      sourceType,
      sourceId,
      supplierId,
      invoiceNumber,
      description,
      subtotal,
      taxAmount = 0,
      discountAmount = 0,
      totalAmount,
      currency = 'SAR',
      initialPaymentAmount = 0,
      paymentMethod = 'BANK_TRANSFER',
      paymentReference,
    } = body;

    // Check anti-double-counting constraint: unique (sourceType, sourceId)
    if (sourceType && sourceId) {
      const existingExpense = await prisma.expense.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType,
            sourceId,
          },
        },
      });

      if (existingExpense) {
        return NextResponse.json(
          {
            error: `تم تسجيل هذا المصدر المالي مسبقاً برقم المصروف (${existingExpense.expenseNumber}). نظام الرقابة يمنع الازدواجية المالية.`,
          },
          { status: 400 }
        );
      }
    }

    const sub = parseFloat(subtotal) || 0;
    const tax = parseFloat(taxAmount) || 0;
    const disc = parseFloat(discountAmount) || 0;
    const total = parseFloat(totalAmount) || sub + tax - disc;
    const initialPaid = parseFloat(initialPaymentAmount) || 0;

    let paymentStatus = 'UNPAID';
    if (initialPaid >= total && total > 0) {
      paymentStatus = 'PAID';
    } else if (initialPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    const count = await prisma.expense.count();
    const expenseNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          expenseNumber,
          vehicleId: vehicleId || null,
          departmentId: departmentId || null,
          expenseCategoryId,
          sourceType: sourceType || null,
          sourceId: sourceId || null,
          supplierId: supplierId || null,
          invoiceNumber: invoiceNumber || null,
          description,
          subtotal: sub,
          taxAmount: tax,
          discountAmount: disc,
          totalAmount: total,
          currency,
          paymentStatus,
          createdBy: user.fullName,
          approvedBy: user.fullName,
          approvedAt: new Date(),
          status: 'APPROVED',
        },
      });

      // Record initial payment if provided
      if (initialPaid > 0) {
        await tx.expensePayment.create({
          data: {
            expenseId: created.id,
            amount: initialPaid,
            paymentMethod,
            paymentReference: paymentReference || 'دفعة أولية عند تسجيل المصروف',
            recordedBy: user.fullName,
          },
        });
      }

      return created;
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE_EXPENSE',
      entityType: 'EXPENSE',
      entityId: expense.id,
      newValues: expense,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'فشل في حفظ المصروف' }, { status: 500 });
  }
}
