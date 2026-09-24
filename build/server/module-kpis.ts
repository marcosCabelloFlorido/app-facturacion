import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dateSchema } from '../shared/domain.ts';
import type { ModuleKpi } from '../shared/module-kpis.ts';
import { pool, transaction } from './db.ts';
import { addDocumentComparisons } from './document-kpi-comparisons.ts';
import { financialHistory, previousMonthComparison, yearComparison } from './kpi-history.ts';
import { comparisonPeriods } from '../shared/kpi-comparisons.ts';
import { pendingDuesCte } from './due-dates.ts';
import { requireAdmin } from './auth.ts';

export const importMetricSchema = z.enum(['all', 'ready', 'error', 'imported']);
export const importMetricCondition = (metric: string) =>
  metric === 'all'
    ? 'TRUE'
    : `EXISTS (SELECT 1 FROM import_items i WHERE i.batch_id=b.id AND i.status='${importMetricSchema.parse(metric)}')`;
export const auditMetricSchema = z.enum(['today', 'week', 'documents', 'payments']);
export function auditMetricCondition(metric: string) {
  return metric === 'today'
    ? 'a.created_at>=CURRENT_DATE'
    : metric === 'week'
      ? "a.created_at>=CURRENT_DATE-interval '6 days'"
      : metric === 'documents'
        ? 'EXISTS (SELECT 1 FROM documents d WHERE d.id::text=a.entity_id::text)'
        : "(a.details ? 'paymentId' OR a.details ? 'fundId' OR a.action IN ('Movimiento repartido entre documentos','Anticipo registrado'))";
}

export const documentMetricSchema = z.enum([
  'month',
  'pending',
  'overdue',
  'draft',
  'sent',
  'accepted',
  'expired',
]);
export const documentScope = (kind: string) =>
  kind === 'sales'
    ? "(kind='invoice' OR (kind='credit' AND credit_side='sale'))"
    : kind === 'purchase'
      ? "(kind='purchase' OR (kind='credit' AND credit_side='purchase'))"
      : "kind='quote'";
