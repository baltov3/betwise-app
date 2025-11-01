export const PLATFORM_CURRENCY = 'EUR';

export function formatCurrency(value: number, locale = 'bg-BG') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: PLATFORM_CURRENCY }).format(value ?? 0);
}