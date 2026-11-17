import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { internalCode: { contains: search } },
        { plateNumber: { contains: search } },
        { chassisNumber: { contains: search } },
      ];
    }

    const [vehicles, total, vehicleTypes, brandModels, departments, drivers] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          vehicleType: true,
          brandModel: true,
          department: true,
          assignedDriver: true,
        },
        orderBy: { internalCode: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
      prisma.vehicleType.findMany({ orderBy: { name: 'asc' } }),
      prisma.vehicleBrandModel.findMany({ orderBy: { brand: 'asc' } }),
      prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.driver.findMany({ where: { employmentStatus: 'ACTIVE' }, orderBy: { fullName: 'asc' } }),
    ]);

    return NextResponse.json({
      data: vehicles,
      meta: {
        vehicleTypes,
        brandModels,
        departments,
        drivers,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات المركبات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('VEHICLES_MANAGE');
    const body = await req.json();

    const {
      internalCode,
      plateNumber,
      chassisNumber,
      engineNumber,
      vehicleTypeId,
      brandModelId,
      modelYear,
      purchaseDate,
      purchaseCost,
      currentOdometer,
      fuelType,
      fuelTankCapacity,
      departmentId,
      assignedDriverId,
      status,
      ownershipType,
      notes,
    } = body;

    if (!internalCode || !plateNumber || !chassisNumber) {
      return NextResponse.json(
        { error: 'الرقم الداخلي، ورقم اللوحة، ورقم الشاسيه حقول إلزامية' },
        { status: 400 }
      );
    }

    // Fallback if vehicleTypeId or brandModelId not selected
    let finalVehicleTypeId = vehicleTypeId && vehicleTypeId.trim() !== '' ? vehicleTypeId : null;
    let finalBrandModelId = brandModelId && brandModelId.trim() !== '' ? brandModelId : null;

    if (!finalVehicleTypeId) {
      const defaultType = await prisma.vehicleType.findFirst();
      if (defaultType) {
        finalVehicleTypeId = defaultType.id;
      } else {
        const createdType = await prisma.vehicleType.create({
          data: { name: 'شاحنة نقل عامة', description: 'نوع قياسي' },
        });
        finalVehicleTypeId = createdType.id;
      }
    }

    if (!finalBrandModelId) {
      const defaultBrand = await prisma.vehicleBrandModel.findFirst({
        where: { vehicleTypeId: finalVehicleTypeId },
      }) || await prisma.vehicleBrandModel.findFirst();

      if (defaultBrand) {
        finalBrandModelId = defaultBrand.id;
      } else {
        const createdBrand = await prisma.vehicleBrandModel.create({
          data: {
            brand: 'عام',
            model: 'قياسي',
            vehicleTypeId: finalVehicleTypeId,
            fuelType: fuelType || 'DIESEL',
          },
        });
        finalBrandModelId = createdBrand.id;
      }
    }

    // Validate uniqueness
    const existing = await prisma.vehicle.findFirst({
      where: {
        OR: [
          { internalCode },
          { plateNumber },
          { chassisNumber },
        ],
      },
    });

    if (existing) {
      let duplicateField = 'الرقم الداخلي';
      if (existing.plateNumber === plateNumber) duplicateField = 'رقم اللوحة';
      if (existing.chassisNumber === chassisNumber) duplicateField = 'رقم الشاسيه';
      return NextResponse.json(
        { error: `المركبة موجودة مسبقاً بنفس (${duplicateField})` },
        { status: 400 }
      );
    }

    const vehicle = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({
        data: {
          internalCode,
          plateNumber,
          chassisNumber,
          engineNumber: engineNumber || null,
          vehicleTypeId: finalVehicleTypeId,
          brandModelId: finalBrandModelId,
          modelYear: parseInt(modelYear, 10) || new Date().getFullYear(),
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          purchaseCost: parseFloat(purchaseCost) || 0,
          currentOdometer: parseFloat(currentOdometer) || 0,
          odometerUpdatedAt: new Date(),
          fuelType: fuelType || 'DIESEL',
          fuelTankCapacity: parseFloat(fuelTankCapacity) || 100,
          departmentId: departmentId && departmentId.trim() !== '' ? departmentId : null,
          assignedDriverId: assignedDriverId && assignedDriverId.trim() !== '' ? assignedDriverId : null,
          status: status || 'ACTIVE',
          ownershipType: ownershipType || 'OWNED',
          notes: notes || null,
        },
      });

      // Log initial odometer reading if provided
      if (currentOdometer && parseFloat(currentOdometer) > 0) {
        await tx.vehicleOdometerReading.create({
          data: {
            vehicleId: created.id,
            readingValue: parseFloat(currentOdometer),
            sourceType: 'MANUAL',
            recordedBy: user.fullName,
            notes: 'قراءة افتتاحية عند إضافة المركبة للنظام',
          },
        });
      }

      return created;
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE_VEHICLE',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      newValues: vehicle,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, vehicle });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'غير مصرح لك بإضافة مركبات جديدة' }, { status: 403 });
    }
    console.error('Create vehicle error:', error);
    return NextResponse.json({ error: 'فشل في حفظ بيانات المركبة' }, { status: 500 });
  }
}
