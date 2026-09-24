import { Decimal } from 'decimal.js';
import type { AdvancedSalesFilters } from '../shared/sales-tools.ts';
import { z } from 'zod';
import {
  calculate,
  dateSchema,
  lineSchema,
  type DocumentInput,
  type FinancialDocument,
} from '../shared/domain.ts';
import type {
  DocumentDateRange,
  DocumentList,
  DocumentSort,
  WorkingDraftListItem,
} from '../shared/document-list.ts';
import { transaction } from './db.ts';

type Work = {
  resource_key: string;
  payload: DocumentInput;
  version: number;
  step: number;
};

function workingItem(work: Work): WorkingDraftListItem {
  const input = work.payload;
  const lines = z.array(lineSchema).min(1).safeParse(input.lines);
  const retention = z.enum(['0', '7', '15', '19']).safeParse(input.retentionRate);
  const total =
    lines.success && retention.success ? calculate(lines.data, retention.data).total : null;
  return {
    id: 'work:' + work.resource_key,
    kind: input.kind,
    status: 'draft',
    number: null,
    party: input.party,
    reference: input.reference,
    date: dateSchema.safeParse(input.date).success ? input.date : '',
    due_date: dateSchema.safeParse(input.dueDate).success ? input.dueDate : '',
    total,
    balance: '0',
    lines: input.lines.map(({ description }) => ({ description })),
    workingDraft: { resourceKey: work.resource_key, version: work.version, step: work.step },
  };
}

/** Saved drafts and the current user's unfinished work share search and pagination. */
export async function listDocumentDrafts(
  query: {
    kind?: string;
    search: string;
    page: number;
    sort?: DocumentSort;
    customer?: string;
  } & DocumentDateRange &
    AdvancedSalesFilters,
  ownerId: string,
  all = false,
): Promise<DocumentList> {
  const cte = `WITH editable_work AS (
    SELECT w.* FROM working_drafts w
    LEFT JOIN document_balances d ON w.resource_key LIKE 'edit:%'
      AND d.id::text = split_part(w.resource_key, ':', 2)
    WHERE w.owner_id = $1
      AND (w.resource_key LIKE 'new:%' OR (d.status = 'draft' AND d.kind = w.payload->>'kind'))
      AND ($2 = 'all' OR w.payload->>'kind' = $2 OR ($2 = 'sales' AND w.payload->>'kind' = 'invoice'))
  ), entries AS (
    SELECT to_jsonb(d) AS document, NULL::jsonb AS work,
      d.date::text AS sort_date, d.created_at AS sort_time, d.id::text AS sort_key,
      d.due_date::text AS sort_due_date, d.date AS issue_date,
      upper(regexp_replace(d.party->>'taxId','[[:space:].-]','','g')) AS tax_key,
      concat_ws(' ', d.number, d.party->>'name', d.party->>'taxId', d.reference) AS search_text
    FROM document_balances d
    WHERE d.status = 'draft'
      AND ($2 = 'all' OR d.kind = $2
        OR ($2 = 'sales' AND (d.kind = 'invoice' OR (d.kind = 'credit' AND d.credit_side = 'sale')))
        OR ($2 = 'purchase' AND d.kind = 'credit' AND d.credit_side = 'purchase'))
      AND NOT EXISTS (SELECT 1 FROM editable_work w
        WHERE w.resource_key LIKE 'edit:%' AND split_part(w.resource_key, ':', 2) = d.id::text)
    UNION ALL
    SELECT NULL::jsonb, to_jsonb(w),
      CASE WHEN w.payload->>'date' ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN w.payload->>'date'
        ELSE w.updated_at::date::text END,
      w.updated_at, w.resource_key,
      CASE WHEN w.payload->>'dueDate' ~ '^\\d{4}-\\d{2}-\\d{2}$'
        AND pg_input_is_valid(w.payload->>'dueDate', 'date') THEN w.payload->>'dueDate' END,
      CASE WHEN w.payload->>'date' ~ '^\\d{4}-\\d{2}-\\d{2}$'
        AND pg_input_is_valid(w.payload->>'date', 'date') THEN (w.payload->>'date')::date END,
      upper(regexp_replace(w.payload->'party'->>'taxId','[[:space:].-]','','g')),
      concat_ws(' ', w.payload->'party'->>'name', w.payload->'party'->>'taxId', w.payload->>'reference')
    FROM editable_work w
  ), matches AS (SELECT * FROM entries WHERE search_text ILIKE $3
    AND ($4::date IS NULL OR issue_date >= $4::date)
    AND ($5::date IS NULL OR issue_date <= $5::date)
    AND ($6::text IS NULL OR tax_key=$6))`;
  const params = [
    ownerId,
    query.kind || 'all',
    `%${query.search.replace(/[\\%_]/g, '\\$&')}%`,
    query.from || null,
    query.to || null,
    query.customer || null,
  ];
  const order =
    query.sort === 'due_asc' || query.sort === 'due_desc'
      ? `sort_due_date ${query.sort === 'due_asc' ? 'ASC' : 'DESC'} NULLS LAST,sort_date DESC,sort_time DESC,sort_key`
      : 'sort_date DESC,sort_time DESC,sort_key';
  return transaction(async (client) => {
    const result = await client.query<{ document: FinancialDocument | null; work: Work | null }>(
      `${cte} SELECT document, work FROM matches ORDER BY ${order}`,
      params,
    );
    const rows = result.rows
      .map((row) => (row.work ? workingItem(row.work) : row.document!))
      .filter(
        (row) =>
          (!query.dueFrom || (!!row.due_date && row.due_date >= query.dueFrom)) &&
          (!query.dueTo || (!!row.due_date && row.due_date <= query.dueTo)) &&
          (!query.minTotal || (row.total !== null && new Decimal(row.total).gte(query.minTotal))) &&
          (!query.maxTotal || (row.total !== null && new Decimal(row.total).lte(query.maxTotal))),
      );
    if (query.sort === 'total_asc' || query.sort === 'total_desc')
      rows.sort((a, b) =>
        a.total === null
          ? b.total === null
            ? 0
            : 1
          : b.total === null
            ? -1
            : new Decimal(a.total).cmp(b.total) * (query.sort === 'total_asc' ? 1 : -1),
      );
    if (query.sort === 'date_asc')
      rows.sort((a, b) =>
        !a.date ? (!b.date ? 0 : 1) : !b.date ? -1 : a.date.localeCompare(b.date),
      );
    const total = rows.reduce(
      (sum, row) =>
        row.total === null
          ? sum
          : sum.plus(new Decimal(row.total).times(row.kind === 'credit' ? -1 : 1)),
      new Decimal(0),
    );
    return {
      rows: all ? rows : rows.slice((query.page - 1) * 25, query.page * 25),
      count: rows.length,
      page: query.page,
      pageSize: 25,
      summary: {
        total: total.toFixed(2),
        receivable: '0.00',
        refunds: '0.00',
        drafts: rows.length,
        unknown: rows.filter((row) => row.total === null).length,
      },
    };
  }, true);
}
