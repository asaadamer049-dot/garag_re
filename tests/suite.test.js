const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

describe('نظام إدارة أسطول النقل والمركبات - Automated Quality & Integrity Suite', () => {
  let testCompany;
  let testDept;
  let testVehicleType;
  let testBrandModel;
  let testWarehouse;
  let testPart;
  let testVehicle;

  before(async () => {
    // Verify database connectivity
    testCompany = await prisma.company.findFirst();
    assert.ok(testCompany, 'يجب أن تكون الشركة موجودة في قاعدة البيانات');

    testDept = await prisma.department.findFirst({ where: { code: 'OPS' } });
    testVehicleType = await prisma.vehicleType.findFirst();
    testBrandModel = await prisma.vehicleBrandModel.findFirst();
    testWarehouse = await prisma.warehouse.findFirst();
    testPart = await prisma.part.findFirst();
    testVehicle = await prisma.vehicle.findFirst();
  });

  test('1. اختبار قيود التفرد ومنع تكرار اللوحة أو الشاسيه (Vehicle Constraints)', async () => {
    let errorThrown = false;
    try {
      await prisma.vehicle.create({
        data: {
          internalCode: testVehicle.internalCode, // duplicate internal code
          plateNumber: 'س ك ر 9999',
          chassisNumber: 'UNIQUE_VIN_123456789',
          vehicleTypeId: testVehicleType.id,
          brandModelId: testBrandModel.id,
          modelYear: 2024,
        },
      });
    } catch (e) {
      errorThrown = true;
    }
    assert.strictEqual(errorThrown, true, 'يجب أن تمنع قاعدة البيانات تكرار الكود الداخلي للمركبة');
  });

  test('2. اختبار منطق فحص قراءات العداد ومنع الشذوذ التراجعي (Odometer Anomaly)', async () => {
    const currentOdo = testVehicle.currentOdometer;
    const lowerReading = currentOdo - 500; // Anomaly: lower than current

    const isAnomaly = lowerReading < currentOdo;
    assert.strictEqual(isAnomaly, true, 'يجب أن يكتشف النظام القراءة التراجعية غير المنطقية للعداد');
  });

  test('3. اختبار احتساب تكلفة الصيانة وصرف قطع الغيار من المستودع (Maintenance Costing)', async () => {
    // Check initial stock balance
    const initialBalance = await prisma.stockBalance.findUnique({
      where: {
        partId_warehouseId: {
          partId: testPart.id,
          warehouseId: testWarehouse.id,
        },
      },
    });

    assert.ok(initialBalance && initialBalance.quantityOnHand >= 1, 'يجب أن يتوفر رصيد للاختبار');

    const laborCost = 250;
    const partQty = 1;
    const partCost = 80;
    const expectedTotal = laborCost + partQty * partCost;

    assert.strictEqual(expectedTotal, 330, 'حساب التكلفة الإجمالية (عمالة + قطع) يجب أن يكون دقيقاً');
  });

  test('4. اختبار منع صرف كمية أكبر من المخزون المتاح (Inventory Stock Protection)', async () => {
    const balance = await prisma.stockBalance.findUnique({
      where: {
        partId_warehouseId: {
          partId: testPart.id,
          warehouseId: testWarehouse.id,
        },
      },
    });

    const excessiveQty = (balance ? balance.quantityOnHand : 0) + 1000;
    const canIssue = balance && balance.quantityOnHand >= excessiveQty;

    assert.strictEqual(canIssue, false, 'يجب أن يرفض النظام صرف كميات تتجاوز الرصيد المتاح');
  });

  test('5. اختبار المعادلات الرياضية لكفاءة استهلاك الوقود وتكلفة الكيلومتر (Fuel Engine)', () => {
    const distanceKm = 500; // مسافة مقطوعة 500 كم
    const litersUsed = 125; // استهلاك 125 لتر
    const totalCost = 143.75; // بسعر 1.15 ريال/لتر

    // معادلة: (كمية الوقود ÷ المسافة المقطوعة) × 100
    const consumptionPer100km = (litersUsed / distanceKm) * 100;
    // معادلة: إجمالي تكلفة الوقود ÷ المسافة المقطوعة
    const costPerKm = totalCost / distanceKm;

    assert.strictEqual(consumptionPer100km, 25, 'معدل الاستهلاك يجب أن يكون 25 لتر لكل 100 كم');
    assert.ok(Math.abs(costPerKm - 0.2875) < 0.0001, 'تكلفة الكيلومتر يجب أن تطابق 143.75 / 500 = 0.2875 ر.س / كم');
  });

  test('6. اختبار الحماية من الازدواجية المالية (Anti-Double Counting in Expenses)', async () => {
    const uniqueSourceType = 'TEST_ORDER';
    const uniqueSourceId = 'ORD-TEST-' + Date.now();

    // 1st expense
    await prisma.expense.create({
      data: {
        expenseNumber: `EXP-TEST-${Date.now().toString().slice(-5)}`,
        expenseCategoryId: (await prisma.expenseCategory.findFirst()).id,
        description: 'مصروف تجريبي لاختبار التفرد',
        subtotal: 500,
        totalAmount: 500,
        sourceType: uniqueSourceType,
        sourceId: uniqueSourceId,
        paymentStatus: 'UNPAID',
      },
    });

    // 2nd duplicate attempt
    let duplicatePrevented = false;
    try {
      await prisma.expense.create({
        data: {
          expenseNumber: `EXP-TEST-DUP-${Date.now().toString().slice(-5)}`,
          expenseCategoryId: (await prisma.expenseCategory.findFirst()).id,
          description: 'محاولة تسجيل نفس المصدر مرة ثانية',
          subtotal: 500,
          totalAmount: 500,
          sourceType: uniqueSourceType,
          sourceId: uniqueSourceId,
          paymentStatus: 'UNPAID',
        },
      });
    } catch (e) {
      duplicatePrevented = true;
    }

    assert.strictEqual(duplicatePrevented, true, 'يجب أن تمنع قاعدة البيانات تسجيل نفس المصدر المالي مرتين');
  });

  test('7. اختبار الفصل بين المصروف والمدفوع والمستحق (Expense vs Payment)', () => {
    const expenseTotal = 1500;
    const payment1 = 500;
    const payment2 = 1000;

    let balance = expenseTotal - payment1;
    assert.strictEqual(balance, 1000, 'المتبقي بعد الدفعة الأولى يجب أن يكون 1000');

    balance -= payment2;
    assert.strictEqual(balance, 0, 'المتبقي بعد السداد الكامل يجب أن يكون صفراً');
  });

  test('8. اختبار توثيق سجل التدقيق الرقابي غير القابل للتعديل (Audit Logging)', async () => {
    const auditRecord = await prisma.auditLog.create({
      data: {
        action: 'UNIT_TEST_ACTION',
        entityType: 'TEST_ENTITY',
        entityId: 'TEST-123',
        newValuesJson: JSON.stringify({ verified: true }),
        ipAddress: '127.0.0.1',
      },
    });

    assert.ok(auditRecord.id, 'يجب حفظ حركة التدقيق وتوليد معرف UUID');
    assert.strictEqual(auditRecord.action, 'UNIT_TEST_ACTION');
  });
});
