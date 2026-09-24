import { z } from 'zod';
import { dateSchema } from '../shared/domain.ts';
import type { DashboardMetric } from '../shared/dashboard.ts';
import { pool, transaction } from './db.ts';
import { comparisonPeriods } from '../shared/kpi-comparisons.ts';
import { financialHistory, quoteHistory, previousMonthComparison, yearComparison } from './kpi-history.ts';

// Summary and drilldown share exactly the same scope and amount expression.
const definitions = {
  revenue: {
    amount: "CASE WHEN kind='credit' THEN -net ELSE net END",
    where: "(kind='invoice' OR (kind='credit' AND credit_side='sale')) AND status='issued'",
    monthly: true,
  },
  expenses: {
    amount: "CASE WHEN kind='credit' THEN -net ELSE net END",
    where:
      "(kind='purchase' OR (kind='credit' AND credit_side='purchase')) AND status IN ('recorded','issued')",
    monthly: true,
  },
  quotes: {
    amount: 'total',
    where: "kind='quote' AND status='sent'",
    monthly: false,
  },
  payable: {
    amount: 'balance',
    where:
      "(kind='purchase' OR (kind='credit' AND credit_side='sale')) AND status IN ('recorded','issued') AND balance<>0",
    monthly: false,
  },
} satisfies Record<DashboardMetric, { amount: string; where: string; monthly: boolean }>;
function scope(metric: DashboardMetric, date: string) {
  const d = definitions[metric];
  return (
    d.where +
    (d.monthly ? ` AND date>=date_trunc('month',${date}) AND date<${date}+1` : '') +
    (metric === 'quotes' ? ` AND due_date>=${date}` : '')
  );
}
export const dashboardSummarySql = `SELECT CURRENT_DATE::text AS as_of, ${(
  Object.keys(definitions) as DashboardMetric[]
)
  .map(
    (metric) =>
      `coalesce(sum(${definitions[metric].amount}) FILTER (WHERE ${scope(metric, 'CURRENT_DATE')}),0)::text AS ${metric}`,
  )
  .join(', ')} FROM document_balances`;

export const metricQuerySchema = z.object({
  asOf: dateSchema.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const metricSchema = z.enum(['revenue', 'expenses', 'quotes', 'payable']);
export function metricDetailSql(metric: DashboardMetric) {
  return `WITH matching AS (
    SELECT *, (${definitions[metric].amount})::text AS metric_amount
    FROM document_balances WHERE ${scope(metric, 'coalesce($1::date,CURRENT_DATE)')}
  ), page_rows AS (
    SELECT * FROM matching ORDER BY date DESC,created_at DESC,id LIMIT 25 OFFSET ($2::int-1)*25
  ) SELECT coalesce((SELECT jsonb_agg(p ORDER BY p.date DESC,p.created_at DESC,p.id) FROM page_rows p),'[]'::jsonb) AS rows,
    coalesce(sum(metric_amount::numeric),0)::text AS total, count(*)::int AS count,
    coalesce($1::date,CURRENT_DATE)::text AS as_of, $2::int AS page, 25 AS "pageSize"
    FROM matching`;
}
export async function dashboardDetail(metric: unknown, query: unknown) {
  const key = metricSchema.parse(metric);
  const q = metricQuerySchema.parse(query);
  return (await pool.query(metricDetailSql(key), [q.asOf ?? null, q.page])).rows[0];
}

export async function dashboardSummary() {
  return transaction(async (client) => {
    const summary = (await client.query(dashboardSummarySql)).rows[0];
    const [monthPeriod, yearPeriod] = comparisonPeriods(summary.as_of);
    const [financesMonth, financesYear, quotesMonth, quotesYear] = await Promise.all([
      financialHistory(client, monthPeriod.cutoff),
      financialHistory(client, yearPeriod.cutoff),
      quoteHistory(client, monthPeriod.cutoff),
      quoteHistory(client, yearPeriod.cutoff),
    ]);
    const previousMonth = {
      revenue: financesMonth.revenue,
      expenses: financesMonth.expenses,
      quotes: quotesMonth.sent,
      payable: financesMonth.dashboard_payable,
    };
    const previousYear = {
      revenue: financesYear.revenue,
      expenses: financesYear.expenses,
      quotes: quotesYear.sent,
      payable: financesYear.dashboard_payable,
    };
    return {
      ...summary,
      comparisons: Object.fromEntries(
        (Object.keys(previousMonth) as DashboardMetric[]).map((id) => [
          id,
          [
            previousMonthComparison(
              summary.as_of,
              summary[id],
              previousMonth[id],
              definitions[id].monthly,
            ),
            yearComparison(summary.as_of, summary[id], previousYear[id], definitions[id].monthly),
          ],
        ]),
      ),
    };
  }, true);
}
