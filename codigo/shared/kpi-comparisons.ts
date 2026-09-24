import { Decimal } from 'decimal.js';

export type KpiComparison = {
  period: 'month' | 'year';
  from?: string;
  to: string;
  value: string;
  percent: string | null;
};

// Match the day of the month; shorter months stop on their last day.
export function comparisonPeriods(asOf: string) {
  const current = new Date(asOf + 'T12:00:00Z');
  return (['month', 'year'] as const).map((period) => {
    const target = new Date(current);
    target.setUTCDate(1);
    if (period === 'month') target.setUTCMonth(target.getUTCMonth() - 1);
    else target.setUTCFullYear(target.getUTCFullYear() - 1);
    const start = target.toISOString().slice(0, 10);
    const end = new Date(target);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    target.setUTCDate(Math.min(current.getUTCDate(), end.getUTCDate()));
    return { period, start, cutoff: target.toISOString().slice(0, 10) };
  });
}

export function comparisonPercent(current: string, previous: string): string | null {
  const before = new Decimal(previous),
    after = new Decimal(current);
  if (before.isZero()) return after.isZero() ? '0.0' : null;
  const percent = after.minus(before).div(before.abs()).times(100);
  // Preserve small changes so the UI never describes a rounded percentage as no change.
  return !percent.isZero() && percent.abs().lt('0.05') ? percent.toString() : percent.toFixed(1);
}
