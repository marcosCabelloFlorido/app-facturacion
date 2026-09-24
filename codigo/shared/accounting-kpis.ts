import { Decimal } from 'decimal.js';
export type KpiJournalEntry = {
  event: string;
  lines: { account: string; debit: string; credit: string }[];
};
export function matchesAccountingMetric(entry: KpiJournalEntry, metric: string) {
  if (metric === 'manual') return entry.event === 'manual';
  return entry.lines.some((line) =>
    metric === 'revenue'
      ? line.account.startsWith('7')
      : metric === 'expenses'
        ? line.account.startsWith('6')
        : metric === 'result'
          ? /^[67]/.test(line.account)
          : true,
  );
}
export function accountingKpis(trial: { account: string; debit: string; credit: string }[]) {
  const net = (prefix: string) =>
    trial
      .filter((row) => row.account.startsWith(prefix))
      .reduce((sum, row) => sum.plus(new Decimal(row.credit).minus(row.debit)), new Decimal(0));
  const revenue = net('7');
  const expenses = net('6').negated();
  return {
    revenue: revenue.toFixed(2),
    expenses: expenses.toFixed(2),
    result: revenue.minus(expenses).toFixed(2),
  };
}
