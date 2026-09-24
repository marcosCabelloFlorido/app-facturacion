import { readSearch, searchWhere, searchOrder } from './advanced-search.ts';
import { z } from 'zod';
import { dueSortValues, type DueSort } from '../shared/due-dates.ts';
import { pool } from './db.ts';
import type { DashboardDues, DueDateList } from '../shared/due-dates.ts';

// Count the complete schedule before removing settled installments. The existing
// view applies payments and credits to the earliest installments first.
export const pendingDuesCte = `WITH all_dues AS (
  SELECT v.*,d.number,d.party->>'name' AS party_name,d.party->>'taxId' AS party_tax_id,
    count(*) OVER (PARTITION BY v.document_id)::int AS installment_count,
    CASE WHEN d.kind='invoice' OR (d.kind='credit' AND d.credit_side='purchase')
      THEN 'receivable' ELSE 'payable' END AS direction
  FROM document_due_balances v JOIN document_balances d ON d.id=v.document_id
  WHERE d.kind IN ('invoice','purchase','credit') AND d.status IN ('issued','recorded') AND d.balance>0
), pending_dues AS (
  SELECT document_id,number,party_name,party_tax_id,position,installment_count,due_date,balance::text AS balance,direction
  FROM all_dues WHERE balance>0
)`;

const summary = `count(*)::int AS count,coalesce(sum(balance::numeric),0)::text AS amount,
  coalesce(sum(balance::numeric) FILTER (WHERE direction='receivable'),0)::text AS receivable,
  coalesce(sum(balance::numeric) FILTER (WHERE direction='payable'),0)::text AS payable`;
const order = 'due_date,document_id,position';
export const dashboardDuesSql = `${pendingDuesCte}
SELECT CURRENT_DATE::text AS as_of,
  (SELECT row_to_json(s) FROM (SELECT ${summary} FROM pending_dues WHERE due_date<CURRENT_DATE) s) AS overdue,
  (SELECT coalesce(json_agg(u ORDER BY ${order}),'[]'::json) FROM
    (SELECT * FROM pending_dues WHERE due_date>=CURRENT_DATE ORDER BY ${order} LIMIT 3) u) AS upcoming`;

export const dueDateFilters = z.object({
  status: z.enum(['all', 'overdue', 'upcoming']).default('all'),
  sort: z.enum(dueSortValues).default('default'),
  direction: z.enum(['all', 'receivable', 'payable']).default('all'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  search: z.string().trim().max(4096).default(''),
  around: z
    .string()
    .regex(/^[0-9a-f-]{36}(?::[0-9]+)?$/i)
    .optional(),
});
export const dueDateListSql = `${pendingDuesCte}, filtered AS (
  SELECT pd.* FROM pending_dues pd JOIN document_balances d ON d.id=pd.document_id
  WHERE ($1='all' OR ($1='overdue' AND pd.due_date<CURRENT_DATE) OR ($1='upcoming' AND pd.due_date>=CURRENT_DATE))
    AND ($2='all' OR pd.direction=$2)
    AND strpos(lower(concat_ws(' ',pd.number,pd.party_name,d.party->>'taxId')),lower($4))>0
), totals AS (SELECT ${summary} FROM filtered)
SELECT CURRENT_DATE::text AS as_of,totals.*,$3::int AS page,25 AS "pageSize",
  (SELECT coalesce(json_agg(r ORDER BY ${order}),'[]'::json) FROM
    (SELECT * FROM filtered ORDER BY ${order} LIMIT 25 OFFSET ($3::int-1)*25) r) AS rows
FROM totals`;

export const dueDateNavigationSql = `${pendingDuesCte}, filtered AS (
  SELECT pd.* FROM pending_dues pd JOIN document_balances d ON d.id=pd.document_id
  WHERE ($1='all' OR ($1='overdue' AND pd.due_date<CURRENT_DATE) OR ($1='upcoming' AND pd.due_date>=CURRENT_DATE))
    AND ($2='all' OR pd.direction=$2)
    AND strpos(lower(concat_ws(' ',pd.number,pd.party_name,d.party->>'taxId')),lower($4))>0
), totals AS (SELECT ${summary} FROM filtered), ordered AS (
  SELECT *,row_number() OVER(ORDER BY ${order}) AS record_position FROM filtered
), current_due AS (
  SELECT min(record_position)::int AS record_position FROM ordered
  WHERE document_id::text=$5 OR document_id::text || ':' || position::text=$5
)
SELECT CURRENT_DATE::text AS as_of,totals.*,$3::int AS page,25 AS "pageSize",
  (SELECT record_position FROM current_due) AS "navigationPosition",
  (SELECT coalesce(json_agg(to_jsonb(r)-'record_position' ORDER BY record_position),'[]'::json) FROM
    (SELECT * FROM ordered WHERE $5::text IS NULL OR record_position BETWEEN
      (SELECT record_position-1 FROM current_due) AND (SELECT record_position+1 FROM current_due)
    ORDER BY record_position LIMIT CASE WHEN $5::text IS NULL THEN 25 ELSE 3 END
    OFFSET CASE WHEN $5::text IS NULL THEN ($3::int-1)*25 ELSE 0 END) r) AS rows
FROM totals`;

export async function dashboardDueDates(): Promise<DashboardDues> {
  return (await pool.query<DashboardDues>(dashboardDuesSql)).rows[0];
}
export function sortedDueDateSql(sort: DueSort, around = false) {
  const orders: Record<DueSort, string> = {
    default: order,
    due_desc: 'due_date DESC,document_id,position',
    due_asc: 'due_date ASC,document_id,position',
    balance_desc: 'balance::numeric DESC,due_date,document_id,position',
    balance_asc: 'balance::numeric ASC,due_date,document_id,position',
  };
  return (around ? dueDateNavigationSql : dueDateListSql).replaceAll(order, orders[sort]);
}
export async function listDueDates(query: unknown): Promise<DueDateList> {
  const filters = dueDateFilters.parse(query);
  const plan = readSearch(filters.search, 'pending');
  const values: unknown[] = [
    plan ? 'all' : filters.status,
    plan ? 'all' : filters.direction,
    filters.page,
    '',
    ...(filters.around ? [filters.around] : []),
  ];
  const where = searchWhere(
    filters.search,
    'pending',
    {
      text: "concat_ws(' ',pd.number,pd.party_name,d.party->>'taxId')",
      date: 'pd.due_date',
      amount: 'pd.balance::numeric',
      direction: 'pd.direction',
      status: { overdue: 'pd.due_date<CURRENT_DATE', upcoming: 'pd.due_date>=CURRENT_DATE' },
    },
    values,
  );
  const base = plan
    ? (filters.around ? dueDateNavigationSql : dueDateListSql).replaceAll(
        order,
        searchOrder(filters.search, 'pending', order, 'due_date', 'balance::numeric'),
      )
    : sortedDueDateSql(filters.sort, !!filters.around);
  const sql = base.replace(
    "strpos(lower(concat_ws(' ',pd.number,pd.party_name,d.party->>'taxId')),lower($4))>0",
    "($4::text = '' AND (" + where + '))',
  );
  return (await pool.query<DueDateList>(sql, values)).rows[0];
}
