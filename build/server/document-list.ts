import type { DocumentQuery, SalesListSummary } from '../shared/sales-tools.ts';
import { documentQuerySchema } from '../shared/sales-tools.ts';
import type { DocumentList } from '../shared/document-list.ts';
import { transaction } from './db.ts';
import { documentMetricCondition } from './module-kpis.ts';
import { listDocumentDrafts } from './document-drafts.ts';

export async function listDocuments(
  input: unknown,
  ownerId: string | null,
  all = false,
  around?: string,
): Promise<DocumentList> {
  const q = documentQuerySchema.parse(input);
  if (!q.metric && q.status === 'draft' && q.includeWorkingDrafts && ownerId) {
    const list = await listDocumentDrafts(q, ownerId, all || !!around);
    if (around) {
      const index = list.rows.findIndex((row) => row.id === around);
      list.position = index < 0 ? null : index + 1;
      list.rows = index < 0 ? [] : list.rows.slice(Math.max(0, index - 1), index + 2);
    }
    return list;
  }
  const conditions: string[] = [],
    params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };
  if (q.kind === 'sales')
    conditions.push("(kind='invoice' OR (kind='credit' AND credit_side='sale'))");
  else if (q.kind === 'purchase')
    conditions.push("(kind='purchase' OR (kind='credit' AND credit_side='purchase'))");
  else if (q.kind) add('kind=?', q.kind);
  if (q.metric) {
    let cutoff = 'CURRENT_DATE';
    if (['month', 'overdue', 'sent', 'expired'].includes(q.metric)) {
      params.push(q.asOf || null);
      cutoff = `coalesce($${params.length}::date,CURRENT_DATE)`;
    }
    conditions.push(documentMetricCondition(q.kind || 'sales', q.metric, cutoff));
  }
  if (q.customer)
    add("upper(regexp_replace(party->>'taxId','[[:space:].-]','','g'))=?", q.customer);
  if (q.from) add('date>=?::date', q.from);
  if (q.to) add('date<=?::date', q.to);
  const dueDate =
    'coalesce((SELECT min(v.due_date) FROM document_due_balances v WHERE v.document_id=document_balances.id AND v.balance>0),document_balances.due_date)';
  if (q.dueFrom) add(dueDate + '>=?::date', q.dueFrom);
  if (q.dueTo) add(dueDate + '<=?::date', q.dueTo);
  if (q.minTotal) add('total>=?::numeric', q.minTotal);
  if (q.maxTotal) add('total<=?::numeric', q.maxTotal);
  if (q.search)
    add(
      "concat_ws(' ',number,party->>'name',party->>'taxId',reference) ILIKE ?",
      `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
    );
  if (q.kind === 'quote' && q.status === 'expired')
    conditions.push("status='sent' AND due_date<CURRENT_DATE");
  else if (q.status === 'overdue')
    conditions.push(
      "status IN ('issued','recorded') AND balance>0 AND EXISTS(SELECT 1 FROM document_due_balances v WHERE v.document_id=document_balances.id AND v.balance>0 AND v.due_date<CURRENT_DATE)",
    );
  else if (q.status === 'paid') conditions.push("status IN ('issued','recorded') AND balance=0");
  else if (q.status === 'unpaid') conditions.push("status IN ('issued','recorded') AND balance>0");
  else if (q.status !== 'all') add('status=?', q.status);
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const sort: Record<DocumentQuery['sort'], string> = {
    default: 'date DESC',
    date_asc: 'date ASC',
    due_asc: dueDate + ' ASC NULLS LAST',
    due_desc: dueDate + ' DESC NULLS LAST',
    total_asc: 'total ASC',
    total_desc: 'total DESC',
    balance_desc: "CASE WHEN status IN ('issued','recorded') THEN balance END DESC NULLS LAST",
    balance_asc: "CASE WHEN status IN ('issued','recorded') THEN balance END ASC NULLS LAST",
  };
  return transaction(async (c) => {
    if (around) {
      const order = `${sort[q.sort]},date DESC,created_at DESC,id`;
      const result = (
        await c.query(
          `WITH ordered AS (
        SELECT id,row_number() OVER(ORDER BY ${order}) AS position FROM document_balances${where}
      ), current_document AS (
        SELECT position FROM ordered WHERE id=$${params.length + 1}::uuid
      ), metadata AS (
        SELECT (SELECT count(*)::int FROM ordered) AS count,
          (SELECT position::int FROM current_document) AS position
      ) SELECT d.*,m.count AS navigation_count,m.position AS navigation_position
        FROM metadata m LEFT JOIN ordered o ON o.position BETWEEN m.position-1 AND m.position+1
        LEFT JOIN document_balances d ON d.id=o.id ORDER BY o.position`,
          [...params, around],
        )
      ).rows;
      const rows = result
        .filter((row) => row.id)
        .map(({ navigation_count, navigation_position, ...doc }) => doc);
      return {
        rows,
        count: result[0].navigation_count,
        position: result[0].navigation_position,
        page: q.page,
        pageSize: 25,
      };
    }
    const aggregate = (
      await c.query(
        `SELECT count(*)::int AS count,
    coalesce(sum(CASE WHEN kind='credit' THEN -total ELSE total END),0)::text AS total,
    coalesce(sum(balance) FILTER (WHERE kind='invoice' AND status='issued'),0)::text AS receivable,
    coalesce(sum(balance) FILTER (WHERE kind='credit' AND credit_side='sale' AND status='issued'),0)::text AS refunds,
    count(*) FILTER (WHERE status='draft')::int AS drafts,0::int AS unknown
    ${q.kind === 'purchase' ? ", coalesce(sum(balance) FILTER (WHERE kind='purchase' AND status='recorded'),0)::text AS payable, coalesce(sum(balance) FILTER (WHERE kind='credit' AND credit_side='purchase' AND status='issued'),0)::text AS \"purchaseRefunds\"" : ''}
    FROM document_balances${where}`,
        params,
      )
    ).rows[0];
    const rows = (
      await c.query(
        `SELECT *,${dueDate} AS due_date FROM document_balances${where} ORDER BY ${sort[q.sort]},date DESC,created_at DESC,id${all ? '' : ` LIMIT 25 OFFSET $${params.length + 1}`}`,
        all ? params : [...params, (q.page - 1) * 25],
      )
    ).rows;
    const { count, ...summary } = aggregate;
    return { rows, count, page: q.page, pageSize: 25, summary: summary as SalesListSummary };
  }, true);
}
export function documentCsv(list: DocumentList, quote = false, purchase = false) {
  const quotes = quote || (list.rows.length > 0 && list.rows.every((doc) => doc.kind === 'quote'));
  const cell = (value: unknown) => {
    let s = String(value ?? '');
    if (/^\s*[=+\-@\t\r\n]/.test(s) && !/^\-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const rows = [
    [
      'Documento',
      'Tipo',
      purchase ? 'Proveedor' : 'Cliente',
      ...(purchase ? ['Factura del proveedor'] : []),
      'NIF',
      'Emisión',
      quotes ? 'Válido hasta' : 'Vencimiento',
      'Estado',
      'Total EUR',
      ...(quotes ? [] : ['Pendiente EUR']),
    ],
    ...list.rows.map((d) => [
      d.number || 'Borrador',
      (
        {
          invoice: 'Factura',
          credit: 'Rectificativa',
          quote: 'Presupuesto',
          purchase: 'Compra',
        } as Record<string, string>
      )[d.kind] || d.kind,
      d.party.name,
      ...(purchase ? [d.reference] : []),
      d.party.taxId,
      d.date,
      d.due_date,
      (
        {
          draft: 'Borrador',
          issued: 'Emitida',
          recorded: 'Registrada',
          sent: 'Confirmado',
          accepted: 'Aceptado',
          converted: 'Convertido',
          rejected: 'Rechazado',
        } as Record<string, string>
      )[d.status] || d.status,
      d.total?.replace('.', ','),
      ...(quotes
        ? []
        : [
            'workingDraft' in d || d.status === 'draft' || d.kind === 'quote'
              ? ''
              : d.balance.replace('.', ','),
          ]),
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(';')).join('\r\n');
}
