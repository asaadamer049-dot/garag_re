import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const [suppliers, invoices, purchaseOrders] = await Promise.all([
      prisma.supplier.findMany({
        include: {
          invoices: {
            orderBy: { invoiceDate: 'desc' },
          },
          purchaseOrders: {
            select: {
              id: true,
              poNumber: true,
              totalAmount: true,
              status: true,
              orderDate: true,
            },
            orderBy: { orderDate: 'desc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.supplierInvoice.findMany({
        include: {
          supplier: true,
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              status: true,
              totalAmount: true,
            },
          },
        },
        orderBy: { invoiceDate: 'desc' },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          status: { in: ['ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED'] },
        },
        include: { supplier: true },
        orderBy: { orderDate: 'desc' },
      }),
    ]);

    // Calculate aggregated stats
    const totalInvoicesAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = totalInvoicesAmount - totalPaidAmount;
    const unpaidInvoicesCount = invoices.filter((inv) => inv.status !== 'PAID').length;

    const stats = {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter((s) => s.isActive).length,
      totalInvoices: invoices.length,
      unpaidInvoicesCount,
      totalInvoicesAmount,
      totalPaidAmount,
      totalOutstanding,
    };

    return NextResponse.json({
      success: true,
      data: {
        suppliers,
        invoices,
        purchaseOrders,
        stats,
      },
    });
  } catch (error: any) {
    console.error('Fetch suppliers and invoices error:', error);
    return NextResponse.json(
      { error: error.message || 'فشل في جلب بيانات الموردين وفواتير الشراء' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const action = body.action || 'create_supplier';

    // 1. ACTION: Create Supplier (إضافة مورد جديد)
    if (action === 'create_supplier') {
      const {
        name,
        supplierCode,
        taxNumber,
        phone,
        email,
        address,
        paymentTerms,
      } = body;

      if (!name || name.trim() === '') {
        return NextResponse.json({ error: 'اسم المورد حقل إلزامي' }, { status: 400 });
      }

      // Generate code if not provided
      let finalCode = supplierCode?.trim();
      if (!finalCode) {
        const count = await prisma.supplier.count();
        finalCode = `SUP-${String(count + 1).padStart(3, '0')}`;
      }

      // Check unique code
      const existing = await prisma.supplier.findUnique({
        where: { supplierCode: finalCode },
      });
      if (existing) {
        return NextResponse.json({ error: 'كود المورد مسجل مسبقاً، يرجى اختيار كود آخر' }, { status: 400 });
      }

      const newSupplier = await prisma.supplier.create({
        data: {
          supplierCode: finalCode,
          name: name.trim(),
          taxNumber: taxNumber?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          paymentTerms: paymentTerms?.trim() || 'آجل 30 يوم',
          isActive: true,
        },
      });

      if (user) {
        await logAuditEvent({
          userId: user.userId,
          action: 'CREATE_SUPPLIER',
          entityType: 'SUPPLIER',
          entityId: newSupplier.id,
          newValues: newSupplier,
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم إضافة المورد (${newSupplier.name}) بنجاح`,
        data: newSupplier,
      });
    }

    // 2. ACTION: Update Supplier (تحديث بيانات مورد)
    if (action === 'update_supplier') {
      const { id, name, taxNumber, phone, email, address, paymentTerms, isActive } = body;
      if (!id) {
        return NextResponse.json({ error: 'معرف المورد مفقود' }, { status: 400 });
      }

      const updated = await prisma.supplier.update({
        where: { id },
        data: {
          name: name?.trim(),
          taxNumber: taxNumber?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          paymentTerms: paymentTerms?.trim(),
          isActive: isActive !== undefined ? !!isActive : true,
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم تحديث بيانات المورد (${updated.name}) بنجاح`,
        data: updated,
      });
    }

    // 3. ACTION: Create Purchase Invoice (تسجيل فاتورة شراء ومطابقة مع أمر الشراء)
    if (action === 'create_invoice') {
      const {
        supplierId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        purchaseOrderId,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount = 0,
      } = body;

      if (!supplierId || !invoiceNumber || !invoiceDate) {
        return NextResponse.json({ error: 'المورد ورقم الفاتورة وتاريخها حقول إلزامية' }, { status: 400 });
      }

      const parsedSubtotal = parseFloat(subtotal?.toString() || '0');
      const calculatedTax = taxAmount !== undefined ? parseFloat(taxAmount.toString()) : parsedSubtotal * 0.15;
      const calculatedTotal = totalAmount !== undefined ? parseFloat(totalAmount.toString()) : parsedSubtotal + calculatedTax;
      const parsedPaid = parseFloat(paidAmount?.toString() || '0');

      let status = 'POSTED';
      if (parsedPaid >= calculatedTotal && calculatedTotal > 0) {
        status = 'PAID';
      } else if (parsedPaid > 0) {
        status = 'PARTIALLY_PAID';
      }

      // Check unique (supplierId, invoiceNumber)
      const existingInv = await prisma.supplierInvoice.findUnique({
        where: {
          supplierId_invoiceNumber: {
            supplierId,
            invoiceNumber: invoiceNumber.trim(),
          },
        },
      });

      if (existingInv) {
        return NextResponse.json({ error: 'رقم الفاتورة مسجل مسبقاً لهذا المورد' }, { status: 400 });
      }

      const newInvoice = await prisma.supplierInvoice.create({
        data: {
          supplierId,
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          purchaseOrderId: purchaseOrderId || null,
          subtotal: parsedSubtotal,
          taxAmount: calculatedTax,
          totalAmount: calculatedTotal,
          paidAmount: parsedPaid,
          status,
        },
        include: {
          supplier: true,
          purchaseOrder: true,
        },
      });

      if (user) {
        await logAuditEvent({
          userId: user.userId,
          action: 'CREATE_SUPPLIER_INVOICE',
          entityType: 'SUPPLIER_INVOICE',
          entityId: newInvoice.id,
          newValues: newInvoice,
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم تسجيل فاتورة الشراء (${newInvoice.invoiceNumber}) للمورد بنجاح`,
        data: newInvoice,
      });
    }

    // 4. ACTION: Record Payment (تسجيل دفعة سداد على الفاتورة)
    if (action === 'record_payment') {
      const { invoiceId, paymentAmount } = body;
      if (!invoiceId || !paymentAmount) {
        return NextResponse.json({ error: 'الفاتورة ومبلغ السداد حقول إلزامية' }, { status: 400 });
      }

      const invoice = await prisma.supplierInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
      }

      const additionalPay = parseFloat(paymentAmount.toString()) || 0;
      const newPaidAmount = invoice.paidAmount + additionalPay;

      let status = invoice.status;
      if (newPaidAmount >= invoice.totalAmount) {
        status = 'PAID';
      } else if (newPaidAmount > 0) {
        status = 'PARTIALLY_PAID';
      }

      const updated = await prisma.supplierInvoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: Math.min(newPaidAmount, invoice.totalAmount),
          status,
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم تسجيل دفعة سداد بمبلغ (${additionalPay}) بنجاح`,
        data: updated,
      });
    }

    return NextResponse.json({ error: 'إجراء غير مدعوم' }, { status: 400 });
  } catch (error: any) {
    console.error('Supplier action error:', error);
    return NextResponse.json({ error: error.message || 'فشل في معالجة طلب الموردين' }, { status: 500 });
  }
}

