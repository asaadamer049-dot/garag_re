export interface CurrencyInfo {
  code: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
  symbolNative: string;
  position: 'before' | 'after';
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: 'ر.س', symbolNative: 'ر.س', position: 'after', decimals: 2 },
  { code: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ', symbolNative: 'د.إ', position: 'after', decimals: 2 },
  { code: 'KWD', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', symbol: 'د.ك', symbolNative: 'د.ك', position: 'after', decimals: 3 },
  { code: 'BHD', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', symbol: 'د.ب', symbolNative: 'د.ب', position: 'after', decimals: 3 },
  { code: 'OMR', nameAr: 'ريال عماني', nameEn: 'Omani Rial', symbol: 'ر.ع', symbolNative: 'ر.ع', position: 'after', decimals: 3 },
  { code: 'QAR', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', symbol: 'ر.ق', symbolNative: 'ر.ق', position: 'after', decimals: 2 },
  { code: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', symbol: 'ج.م', symbolNative: 'ج.م', position: 'after', decimals: 2 },
  { code: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', symbol: 'د.أ', symbolNative: 'د.أ', position: 'after', decimals: 3 },
  { code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$', symbolNative: '$', position: 'before', decimals: 2 },
  { code: 'EUR', nameAr: 'يورو', nameEn: 'Euro', symbol: '€', symbolNative: '€', position: 'after', decimals: 2 },
  { code: 'GBP', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', symbol: '£', symbolNative: '£', position: 'before', decimals: 2 },
  { code: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', symbol: '₺', symbolNative: '₺', position: 'after', decimals: 2 },
  { code: 'IQD', nameAr: 'دينار عراقي', nameEn: 'Iraqi Dinar', symbol: 'د.ع', symbolNative: 'د.ع', position: 'after', decimals: 0 },
  { code: 'LYD', nameAr: 'دينار ليبي', nameEn: 'Libyan Dinar', symbol: 'د.ل', symbolNative: 'د.ل', position: 'after', decimals: 3 },
  { code: 'DZD', nameAr: 'دينار جزائري', nameEn: 'Algerian Dinar', symbol: 'د.ج', symbolNative: 'د.ج', position: 'after', decimals: 2 },
  { code: 'MAD', nameAr: 'درهم مغربي', nameEn: 'Moroccan Dirham', symbol: 'د.م.', symbolNative: 'د.م.', position: 'after', decimals: 2 },
  { code: 'SDG', nameAr: 'جنيه سوداني', nameEn: 'Sudanese Pound', symbol: 'ج.س', symbolNative: 'ج.س', position: 'after', decimals: 2 },
  { code: 'YER', nameAr: 'ريال يمني', nameEn: 'Yemeni Rial', symbol: 'ر.ي', symbolNative: 'ر.ي', position: 'after', decimals: 2 },
];

export const DEFAULT_CURRENCY: CurrencyInfo = SUPPORTED_CURRENCIES[0]; // SAR

export function getCurrencyByCode(code?: string | null): CurrencyInfo | undefined {
  if (!code) return DEFAULT_CURRENCY;
  const upper = code.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.find((c) => c.code === upper);
}

export function formatCurrencyAmount(
  amount: number | string | null | undefined,
  options?: {
    code?: string;
    symbol?: string;
    position?: 'before' | 'after';
    decimals?: number;
  }
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0';
  }

  const num = typeof amount === 'number' ? amount : Number(amount);
  const info = getCurrencyByCode(options?.code);
  const symbol = options?.symbol || info?.symbol || 'ر.س';
  const position = options?.position || info?.position || 'after';
  const decimals = options?.decimals !== undefined ? options.decimals : (info?.decimals ?? 2);

  const formattedNum = num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return position === 'before' ? `${symbol} ${formattedNum}` : `${formattedNum} ${symbol}`;
}
