import type { PoolClient } from 'pg';
import {
  comparisonPeriods,
  comparisonPercent,
  type KpiComparison,
} from '../shared/kpi-comparisons.ts';

// Reconstruct balances by effective operation date, including both sides of a
// credit application. The same outstanding installments explain all payment KPIs.
export async function financialHistory(client: PoolClient, cutoff: string) {
  return (
    await client.query(
      `
    WITH settlements AS (
      SELECT document_id,amount FROM payments
      WHERE date<=$1::date AND (reversal_date IS NULL OR reversal_date>$1::date)
      UNION ALL
      SELECT side.document_id,a.amount FROM credit_applications a
      JOIN documents c ON c.id=a.credit_id AND c.status='issued' AND c.date<=$1::date
      CROSS JOIN LATERAL (VALUES (a.invoice_id),(a.credit_id)) side(document_id)
      UNION ALL
      SELECT document_id,amount FROM fund_applications WHERE kind='apply' AND date<=$1::date
    ), settled AS (
      SELECT document_id,sum(amount) AS amount FROM settlements GROUP BY document_id
    ), balances AS (
      SELECT d.*,coalesce(s.amount,0) AS settled,d.total-coalesce(s.amount,0) AS balance,
        CASE WHEN d.kind='invoice' OR (d.kind='credit' AND d.credit_side='purchase')
          THEN 'receivable' ELSE 'payable' END AS direction
      FROM documents d LEFT JOIN settled s ON s.document_id=d.id
      WHERE d.kind IN ('invoice','purchase','credit') AND d.status IN ('issued','recorded')
        AND d.date<=$1::date
    ), latest_schedules AS (
      SELECT DISTINCT ON (s.document_id) s.document_id,s.id
      FROM document_schedules s JOIN balances b ON b.id=s.document_id
      WHERE s.created_at<($1::date+1)::timestamptz ORDER BY s.document_id,s.version DESC
    ), dues AS (
      SELECT b.id AS document_id,b.direction,b.settled,v.position,v.due_date,v.amount
      FROM balances b JOIN latest_schedules s ON s.document_id=b.id
      JOIN document_dues v ON v.schedule_id=s.id WHERE b.balance>0
      UNION ALL
      SELECT b.id,b.direction,b.settled,0,b.due_date,b.total FROM balances b
      WHERE b.balance>0 AND NOT EXISTS (SELECT 1 FROM latest_schedules s WHERE s.document_id=b.id)
    ), ordered_dues AS (
      SELECT *,coalesce(sum(amount) OVER (
        PARTITION BY document_id ORDER BY due_date,position
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS previous
      FROM dues
    ), pending AS (
      SELECT *,greatest(0,amount-greatest(0,settled-previous)) AS balance FROM ordered_dues
    )
    SELECT
      coalesce((SELECT sum(CASE WHEN kind='credit' THEN -net ELSE net END) FROM balances
        WHERE (kind='invoice' OR (kind='credit' AND credit_side='sale'))
          AND date>=date_trunc('month',$1::date)),0)::text AS revenue,
      coalesce((SELECT sum(CASE WHEN kind='credit' THEN -net ELSE net END) FROM balances
        WHERE (kind='purchase' OR (kind='credit' AND credit_side='purchase'))
          AND date>=date_trunc('month',$1::date)),0)::text AS expenses,
      coalesce((SELECT sum(balance) FROM balances
        WHERE direction='payable' AND balance<>0),0)::text AS dashboard_payable,
      coalesce(sum(balance) FILTER (WHERE direction='receivable'),0)::text AS receivable,
      coalesce(sum(balance) FILTER (WHERE direction='payable'),0)::text AS payable,
      coalesce(sum(balance) FILTER (WHERE due_date<$1::date),0)::text AS overdue,
      coalesce(sum(balance) FILTER (WHERE due_date>=$1::date),0)::text AS upcoming
    FROM pending WHERE balance>0
  `,
      [cutoff],
    )
  ).rows[0] as Record<string, string>;
}

// Confirmation and acceptance/rejection/conversion are real recorded transitions.
// Today's quote status must not overwrite what was pending at the historical cutoff.
export async function quoteHistory(client: PoolClient, cutoff: string) {
  return (
    await client.query(
      `
    WITH historical_quotes AS (
      SELECT d.total,d.due_date,coalesce(event.status,'sent') AS status
      FROM documents d
      LEFT JOIN LATERAL (
        SELECT CASE a.action
          WHEN 'Presupuesto aceptado' THEN 'accepted'
          WHEN 'Presupuesto rechazado' THEN 'rejected'
          WHEN 'Presupuesto convertido a borrador de factura' THEN 'converted'
        END AS status
        FROM audit_events a WHERE a.entity_id=d.id::text
          AND a.action IN ('Presupuesto aceptado','Presupuesto rechazado','Presupuesto convertido a borrador de factura')
          AND a.created_at<($1::date+1)::timestamptz
        ORDER BY a.created_at DESC,a.id DESC LIMIT 1
      ) event ON true
      WHERE d.kind='quote' AND d.status<>'draft' AND d.date<=$1::date
        AND d.issued_at<($1::date+1)::timestamptz
    )
    SELECT
      coalesce(sum(total) FILTER (WHERE status='sent' AND due_date>=$1::date),0)::text AS sent,
      coalesce(sum(total) FILTER (WHERE status='accepted'),0)::text AS accepted,
      coalesce(sum(total) FILTER (WHERE status='sent' AND due_date<$1::date),0)::text AS expired
    FROM historical_quotes
  `,
      [cutoff],
    )
  ).rows[0] as Record<string, string>;
}

export function previousMonthComparison(
  asOf: string,
  current: string,
  value: string,
  monthly = false,
): KpiComparison {
  const period = comparisonPeriods(asOf)[0];
  return {
    period: 'month',
    ...(monthly ? { from: period.start } : {}),
    to: period.cutoff,
    value,
    percent: comparisonPercent(current, value),
  };
}

// Same month last year, alongside the previous-month comparison.
export function yearComparison(
  asOf: string,
  current: string,
  value: string,
  monthly = false,
): KpiComparison {
  const period = comparisonPeriods(asOf)[1];
  return {
    period: 'year',
    ...(monthly ? { from: period.start } : {}),
    to: period.cutoff,
    value,
    percent: comparisonPercent(current, value),
  };
}
