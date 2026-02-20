import type { Currency } from './types';

// Mocked exchange rates relative to USD
export const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.012,
  JPY: 0.0067,
  AUD: 0.65,
  CAD: 0.74,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
};

export const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD'];

export function convertToBase(amount: number, from: Currency, to: Currency, manualRate?: number): {
  converted: number;
  rate: number;
} {
  if (from === to) return { converted: amount, rate: 1 };
  if (manualRate !== undefined) {
    return { converted: amount * manualRate, rate: manualRate };
  }
  // Convert: from → USD → to
  const toUSD = amount * EXCHANGE_RATES[from];
  const rate = EXCHANGE_RATES[from] / EXCHANGE_RATES[to];
  const converted = toUSD / EXCHANGE_RATES[to];
  return { converted: Math.round(converted * 100) / 100, rate: Math.round(rate * 10000) / 10000 };
}

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toFixed(2)}`;
}
