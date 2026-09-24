import Decimal from 'decimal.js';

/** Present unit prices with two decimals without changing stored precision. */
export function formatUnitPrice(value: string): string {
  if (!/^(\d{1,10})(?:\.(\d{1,4}))?$/.test(value)) return value.replace('.', ',');
  return new Decimal(value).toFixed(2, Decimal.ROUND_HALF_UP).replace('.', ',');
}
