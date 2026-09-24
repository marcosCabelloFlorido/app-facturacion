import type { PoolClient } from 'pg';
import { comparisonPeriods, comparisonPercent } from '../shared/kpi-comparisons.ts';
import type { ModuleKpi } from '../shared/module-kpis.ts';
import { quoteHistory, previousMonthComparison, yearComparison } from './kpi-history.ts';

// Historical balances use operation dates, including payment reversals and non-cash
// settlements. Overdue keeps the existing KPI definition: the remaining balance of
// invoices with at least one unpaid overdue installment, rather than just that installment.
export async function addDocumentComparisons(
  client: PoolClient,
  kind: string,
  asOf: string,
  items: ModuleKpi[],
) {
  if (kind === 'quote') {
    const [monthPeriod, yearPeriod] = comparisonPeriods(asOf);
    const [historyMonth, historyYear] = await Promise.all([
      quoteHistory(client, monthPeriod.cutoff),
      quoteHistory(client, yearPeriod.cutoff),
    ]);
    for (const item of items)
      item.comparisons = [
        previousMonthComparison(asOf, item.value, historyMonth[item.id]),
        yearComparison(asOf, item.value, historyYear[item.id]),
      ];
    return;
  }
  const periods = comparisonPeriods(asOf);
  const rows = (
    await client.query(
      `
    WITH periods AS (
      SELECT * FROM jsonb_to_recordset($2::jsonb) AS p(period text,start date,cutoff date)
    ), settlements AS (
      SELECT r.period,p.document_id,p.amount FROM periods r JOIN payments p
        ON p.date<=r.cutoff AND (p.reversal_date IS NULL OR p.reversal_date>r.cutoff)
      UNION ALL
      SELECT r.period,a.invoice_id,a.amount FROM periods r JOIN documents c
        ON c.kind='credit' AND c.status='issued' AND c.date<=r.cutoff
        JOIN credit_applications a ON a.credit_id=c.id
      UNION ALL
      SELECT r.period,a.document_id,a.amount FROM periods r JOIN fund_applications a
        ON a.kind='apply' AND a.date<=r.cutoff
    ), settled AS (
      SELECT period,document_id,sum(amount) AS amount FROM settlements GROUP BY period,document_id
    ), balances AS (
      SELECT r.period,r.start,r.cutoff,d.*,coalesce(s.amount,0) AS settled,
        d.total-coalesce(s.amount,0) AS balance
      FROM periods r JOIN documents d ON d.date<=r.cutoff
      LEFT JOIN settled s ON s.period=r.period AND s.document_id=d.id
      WHERE d.status IN ('issued','recorded') AND
        (d.kind=$1 OR (d.kind='credit' AND d.credit_side=CASE WHEN $1='invoice' THEN 'sale' ELSE 'purchase' END))
    ), latest_schedules AS (
      SELECT DISTINCT ON (b.period,b.id) b.period,b.id AS document_id,s.id AS schedule_id
      FROM balances b JOIN document_schedules s ON s.document_id=b.id AND s.created_at<(b.cutoff+1)::timestamptz
      ORDER BY b.period,b.id,s.version DESC
    ), overdue_dues AS (
      SELECT b.period,b.id AS document_id,sum(v.amount) AS amount
      FROM balances b JOIN latest_schedules s ON s.period=b.period AND s.document_id=b.id
      JOIN document_dues v ON v.schedule_id=s.schedule_id AND v.due_date<b.cutoff
      GROUP BY b.period,b.id
      UNION ALL
      SELECT b.period,b.id,b.total FROM balances b WHERE b.due_date<b.cutoff
        AND NOT EXISTS (SELECT 1 FROM latest_schedules s WHERE s.period=b.period AND s.document_id=b.id)
    )
    SELECT r.period,
      coalesce(sum(CASE WHEN b.kind='credit' THEN -b.net ELSE b.net END) FILTER (WHERE b.date>=r.start),0)::text AS month,
      coalesce(sum(b.balance) FILTER (WHERE b.kind=$1 AND b.balance>0),0)::text AS pending,
      coalesce(sum(b.balance) FILTER (WHERE b.kind=$1 AND b.balance>0 AND o.amount>b.settled),0)::text AS overdue
    FROM periods r LEFT JOIN balances b ON b.period=r.period
    LEFT JOIN overdue_dues o ON o.period=b.period AND o.document_id=b.id
    GROUP BY r.period
  `,
      [kind === 'purchase' ? 'purchase' : 'invoice', JSON.stringify(periods)],
    )
  ).rows;
  for (const item of items)
    item.comparisons = periods.map((p) => {
      const value = rows.find((r) => r.period === p.period)![item.id] as string;
      return {
        period: p.period,
        ...(item.id === 'month' ? { from: p.start } : {}),
        to: p.cutoff,
        value,
        percent: comparisonPercent(item.value, value),
      };
    });
}
