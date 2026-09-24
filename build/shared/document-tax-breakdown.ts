import { Decimal } from 'decimal.js';
import { money } from './domain.ts';

// Add the tax rounded per line, preserving the document's original calculation.
export function documentTaxBreakdown(lines: { taxRate: string; tax: string }[]) {
  const taxes = new Map<string, Decimal>();
  for (const line of lines) {
    taxes.set(line.taxRate, (taxes.get(line.taxRate) || new Decimal(0)).plus(line.tax));
  }
  return Array.from(taxes, ([rate, amount]) => ({ rate, amount: money(amount) })).sort(
    (a, b) => Number(b.rate) - Number(a.rate),
  );
}
