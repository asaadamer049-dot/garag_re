'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CurrencyInfo,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencyByCode,
  formatCurrencyAmount,
} from '@/lib/currency';

interface CurrencyContextType {
  currency: string;
  symbol: string;
  currencyName: string;
  position: 'before' | 'after';
  supportedCurrencies: CurrencyInfo[];
  formatAmount: (amount: number | string | null | undefined, decimals?: number) => string;
  updateCurrencyState: (newSettings: {
    currency: string;
    symbol?: string;
    name?: string;
    position?: 'before' | 'after';
  }) => void;
  refreshCurrency: () => Promise<void>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY.code,
  symbol: DEFAULT_CURRENCY.symbol,
  currencyName: DEFAULT_CURRENCY.nameAr,
  position: DEFAULT_CURRENCY.position,
  supportedCurrencies: SUPPORTED_CURRENCIES,
  formatAmount: (amount) => formatCurrencyAmount(amount),
  updateCurrencyState: () => {},
  refreshCurrency: async () => {},
  loading: false,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY.code);
  const [symbol, setSymbol] = useState<string>(DEFAULT_CURRENCY.symbol);
  const [currencyName, setCurrencyName] = useState<string>(DEFAULT_CURRENCY.nameAr);
  const [position, setPosition] = useState<'before' | 'after'>(DEFAULT_CURRENCY.position);
  const [loading, setLoading] = useState(true);

  const fetchCurrencySettings = useCallback(async () => {
    try {
      const res = await fetch('/api/system/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.currency) {
          const info = getCurrencyByCode(data.currency);
          setCurrency(data.currency);
          setSymbol(data.currencySymbol || info?.symbol || DEFAULT_CURRENCY.symbol);
          setCurrencyName(data.currencyName || info?.nameAr || DEFAULT_CURRENCY.nameAr);
          setPosition(data.currencyPosition || info?.position || DEFAULT_CURRENCY.position);
          
          // Also cache locally for instant load on subsequent renders
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'fleet_erp_currency',
              JSON.stringify({
                currency: data.currency,
                symbol: data.currencySymbol || info?.symbol || DEFAULT_CURRENCY.symbol,
                name: data.currencyName || info?.nameAr || DEFAULT_CURRENCY.nameAr,
                position: data.currencyPosition || info?.position || DEFAULT_CURRENCY.position,
              })
            );
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch currency settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Attempt fast local retrieval first
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('fleet_erp_currency');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.currency) {
            setCurrency(parsed.currency);
            setSymbol(parsed.symbol || DEFAULT_CURRENCY.symbol);
            setCurrencyName(parsed.name || DEFAULT_CURRENCY.nameAr);
            setPosition(parsed.position || DEFAULT_CURRENCY.position);
          }
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }

    fetchCurrencySettings();
  }, [fetchCurrencySettings]);

  const updateCurrencyState = useCallback(
    (newSettings: {
      currency: string;
      symbol?: string;
      name?: string;
      position?: 'before' | 'after';
    }) => {
      const info = getCurrencyByCode(newSettings.currency);
      const s = newSettings.symbol || info?.symbol || DEFAULT_CURRENCY.symbol;
      const n = newSettings.name || info?.nameAr || DEFAULT_CURRENCY.nameAr;
      const pos = newSettings.position || info?.position || DEFAULT_CURRENCY.position;

      setCurrency(newSettings.currency);
      setSymbol(s);
      setCurrencyName(n);
      setPosition(pos);

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'fleet_erp_currency',
          JSON.stringify({
            currency: newSettings.currency,
            symbol: s,
            name: n,
            position: pos,
          })
        );
      }
    },
    []
  );

  const formatAmount = useCallback(
    (amount: number | string | null | undefined, decimals?: number) => {
      return formatCurrencyAmount(amount, {
        code: currency,
        symbol,
        position,
        decimals,
      });
    },
    [currency, symbol, position]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        symbol,
        currencyName,
        position,
        supportedCurrencies: SUPPORTED_CURRENCIES,
        formatAmount,
        updateCurrencyState,
        refreshCurrency: fetchCurrencySettings,
        loading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
