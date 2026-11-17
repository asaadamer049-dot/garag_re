import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (type && type !== 'ALL') {
      where.lubricantType = type;
    }
    if (search) {
      where.OR = [
        { productCode: { contains: search } },
        { name: { contains: search } },
        { brand: { contains: search } },
        { viscosityGrade: { contains: search } },
        { specification: { contains: search } },
      ];
    }

    const [products, totalCount, vehicleTypes, vehicles, servicesCount, warehouses] = await Promise.all([
      prisma.lubricantProduct.findMany({
        where,
        include: {
          part: {
            include: {
              category: true,
              stockBalances: {
                include: {
                  warehouse: true,
                },
              },
            },
          },
          specs: {
            include: {
              vehicleType: true,
            },
          },
          _count: {
            select: {
              serviceItems: true,
            },
          },
        },
        orderBy: [{ lubricantType: 'asc' }, { productCode: 'asc' }],
      }),
      prisma.lubricantProduct.count(),
      prisma.vehicleType.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.vehicle.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          internalCode: true,
          plateNumber: true,
          currentOdometer: true,
          vehicleTypeId: true,
          vehicleType: { select: { id: true, name: true } },
          assignedDriver: { select: { id: true, fullName: true } },
        },
        orderBy: { internalCode: 'asc' },
      }),
      prisma.lubricantService.count(),
      prisma.warehouse.findMany({ where: { isActive: true } }),
    ]);

    // Aggregate statistics
    const stats = {
      totalProducts: totalCount,
      engineOils: products.filter(p => p.lubricantType === 'ENGINE_OIL').length,
      gearTransmissionOils: products.filter(p => ['GEAR_OIL', 'ATF'].includes(p.lubricantType)).length,
      filters: products.filter(p => p.lubricantType.startsWith('FILTER_')).length,
      hydraulicsCoolants: products.filter(p => ['HYDRAULIC', 'COOLANT', 'BRAKE_FLUID'].includes(p.lubricantType)).length,
      totalServices: servicesCount,
      totalStockUnits: products.reduce((acc, p) => {
        const q = p.part?.stockBalances?.reduce((sum, sb) => sum + sb.quantityOnHand, 0) || 0;
        return acc + q;
      }, 0),
    };

    return NextResponse.json({
      success: true,
      data: products,
      stats,
      meta: {
        vehicleTypes,
        vehicles,
        warehouses,
      },
    });
  } catch (error: any) {
    console.error('Fetch lubricants error:', error);
    return NextResponse.json({ error: error.message || 'فشل في جلب بيانات الزيوت والفلاتر' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    // Check if this is a sync inventory request
    if (body.action === 'sync_inventory') {
      const catOils = await prisma.partCategory.upsert({
        where: { name: 'الزيوت والمشحمات' },
        update: {},
        create: {
          name: 'الزيوت والمشحمات',
          description: 'زيوت محركات الديزل والبنزين، زيوت القيرات والدفرنسات، والسوائل الميكانيكية',
        },
      });

      const catFilters = await prisma.partCategory.upsert({
        where: { name: 'الفلاتر والمنقيات' },
        update: {},
        create: {
          name: 'الفلاتر والمنقيات',
          description: 'فلاتر الزيت، الوقود، الهواء، ومجففات الهواء',
        },
      });

      const catHydraulics = await prisma.partCategory.upsert({
        where: { name: 'السوائل الهيدروليكية ومياه التبريد' },
        update: {},
        create: {
          name: 'السوائل الهيدروليكية ومياه التبريد',
          description: 'زيوت الهيدروليك الصناعية، مياه التبريد OAT، وسوائل الفرامل DOT',
        },
      });

      let warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
      if (!warehouse) {
        warehouse = await prisma.warehouse.create({
          data: {
            code: 'WH-CENTRAL',
            name: 'المستودع الرئيسي - الرياض',
            location: 'الورشة المركزية - مبنى B',
            isActive: true,
          },
        });
      }

      const allProducts = await prisma.lubricantProduct.findMany();
      let syncedCount = 0;

      for (const lp of allProducts) {
        let catId = catOils.id;
        if (lp.lubricantType.startsWith('FILTER_')) {
          catId = catFilters.id;
        } else if (['HYDRAULIC', 'COOLANT', 'BRAKE_FLUID'].includes(lp.lubricantType)) {
          catId = catHydraulics.id;
        }

        const part = await prisma.part.upsert({
          where: { partCode: lp.productCode },
          update: {
            name: lp.name,
            categoryId: catId,
            manufacturer: lp.brand || 'معتمد',
            partNumber: lp.viscosityGrade || lp.productCode,
            unitOfMeasure: lp.unitOfMeasure === 'LITER' ? 'LTR' : 'PCS',
            notes: lp.specification || 'صنف مسجل من إدارة الزيوت والفلاتر',
          },
          create: {
            partCode: lp.productCode,
            name: lp.name,
            categoryId: catId,
            manufacturer: lp.brand || 'معتمد',
            partNumber: lp.viscosityGrade || lp.productCode,
            unitOfMeasure: lp.unitOfMeasure === 'LITER' ? 'LTR' : 'PCS',
            minimumStock: lp.unitOfMeasure === 'LITER' ? 50 : 10,
            notes: lp.specification || 'صنف مسجل من إدارة الزيوت والفلاتر',
          },
        });

        await prisma.lubricantProduct.update({
          where: { id: lp.id },
          data: { partId: part.id },
        });

        // Ensure stock balance exists
        const existingStock = await prisma.stockBalance.findUnique({
          where: {
            partId_warehouseId: {
              partId: part.id,
              warehouseId: warehouse.id,
            },
          },
        });

        if (!existingStock) {
          const initialQty = lp.unitOfMeasure === 'LITER' ? 100 : 20;
          await prisma.stockBalance.create({
            data: {
              partId: part.id,
              warehouseId: warehouse.id,
              quantityOnHand: initialQty,
              quantityReserved: 0,
            },
          });
        }
        syncedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `تمت مزامنة وتسجيل جميع الأصناف (${syncedCount} صنف) في دليل قطع الغيار والمخزون بنجاح`,
      });
    }

    const {
      productCode,
      name,
      lubricantType,
      brand,
      viscosityGrade,
      specification,
      oilBase = 'MINERAL',
      defaultIntervalKm = 10000,
      defaultIntervalDays = 90,
      approxCost = 0,
      unitOfMeasure = 'LITER',
      isActive = true,
      initialStock = 100,
      warehouseId,
    } = body;

    if (!productCode || !name || !lubricantType) {
      return NextResponse.json(
        { error: 'كود الصنف واسم المنتج ونوعه حقول مطلوبة' },
        { status: 400 }
      );
    }

    // Check duplicate code
    const existing = await prisma.lubricantProduct.findUnique({
      where: { productCode: productCode.trim().toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'كود المنتج مسجل مسبقاً، يرجى استخدام كود فريد' },
        { status: 400 }
      );
    }

    // 1. Determine Category in Inventory
    let catName = 'الزيوت والمشحمات';
    if (lubricantType.startsWith('FILTER_')) {
      catName = 'الفلاتر والمنقيات';
    } else if (['HYDRAULIC', 'COOLANT', 'BRAKE_FLUID'].includes(lubricantType)) {
      catName = 'السوائل الهيدروليكية ومياه التبريد';
    }

    const category = await prisma.partCategory.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });

    // 2. Create Part in Inventory
    const part = await prisma.part.create({
      data: {
        partCode: productCode.trim().toUpperCase(),
        name: name.trim(),
        categoryId: category.id,
        manufacturer: brand?.trim() || 'معتمد',
        partNumber: viscosityGrade?.trim() || productCode.trim().toUpperCase(),
        unitOfMeasure: unitOfMeasure === 'LITER' ? 'LTR' : 'PCS',
        minimumStock: unitOfMeasure === 'LITER' ? 50 : 10,
        notes: specification?.trim() || 'صنف مسجل من إدارة الزيوت والفلاتر',
      },
    });

    // 3. Create initial stock balance in warehouse if specified or default
    let targetWhId = warehouseId;
    if (!targetWhId) {
      const wh = await prisma.warehouse.findFirst({ where: { isActive: true } });
      if (wh) targetWhId = wh.id;
    }

    if (targetWhId && initialStock) {
      const qty = parseFloat(initialStock.toString()) || 0;
      await prisma.stockBalance.create({
        data: {
          partId: part.id,
          warehouseId: targetWhId,
          quantityOnHand: qty,
          quantityReserved: 0,
        },
      });

      if (qty > 0) {
        await prisma.stockMovement.create({
          data: {
            movementNumber: `REC-${productCode.trim().toUpperCase()}-${Date.now().toString().slice(-4)}`,
            movementType: 'RECEIPT',
            partId: part.id,
            warehouseId: targetWhId,
            quantity: qty,
            unitCost: approxCost ? parseFloat(approxCost.toString()) : 0,
            referenceType: 'INITIAL_STOCK',
            referenceId: 'INITIAL_STOCK',
            status: 'CONFIRMED',
            createdBy: user?.fullName || 'مسؤول النظام',
          },
        });
      }
    }

    // 4. Create LubricantProduct linked to Part
    const newProduct = await prisma.lubricantProduct.create({
      data: {
        productCode: productCode.trim().toUpperCase(),
        name: name.trim(),
        lubricantType,
        brand: brand?.trim() || null,
        viscosityGrade: viscosityGrade?.trim() || null,
        specification: specification?.trim() || null,
        oilBase: oilBase || 'MINERAL',
        defaultIntervalKm: defaultIntervalKm ? parseInt(defaultIntervalKm.toString(), 10) : 10000,
        defaultIntervalDays: defaultIntervalDays ? parseInt(defaultIntervalDays.toString(), 10) : 90,
        approxCost: approxCost ? parseFloat(approxCost.toString()) : 0,
        unitOfMeasure: unitOfMeasure || 'LITER',
        isActive: isActive !== false,
        partId: part.id,
      },
      include: {
        part: {
          include: {
            stockBalances: {
              include: { warehouse: true },
            },
          },
        },
      },
    });

    if (user) {
      await logAuditEvent({
        userId: user.userId,
        action: 'CREATE_LUBRICANT_PRODUCT',
        entityType: 'LUBRICANT_PRODUCT',
        entityId: newProduct.id,
        newValues: newProduct,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تمت إضافة صنف الزيت / الفلتر وتسجيله تلقائياً في مخزون قطع الغيار بنجاح',
      data: newProduct,
    });
  } catch (error: any) {
    console.error('Create lubricant product error:', error);
    return NextResponse.json({ error: error.message || 'فشل في حفظ المنتج' }, { status: 500 });
  }
}

