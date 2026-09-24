import { Decimal } from 'decimal.js';

export type AmountRange = { minTotal: string; maxTotal: string };

function numeric(value: string) {
  const normalized = value.trim().replace(',', '.');
  return /^\d{1,18}(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : undefined;
}

// Round old decimal filters outwards in the panel draft; Cancel keeps the applied query.
export function wholeAmountRange(range: Partial<AmountRange>): AmountRange {
  const round = (value = '', direction: 'floor' | 'ceil') =>
    numeric(value) === undefined
      ? value.trim()
      : new Decimal(value.trim().replace(',', '.'))[direction]().toFixed(0);
  return { minTotal: round(range.minTotal, 'floor'), maxTotal: round(range.maxTotal, 'ceil') };
}

// Whole euros, rounding up so the most expensive record remains inside the scale.
export function amountRangeLimit(sectionMaximum = '0') {
  return Math.ceil(Math.max(0, numeric(sectionMaximum) ?? 0));
}

export function amountRangeValues(minimum: string, maximum: string, limit: number) {
  const range = wholeAmountRange({ minTotal: minimum, maxTotal: maximum });
  const upper = Math.max(0, Math.min(limit, numeric(range.maxTotal) ?? limit));
  return [Math.max(0, Math.min(upper, numeric(range.minTotal) ?? 0)), upper];
}

export function changeAmountRange(
  previous: AmountRange,
  next: number[],
  limit: number,
): AmountRange {
  previous = wholeAmountRange(previous);
  const values = amountRangeValues(previous.minTotal, previous.maxTotal, limit);
  return {
    minTotal: next[0] === values[0] ? previous.minTotal : next[0] === 0 ? '' : String(next[0]),
    maxTotal: next[1] === values[1] ? previous.maxTotal : next[1] === limit ? '' : String(next[1]),
  };
}
