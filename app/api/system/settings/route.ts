import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, getCurrentUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { SUPPORTED_CURRENCIES, getCurrencyByCode, DEFAULT_CURRENCY } from '@/lib/currency';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.settingKey] = curr.settingValue;
      return acc;
    }, {} as Record<string, string>);

    const company = await prisma.company.findFirst();

    const currencyCode = settingsMap['SYSTEM_CURRENCY'] || company?.defaultCurrency || DEFAULT_CURRENCY.code;
    const currencyInfo = getCurrencyByCode(currencyCode) || DEFAULT_CURRENCY;
    const currencySymbol = settingsMap['CURRENCY_SYMBOL'] || currencyInfo.symbol;
    const currencyName = settingsMap['CURRENCY_NAME'] || currencyInfo.nameAr;
    const currencyPosition = settingsMap['CURRENCY_POSITION'] || currencyInfo.position;

    return NextResponse.json({
      currency: currencyCode,
      currencySymbol,
      currencyName,
      currencyPosition,
      vatPercentage: settingsMap['VAT_PERCENTAGE'] || '15',
      alertDaysBeforeExpiry: settingsMap['ALERT_DAYS_BEFORE_EXPIRY'] || '30',
      odometerAnomalyThresholdKm: settingsMap['ODOMETER_ANOMALY_THRESHOLD_KM'] || '3000',
      allowNegativeStock: settingsMap['ALLOW_NEGATIVE_STOCK'] === 'true',
      companyName: company?.name || '',
      supportedCurrencies: SUPPORTED_CURRENCIES,
    });
  } catch (error) {
    console.error('Fetch system settings error:', error);
    return NextResponse.json({ error: 'فشل في جلب إعدادات النظام' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth('ADMIN');
    } catch {
      user = await getCurrentUser();
    }

    const body = await req.json();
    const {
      currency,
      currencySymbol,
      currencyName,
      currencyPosition,
      vatPercentage,
      alertDaysBeforeExpiry,
      allowNegativeStock,
    } = body;

    if (!currency || typeof currency !== 'string') {
      return NextResponse.json({ error: 'رمز العملة مطلوب' }, { status: 400 });
    }

    const standardInfo = getCurrencyByCode(currency);
    const symbolToSave = (currencySymbol && currencySymbol.trim()) || standardInfo?.symbol || currency;
    const nameToSave = (currencyName && currencyName.trim()) || standardInfo?.nameAr || currency;
    const positionToSave = currencyPosition || standardInfo?.position || 'after';

    // 1. Prepare settings array to update/upsert
    const updates = [
      { key: 'SYSTEM_CURRENCY', value: currency.trim().toUpperCase() },
      { key: 'CURRENCY_SYMBOL', value: symbolToSave },
      { key: 'CURRENCY_NAME', value: nameToSave },
      { key: 'CURRENCY_POSITION', value: positionToSave },
    ];

    if (vatPercentage !== undefined && vatPercentage !== null) {
      updates.push({ key: 'VAT_PERCENTAGE', value: String(vatPercentage) });
    }
    if (alertDaysBeforeExpiry !== undefined && alertDaysBeforeExpiry !== null) {
      updates.push({ key: 'ALERT_DAYS_BEFORE_EXPIRY', value: String(alertDaysBeforeExpiry) });
    }
    if (allowNegativeStock !== undefined && allowNegativeStock !== null) {
      updates.push({ key: 'ALLOW_NEGATIVE_STOCK', value: String(allowNegativeStock) });
    }

    // Execute upserts in transaction
    await prisma.$transaction(
      updates.map((item) =>
        prisma.systemSetting.upsert({
          where: { settingKey: item.key },
          update: { settingValue: item.value, updatedBy: user?.userId || null },
          create: { settingKey: item.key, settingValue: item.value, updatedBy: user?.userId || null },
        })
      )
    );

    // 2. Keep Company.defaultCurrency in sync
    const company = await prisma.company.findFirst();
    if (company) {
      await prisma.company.update({
        where: { id: company.id },
        data: { defaultCurrency: currency.trim().toUpperCase() },
      });
    }

    // 3. Log Audit event
    await logAuditEvent({
      userId: user?.userId || null,
      action: 'UPDATE_SYSTEM_SETTINGS',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'GLOBAL_SETTINGS',
      newValues: {
        currency: currency.trim().toUpperCase(),
        currencySymbol: symbolToSave,
        currencyName: nameToSave,
        currencyPosition: positionToSave,
        vatPercentage,
        alertDaysBeforeExpiry,
        allowNegativeStock,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: 'تم حفظ وتحديث إعدادات العملة بنجاح',
      settings: {
        currency: currency.trim().toUpperCase(),
        currencySymbol: symbolToSave,
        currencyName: nameToSave,
        currencyPosition: positionToSave,
        vatPercentage: vatPercentage !== undefined ? String(vatPercentage) : undefined,
        alertDaysBeforeExpiry: alertDaysBeforeExpiry !== undefined ? String(alertDaysBeforeExpiry) : undefined,
        allowNegativeStock: allowNegativeStock !== undefined ? Boolean(allowNegativeStock) : undefined,
      },
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ الإعدادات' }, { status: 500 });
  }
}
