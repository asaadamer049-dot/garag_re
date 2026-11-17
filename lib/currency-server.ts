import prisma from '@/lib/prisma';
import { getCurrencyByCode, DEFAULT_CURRENCY, CurrencyInfo } from './currency';

export async function getSystemCurrency(): Promise<{
  code: string;
  symbol: string;
  name: string;
  position: 'before' | 'after';
  decimals: number;
}> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        settingKey: {
          in: ['SYSTEM_CURRENCY', 'CURRENCY_SYMBOL', 'CURRENCY_NAME', 'CURRENCY_POSITION'],
        },
      },
    });

    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.settingKey] = curr.settingValue;
      return acc;
    }, {} as Record<string, string>);

    let code = settingsMap['SYSTEM_CURRENCY'];
    if (!code) {
      const company = await prisma.company.findFirst();
      code = company?.defaultCurrency || 'SAR';
    }

    const info: CurrencyInfo = getCurrencyByCode(code) || DEFAULT_CURRENCY;
    const symbol = settingsMap['CURRENCY_SYMBOL'] || info.symbol;
    const name = settingsMap['CURRENCY_NAME'] || info.nameAr;
    const position = (settingsMap['CURRENCY_POSITION'] as 'before' | 'after') || info.position;

    return {
      code,
      symbol,
      name,
      position,
      decimals: info.decimals,
    };
  } catch (error) {
    console.error('getSystemCurrency error:', error);
    return {
      code: DEFAULT_CURRENCY.code,
      symbol: DEFAULT_CURRENCY.symbol,
      name: DEFAULT_CURRENCY.nameAr,
      position: DEFAULT_CURRENCY.position,
      decimals: DEFAULT_CURRENCY.decimals,
    };
  }
}