// Shared by the summary and the paginated list: the same documents explain both.
export function documentMetricCondition(kind: string, metric: string, asOf: string) {
  const ordinary = kind === 'purchase' ? 'purchase' : 'invoice';
  switch (metric) {
    case 'month':
      return `status IN ('issued','recorded') AND date BETWEEN date_trunc('month',${asOf}::date)::date AND ${asOf}::date`;
    case 'pending':
      return `kind='${ordinary}' AND status IN ('issued','recorded') AND balance>0`;
    case 'overdue':
      return `kind='${ordinary}' AND status IN ('issued','recorded') AND balance>0 AND EXISTS (SELECT 1 FROM document_due_balances v WHERE v.document_id=document_balances.id AND v.balance>0 AND v.due_date<${asOf}::date)`;
    case 'draft':
      return "status='draft'";
    case 'sent':
      return `status='sent' AND due_date>=${asOf}::date`;
    case 'accepted':
      return "status='accepted'";
    case 'expired':
      return `status='sent' AND due_date<${asOf}::date`;
    default:
      return 'TRUE';
  }
}
export const contactMetricSchema = z.enum(['customers', 'suppliers', 'receivable', 'payable']);
export function contactMetricCondition(metric: string) {
  if (metric === 'customers') return "active AND data->>'type' IN ('customer','both')";
  if (metric === 'suppliers') return "active AND data->>'type' IN ('supplier','both')";
  const kind = metric === 'receivable' ? 'invoice' : 'purchase';
  const side = metric === 'receivable' ? 'purchase' : 'sale';
  return `EXISTS (SELECT 1 FROM document_balances d WHERE upper(regexp_replace(d.party->>'taxId','[[:space:].-]','','g'))=contacts.tax_key AND d.status IN ('issued','recorded') AND d.balance>0 AND (d.kind='${kind}' OR (d.kind='credit' AND d.credit_side='${side}')))`;
}
export async function documentSummary(kind: string, asOf?: string) {
  return transaction(async (client) => {
    const metrics =
      kind === 'quote' ? ['sent', 'accepted', 'expired'] : ['month', 'pending', 'overdue'];
    const result = (
      await client.query(
        `SELECT coalesce($1::date,CURRENT_DATE)::text AS "asOf", ${metrics
          .map((metric) => {
            const condition = documentMetricCondition(
              kind,
              metric,
              'coalesce($1::date,CURRENT_DATE)',
            );
            const amount =
              metric === 'month'
                ? "CASE WHEN kind='credit' THEN -net ELSE net END"
                : ['pending', 'overdue'].includes(metric)
                  ? 'balance'
                  : 'total';
            return `coalesce(sum(${amount}) FILTER (WHERE ${condition}),0)::text AS ${metric}, count(*) FILTER (WHERE ${condition})::int AS ${metric}_count`;
          })
          .join(',')} FROM document_balances WHERE ${documentScope(kind)}`,
        [asOf || null],
      )
    ).rows[0];
    const labels: Record<string, string> = {
      month: kind === 'purchase' ? 'Compras del mes' : 'Facturado este mes',
      pending: kind === 'purchase' ? 'Pendiente de pago' : 'Pendiente de cobro',
      overdue: 'Facturas vencidas',
      sent: 'Pendientes de respuesta',
      accepted: 'Pendientes de facturar',
      expired: 'Presupuestos caducados',
    };
    const month = new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(result.asOf + 'T12:00:00Z'));
    const items: ModuleKpi[] = metrics.map((id) => ({
      id,
      label: labels[id],
      value: result[id],
      format: 'money',
      context:
        id === 'month'
          ? 'Base imponible · ' + month
          : `${result[id + '_count']} ${result[id + '_count'] === 1 ? 'documento' : 'documentos'}${id === 'overdue' ? ' · saldo pendiente' : ''}`,
    }));
    await addDocumentComparisons(client, kind, result.asOf, items);
    return { asOf: result.asOf, items };
  }, true);
}
export function moduleKpiRoutes(api: FastifyInstance) {
  api.get('/module-kpis/imports', async () => {
    const ids = ['all', 'ready', 'error', 'imported'];
    const row = (
      await pool.query(
        `SELECT CURRENT_DATE::text AS "asOf",${ids.map((id) => `count(*) FILTER (WHERE ${importMetricCondition(id)})::text AS ${id}`).join(',')} FROM import_batches b`,
      )
    ).rows[0];
    return {
      asOf: row.asOf,
      items: ids.map((id, i) => ({
        id,
        label: ['Lotes recibidos', 'Listos para importar', 'Con errores', 'Con datos importados'][
          i
        ],
        value: row[id],
        format: 'count',
        context: 'Lotes de importación',
      })),
    };
  });
  api.get('/module-kpis/audit', async (req) => {
    requireAdmin(req);
    const ids = ['today', 'week', 'documents', 'payments'];
    const row = (
      await pool.query(
        `SELECT CURRENT_DATE::text AS "asOf",${ids.map((id) => `count(*) FILTER (WHERE ${auditMetricCondition(id)})::text AS ${id}`).join(',')} FROM audit_events a`,
      )
    ).rows[0];
    return {
      asOf: row.asOf,
      items: ids.map((id, i) => ({
        id,
        label: ['Operaciones de hoy', 'Últimos 7 días', 'Sobre documentos', 'Sobre movimientos'][i],
        value: row[id],
        format: 'count',
        context: i < 2 ? 'Actividad registrada' : 'Historial completo',
      })),
    };
  });
  api.get('/module-kpis/documents', async (req) => {
    const q = z
      .object({ kind: z.enum(['sales', 'purchase', 'quote']), asOf: dateSchema.optional() })
      .parse(req.query);
    return documentSummary(q.kind, q.asOf);
  });
  api.get('/module-kpis/contacts', async () => {
    const ids = ['customers', 'suppliers', 'receivable', 'payable'];
    const row = (
      await pool.query(
        `SELECT CURRENT_DATE::text AS "asOf",${ids.map((id) => `count(*) FILTER (WHERE ${contactMetricCondition(id)})::text AS ${id}`).join(',')} FROM contacts`,
      )
    ).rows[0];
    const labels = [
      'Clientes activos',
      'Proveedores activos',
      'Contactos por cobrar',
      'Contactos por pagar',
    ];
    return {
      asOf: row.asOf,
      items: ids.map((id, i) => ({
        id,
        label: labels[i],
        value: row[id],
        format: 'count',
        context: i < 2 ? 'Fichas disponibles' : 'Con saldo pendiente',
      })),
    };
  });
  api.get('/module-kpis/payments', () => paymentSummary());
}

export async function paymentSummary() {
  return transaction(async (client) => {
    const definitions = [
      ['receivable', 'Pendiente de cobro', "direction='receivable'"],
      ['payable', 'Pendiente de pago', "direction='payable'"],
      ['overdue', 'Vencido', 'due_date<CURRENT_DATE'],
      ['upcoming', 'Hoy y próximos', 'due_date>=CURRENT_DATE'],
    ];
    const row = (
      await client.query(
        `${pendingDuesCte} SELECT CURRENT_DATE::text AS "asOf",${definitions.map(([id, , condition]) => `coalesce(sum(balance::numeric) FILTER (WHERE ${condition}),0)::text AS ${id}, count(*) FILTER (WHERE ${condition})::int AS ${id}_count`).join(',')} FROM pending_dues`,
      )
    ).rows[0];
    const [monthPeriod, yearPeriod] = comparisonPeriods(row.asOf);
    const [historyMonth, historyYear] = await Promise.all([
      financialHistory(client, monthPeriod.cutoff),
      financialHistory(client, yearPeriod.cutoff),
    ]);
    return {
      asOf: row.asOf,
      items: definitions.map(([id, label]) => ({
        id,
        label,
        value: row[id],
        comparisons: [
          previousMonthComparison(row.asOf, row[id], historyMonth[id]),
          yearComparison(row.asOf, row[id], historyYear[id]),
        ],
        format: 'money',
        context: `${row[id + '_count']} ${row[id + '_count'] === 1 ? 'vencimiento' : 'vencimientos'}`,
      })),
    };
  }, true);
}
