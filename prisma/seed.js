const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Fleet ERP Database Seeding ---');

  // 1. Company
  const company = await prisma.company.upsert({
    where: { id: 'default-company-id' },
    update: {},
    create: {
      id: 'default-company-id',
      name: 'شركة النقل والخدمات اللوجستية المتقدمة',
      legalName: 'شركة النقل والخدمات اللوجستية المتقدمة ذ.م.م',
      address: 'المملكة العربية السعودية - الرياض - المنطقة الصناعية الثانية',
      phone: '+966 11 400 9000',
      email: 'fleet@company.local',
      defaultCurrency: 'SAR',
      timezone: 'Asia/Riyadh',
    },
  });
  console.log('✓ Company initialized:', company.name);

  // 2. Departments
  const deptOperations = await prisma.department.upsert({
    where: { code: 'OPS' },
    update: {},
    create: {
      companyId: company.id,
      code: 'OPS',
      name: 'إدارة النقل والعمليات',
      isActive: true,
    },
  });

  const deptMaintenance = await prisma.department.upsert({
    where: { code: 'MAINT' },
    update: {},
    create: {
      companyId: company.id,
      code: 'MAINT',
      name: 'إدارة الصيانة والورش المركزية',
      isActive: true,
    },
  });

  const deptWarehouse = await prisma.department.upsert({
    where: { code: 'WH' },
    update: {},
    create: {
      companyId: company.id,
      code: 'WH',
      name: 'إدارة المستودعات وقطع الغيار',
      isActive: true,
    },
  });

  const deptFinance = await prisma.department.upsert({
    where: { code: 'FIN' },
    update: {},
    create: {
      companyId: company.id,
      code: 'FIN',
      name: 'الإدارة المالية والحسابات',
      isActive: true,
    },
  });
  console.log('✓ Departments created');

  // 3. Roles
  const rolesList = [
    { name: 'ADMIN', description: 'مدير النظام بصلاحيات كاملة', isSystemRole: true },
    { name: 'FLEET_MANAGER', description: 'مدير النقل ومتابعة حركة الأسطول', isSystemRole: true },
    { name: 'MAINTENANCE_SUPERVISOR', description: 'مسؤول الصيانة والورش وأوامر العمل', isSystemRole: true },
    { name: 'WAREHOUSE_KEEPER', description: 'أمين المستودع وحركات المخزون', isSystemRole: true },
    { name: 'PROCUREMENT_OFFICER', description: 'مسؤول المشتريات ومتابعة الموردين', isSystemRole: true },
    { name: 'FUEL_OFFICER', description: 'مسؤول الوقود ومطابقة التعبئات والعدادات', isSystemRole: true },
    { name: 'ACCOUNTANT', description: 'المحاسب المالي ومتابعة المصروفات والميزانيات', isSystemRole: true },
    { name: 'EXECUTIVE', description: 'الإدارة العليا للاطلاع على المؤشرات والتقارير', isSystemRole: true },
    { name: 'VIEWER', description: 'مستخدم للقراءة والاطلاع فقط', isSystemRole: true },
  ];

  const createdRoles = {};
  for (const r of rolesList) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    createdRoles[r.name] = role;
  }
  console.log('✓ Standard RBAC Roles created');

  // 4. Permissions
  const permissionsList = [
    { code: 'VEHICLES_VIEW', module: 'VEHICLES', action: 'VIEW', description: 'عرض قائمة وتفاصيل المركبات' },
    { code: 'VEHICLES_MANAGE', module: 'VEHICLES', action: 'MANAGE', description: 'إضافة وتعديل بيانات المركبات' },
    { code: 'ODOMETER_LOG', module: 'ODOMETER', action: 'CREATE', description: 'تسجيل قراءات العدادات' },
    { code: 'MAINTENANCE_VIEW', module: 'MAINTENANCE', action: 'VIEW', description: 'عرض أوامر الصيانة' },
    { code: 'MAINTENANCE_CREATE', module: 'MAINTENANCE', action: 'CREATE', description: 'إنشاء أوامر الصيانة' },
    { code: 'MAINTENANCE_APPROVE', module: 'MAINTENANCE', action: 'APPROVE', description: 'اعتماد أوامر الصيانة وإغلاقها' },
    { code: 'INVENTORY_VIEW', module: 'INVENTORY', action: 'VIEW', description: 'عرض المخزون والأرصدة' },
    { code: 'INVENTORY_ISSUE', module: 'INVENTORY', action: 'ISSUE', description: 'صرف قطع الغيار والزيوت' },
    { code: 'INVENTORY_RECEIVE', module: 'INVENTORY', action: 'RECEIVE', description: 'استلام المواد والتوريدات' },
    { code: 'PROCUREMENT_MANAGE', module: 'PROCUREMENT', action: 'MANAGE', description: 'إدارة طلبات وأوامر الشراء' },
    { code: 'FUEL_LOG', module: 'FUEL', action: 'CREATE', description: 'تسجيل استهلاك وتعبئة الوقود' },
    { code: 'EXPENSES_VIEW', module: 'EXPENSES', action: 'VIEW', description: 'عرض المصروفات المالية' },
    { code: 'EXPENSES_APPROVE', module: 'EXPENSES', action: 'APPROVE', description: 'اعتماد المصروفات والمدفوعات' },
    { code: 'REPORTS_VIEW', module: 'REPORTS', action: 'VIEW', description: 'عرض وتصدير التقارير الإدارية والمالية' },
    { code: 'USERS_MANAGE', module: 'ADMIN', action: 'MANAGE', description: 'إدارة المستخدمين والأدوار' },
    { code: 'AUDIT_VIEW', module: 'ADMIN', action: 'VIEW', description: 'عرض سجل التدقيق الرقابي' },
  ];

  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: p,
    });

    // Grant all to ADMIN
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles['ADMIN'].id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: createdRoles['ADMIN'].id,
        permissionId: perm.id,
      },
    });
  }
  console.log('✓ Granular permissions assigned to ADMIN');

  // 5. Default Super Admin User
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      fullName: 'مدير النظام الرئيسي',
      email: 'admin@company.local',
      passwordHash: adminPasswordHash,
      departmentId: deptOperations.id,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: createdRoles['ADMIN'].id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: createdRoles['ADMIN'].id,
    },
  });
  console.log('✓ Admin user created (Username: admin, Password: admin123456)');

  // 6. Vehicle Types & Brands
  const vTypeHeavy = await prisma.vehicleType.upsert({
    where: { name: 'شاحنة ثقيلة (تريلا)' },
    update: {},
    create: { name: 'شاحنة ثقيلة (تريلا)', description: 'رؤوس شاحنات نقل ثقيل وتريلات مبردة وجافة' },
  });

  const vTypeMedium = await prisma.vehicleType.upsert({
    where: { name: 'نقل خفيف ومتوسط (دينا)' },
    update: {},
    create: { name: 'نقل خفيف ومتوسط (دينا)', description: 'سيارات توزيع ونقل بضائع داخل المدن' },
  });

  const vTypeService = await prisma.vehicleType.upsert({
    where: { name: 'مركبة خدمات ميدانية (بيك آب)' },
    update: {},
    create: { name: 'مركبة خدمات ميدانية (بيك آب)', description: 'سيارات متابعة ودعم لوجستي وصيانة ميدانية' },
  });

  const brandActros = await prisma.vehicleBrandModel.upsert({
    where: {
      brand_model_vehicleTypeId: {
        brand: 'Mercedes-Benz',
        model: 'Actros 1845 LS',
        vehicleTypeId: vTypeHeavy.id,
      },
    },
    update: {},
    create: {
      brand: 'Mercedes-Benz',
      model: 'Actros 1845 LS',
      vehicleTypeId: vTypeHeavy.id,
      fuelType: 'DIESEL',
      manufacturerRecommendationsJson: JSON.stringify({ oilCapacityLiters: 35, oilChangeKm: 30000 }),
    },
  });

  const brandIsuzu = await prisma.vehicleBrandModel.upsert({
    where: {
      brand_model_vehicleTypeId: {
        brand: 'Isuzu',
        model: 'NPR 71L',
        vehicleTypeId: vTypeMedium.id,
      },
    },
    update: {},
    create: {
      brand: 'Isuzu',
      model: 'NPR 71L',
      vehicleTypeId: vTypeMedium.id,
      fuelType: 'DIESEL',
      manufacturerRecommendationsJson: JSON.stringify({ oilCapacityLiters: 11, oilChangeKm: 10000 }),
    },
  });

  const brandHilux = await prisma.vehicleBrandModel.upsert({
    where: {
      brand_model_vehicleTypeId: {
        brand: 'Toyota',
        model: 'Hilux Double Cabin 4x4',
        vehicleTypeId: vTypeService.id,
      },
    },
    update: {},
    create: {
      brand: 'Toyota',
      model: 'Hilux Double Cabin 4x4',
      vehicleTypeId: vTypeService.id,
      fuelType: 'DIESEL',
      manufacturerRecommendationsJson: JSON.stringify({ oilCapacityLiters: 7.5, oilChangeKm: 10000 }),
    },
  });

  // 7. Drivers
  const driver1 = await prisma.driver.upsert({
    where: { employeeCode: 'DRV-101' },
    update: {},
    create: {
      employeeCode: 'DRV-101',
      fullName: 'أحمد محمود السعيد',
      phone: '0551234567',
      licenseNumber: 'LIC-774921',
      licenseExpiryDate: new Date('2028-05-15'),
      departmentId: deptOperations.id,
      employmentStatus: 'ACTIVE',
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { employeeCode: 'DRV-102' },
    update: {},
    create: {
      employeeCode: 'DRV-102',
      fullName: 'عمر خالد المنصور',
      phone: '0559876543',
      licenseNumber: 'LIC-883014',
      licenseExpiryDate: new Date('2027-11-20'),
      departmentId: deptOperations.id,
      employmentStatus: 'ACTIVE',
    },
  });

  // 8. Vehicles
  const vehicle1 = await prisma.vehicle.upsert({
    where: { internalCode: 'TRK-01' },
    update: {},
    create: {
      internalCode: 'TRK-01',
      plateNumber: 'أ ب د 1234',
      chassisNumber: 'WDB9340321L984210',
      engineNumber: 'OM501LA-839420',
      vehicleTypeId: vTypeHeavy.id,
      brandModelId: brandActros.id,
      modelYear: 2023,
      purchaseDate: new Date('2023-01-15'),
      purchaseCost: 485000,
      currentOdometer: 142500,
      odometerUpdatedAt: new Date(),
      fuelType: 'DIESEL',
      fuelTankCapacity: 600,
      departmentId: deptOperations.id,
      assignedDriverId: driver1.id,
      status: 'ACTIVE',
      ownershipType: 'OWNED',
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { internalCode: 'DYN-02' },
    update: {},
    create: {
      internalCode: 'DYN-02',
      plateNumber: 'ر س ص 5678',
      chassisNumber: 'MP1NPR71L839120',
      engineNumber: '4HG1-928410',
      vehicleTypeId: vTypeMedium.id,
      brandModelId: brandIsuzu.id,
      modelYear: 2024,
      purchaseDate: new Date('2024-03-10'),
      purchaseCost: 195000,
      currentOdometer: 48200,
      odometerUpdatedAt: new Date(),
      fuelType: 'DIESEL',
      fuelTankCapacity: 140,
      departmentId: deptOperations.id,
      assignedDriverId: driver2.id,
      status: 'ACTIVE',
      ownershipType: 'OWNED',
    },
  });

  // 9. Initial Odometer Readings
  await prisma.vehicleOdometerReading.createMany({
    data: [
      {
        vehicleId: vehicle1.id,
        readingValue: 142500,
        sourceType: 'MANUAL',
        recordedBy: adminUser.fullName,
        notes: 'قراءة افتتاحية معتمدة للنظام',
      },
      {
        vehicleId: vehicle2.id,
        readingValue: 48200,
        sourceType: 'MANUAL',
        recordedBy: adminUser.fullName,
        notes: 'قراءة افتتاحية معتمدة للنظام',
      },
    ],
  });

  // 10. Warehouses & Parts
  const whCentral = await prisma.warehouse.upsert({
    where: { code: 'WH-CENTRAL' },
    update: {},
    create: {
      code: 'WH-CENTRAL',
      name: 'المستودع الرئيسي - الرياض',
      location: 'الورشة المركزية - مبنى B',
      isActive: true,
    },
  });

  const catFilters = await prisma.partCategory.upsert({
    where: { name: 'الفلاتر والمنقيات' },
    update: {},
    create: { name: 'الفلاتر والمنقيات', description: 'فلاتر الزيت، الوقود، الهواء ومجففات الهواء' },
  });

  const catBrakes = await prisma.partCategory.upsert({
    where: { name: 'الفرامل والمكابح' },
    update: {},
    create: { name: 'الفرامل والمكابح', description: 'أقمشة وتيل الفرامل والاسطوانات والهوبات' },
  });

  const partOilFilter = await prisma.part.upsert({
    where: { partCode: 'FLT-OIL-01' },
    update: {},
    create: {
      partCode: 'FLT-OIL-01',
      name: 'فلتر زيت محرك أكتروس أصلي',
      categoryId: catFilters.id,
      manufacturer: 'Mann-Filter',
      partNumber: 'HU 12 140 x',
      unitOfMeasure: 'PCS',
      minimumStock: 10,
    },
  });

  const partBrakePads = await prisma.part.upsert({
    where: { partCode: 'BRK-PAD-01' },
    update: {},
    create: {
      partCode: 'BRK-PAD-01',
      name: 'طقم تيل فرامل أمامي أكتروس',
      categoryId: catBrakes.id,
      manufacturer: 'Knorr-Bremse',
      partNumber: 'K000941',
      unitOfMeasure: 'SET',
      minimumStock: 4,
    },
  });

  // Stock balances
  await prisma.stockBalance.upsert({
    where: {
      partId_warehouseId: {
        partId: partOilFilter.id,
        warehouseId: whCentral.id,
      },
    },
    update: { quantityOnHand: 24 },
    create: {
      partId: partOilFilter.id,
      warehouseId: whCentral.id,
      quantityOnHand: 24,
      quantityReserved: 0,
    },
  });

  await prisma.stockBalance.upsert({
    where: {
      partId_warehouseId: {
        partId: partBrakePads.id,
        warehouseId: whCentral.id,
      },
    },
    update: { quantityOnHand: 8 },
    create: {
      partId: partBrakePads.id,
      warehouseId: whCentral.id,
      quantityOnHand: 8,
      quantityReserved: 0,
    },
  });

  // 11. Suppliers
  const supplierFuel = await prisma.supplier.upsert({
    where: { supplierCode: 'SUP-FUEL-01' },
    update: {},
    create: {
      supplierCode: 'SUP-FUEL-01',
      name: 'شركة خدمات محطات الوقود المتحدة',
      taxNumber: '300998822100003',
      phone: '0112223344',
      email: 'sales@fuelstations.local',
      paymentTerms: 'آجل 30 يوم',
      isActive: true,
    },
  });

  const supplierParts = await prisma.supplier.upsert({
    where: { supplierCode: 'SUP-PART-01' },
    update: {},
    create: {
      supplierCode: 'SUP-PART-01',
      name: 'مؤسسة الدقة لقطع غيار الشاحنات والمعدات',
      taxNumber: '310456789000003',
      phone: '0115556677',
      email: 'orders@precisionparts.local',
      paymentTerms: 'آجل 45 يوم',
      isActive: true,
    },
  });

  // 12. Lubricants
  const lubeEngine = await prisma.lubricantProduct.upsert({
    where: { productCode: 'OIL-15W40-ENG' },
    update: {},
    create: {
      productCode: 'OIL-15W40-ENG',
      name: 'زيت محرك ديزل 15W-40 CI-4',
      lubricantType: 'ENGINE_OIL',
      brand: 'Mobil Delvac',
      viscosityGrade: '15W-40',
      unitOfMeasure: 'LITER',
    },
  });

  // 13. Expense Categories
  const catExpFuel = await prisma.expenseCategory.upsert({
    where: { code: 'EXP-FUEL' },
    update: {},
    create: { code: 'EXP-FUEL', name: 'مصروفات الوقود والديزل' },
  });

  const catExpMaint = await prisma.expenseCategory.upsert({
    where: { code: 'EXP-MAINT' },
    update: {},
    create: { code: 'EXP-MAINT', name: 'مصروفات الصيانة والإصلاح' },
  });

  const catExpDocs = await prisma.expenseCategory.upsert({
    where: { code: 'EXP-DOCS' },
    update: {},
    create: { code: 'EXP-DOCS', name: 'رسوم التراخيص والتأمين والفحص' },
  });

  // 14. System Settings
  const defaultSettings = [
    { key: 'SYSTEM_CURRENCY', value: 'SAR' },
    { key: 'VAT_PERCENTAGE', value: '15' },
    { key: 'ALERT_DAYS_BEFORE_EXPIRY', value: '30' },
    { key: 'ODOMETER_ANOMALY_THRESHOLD_KM', value: '3000' },
    { key: 'ALLOW_NEGATIVE_STOCK', value: 'false' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { settingKey: s.key },
      update: { settingValue: s.value },
      create: { settingKey: s.key, settingValue: s.value },
    });
  }

  // 15. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      entityId: company.id,
      newValuesJson: JSON.stringify({ event: 'Fleet ERP system initialized and seeded' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('--- Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
