import { Decimal } from 'decimal.js';
import type { FinancialDocument, DocumentStatusChange } from '../shared/domain.ts';

type StateEvent = {
  occurred_at: Date | string;
  calendar_date: string;
  status: string | null;
  amount: string | null;
};

/** Record-time transitions; unchanged states and technical audit events are omitted. */
export function buildDocumentStatusHistory(
  doc: Pick<FinancialDocument, 'kind' | 'total' | 'due_date'>,
  events: StateEvent[],
): DocumentStatusChange[] {
  let workflow = 'draft';
  let settled = new Decimal(0);
  let previous: string | null = null;
  const result: DocumentStatusChange[] = [];
  for (const event of events) {
    if (event.status) workflow = event.status;
    if (event.amount) settled = settled.plus(event.amount);
    let state = 'Borrador';
    if (doc.kind === 'quote') {
      state =
        (
          {
            draft: 'Borrador',
            sent: 'Confirmado',
            accepted: 'Aceptado',
            rejected: 'Rechazado',
            converted: 'Convertido en factura',
          } as Record<string, string>
        )[workflow] || workflow;
      if (workflow === 'sent' && event.calendar_date > doc.due_date) state = 'Caducado';
    } else if (workflow !== 'draft') {
      const paid = settled.greaterThanOrEqualTo(doc.total);
      if (paid)
        state =
          doc.kind === 'invoice' ? 'Cobrada' : doc.kind === 'purchase' ? 'Pagada' : 'Devuelta';
      else if (event.calendar_date > doc.due_date) state = 'Vencida';
      else if (settled.greaterThan(0))
        state =
          doc.kind === 'invoice'
            ? 'Cobro parcial'
            : doc.kind === 'purchase'
              ? 'Pago parcial'
              : 'Devolución parcial';
      else
        state =
          doc.kind === 'invoice'
            ? 'Pendiente de cobro'
            : doc.kind === 'purchase'
              ? 'Pendiente de pago'
              : 'Pendiente de devolución';
    }
    if (state === previous) continue;
    result.push({
      from: previous,
      to: state,
      occurred_at: new Date(event.occurred_at).toISOString(),
    });
    previous = state;
  }
  return result.reverse();
}

export async function documentStatusHistory(
  client: { query: (sql: string, values?: unknown[]) => Promise<{ rows: any[] }> },
  doc: FinancialDocument,
) {
  const { rows } = await client.query(
    `
    WITH events AS (
      SELECT created_at AS occurred_at, 0 AS priority, 0::bigint AS sequence,
        'draft'::text AS status, NULL::numeric AS amount FROM documents WHERE id=$1
      UNION ALL
      SELECT issued_at, 1, 0, CASE kind WHEN 'quote' THEN 'sent' WHEN 'purchase' THEN 'recorded' ELSE 'issued' END, NULL
        FROM documents WHERE id=$1 AND issued_at IS NOT NULL
      UNION ALL
      SELECT created_at, 2, 0, NULL, amount FROM payments WHERE document_id=$1
      UNION ALL
      SELECT reversed_at, 3, 0, NULL, -amount FROM payments WHERE document_id=$1 AND reversed_at IS NOT NULL
      UNION ALL
      SELECT c.issued_at, 2, 0, NULL, a.amount FROM credit_applications a
        JOIN documents c ON c.id=a.credit_id
        WHERE (a.invoice_id=$1 OR a.credit_id=$1) AND c.status='issued'
      UNION ALL
      SELECT e.created_at, 2, 0, NULL, a.amount FROM fund_applications a
        JOIN journal_entries e ON e.id=a.entry_id WHERE a.document_id=$1 AND a.kind='apply'
      UNION ALL
      SELECT a.created_at, 4, a.id, CASE a.action
        WHEN 'Presupuesto aceptado' THEN 'accepted'
        WHEN 'Presupuesto rechazado' THEN 'rejected'
        WHEN 'Presupuesto convertido a borrador de factura' THEN 'converted'
        WHEN 'Decisión del destinatario en portal' THEN CASE a.details->>'decision' WHEN 'accept' THEN 'accepted' WHEN 'reject' THEN 'rejected' END
        END, NULL
        FROM audit_events a JOIN documents d ON d.id::text=a.entity_id
        WHERE d.id=$1 AND d.kind='quote' AND a.action IN (
          'Presupuesto aceptado','Presupuesto rechazado','Presupuesto convertido a borrador de factura','Decisión del destinatario en portal')
      UNION ALL
      SELECT greatest(issued_at,(due_date+1)::timestamptz), 5, 0, NULL, NULL
        FROM documents WHERE id=$1 AND issued_at IS NOT NULL AND due_date<CURRENT_DATE
    )
    SELECT occurred_at,occurred_at::date::text AS calendar_date,status,amount::text
    FROM events WHERE occurred_at IS NOT NULL AND occurred_at<=now()
    ORDER BY occurred_at,priority,sequence
  `,
    [doc.id],
  );
  return buildDocumentStatusHistory(doc, rows);
}
