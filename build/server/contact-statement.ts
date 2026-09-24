import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { contactStatementQuerySchema, type ContactBalances } from '../shared/contact-tools.ts';
import { contactBalancesSql, contactIdentity, receiptDocument } from './contact-balances.ts';
import { assert, transaction } from './db.ts';
import { statementPdf, statementWorkbook } from './contact-statement-export.ts';

export type StatementDocument = {
  date: string;
  number: string;
  type: string;
  direction: string;
  total: string;
  balance: string;
};
export type StatementMovement = {
  date: string;
  type: string;
  document: string;
  reference: string;
  amount: string;
  effect: string;
};
export type ContactStatement = {
  contact: { name: string; taxId: string };
  company: { name: string; taxId: string };
  from: string;
  to: string;
  generated: string;
  balances: ContactBalances;
  documents: StatementDocument[];
  movements: StatementMovement[];
};
export async function readContactStatement(
  c: PoolClient,
  id: string,
  from: string,
  to: string,
): Promise<ContactStatement> {
  const contact = (await c.query('SELECT data,tax_key FROM contacts WHERE id=$1', [id])).rows[0];
  assert(contact, 'No se encuentra la ficha.', 404);
  const { name, taxId } = contact.data;
  const company = (await c.query('SELECT data FROM company WHERE id=1')).rows[0]?.data;
  const balances = (await c.query(contactBalancesSql('$1'), [contact.tax_key])).rows[0];
  const params = [contact.tax_key, from, to];
  const documents = (
    await c.query(
      `SELECT d.date,d.number,
    CASE WHEN d.kind='invoice' THEN 'Factura de venta' WHEN d.kind='purchase' THEN 'Factura de compra'
      WHEN d.credit_side='sale' THEN 'Abono de venta' ELSE 'Abono de compra' END AS type,
    CASE WHEN ${receiptDocument} THEN 'Por cobrar' ELSE 'Por pagar' END AS direction,
    d.total,d.balance FROM document_balances d WHERE ${contactIdentity('d', '$1')}
    AND d.status IN ('issued','recorded') AND d.date BETWEEN $2 AND $3 ORDER BY d.date,d.number,d.id`,
      params,
    )
  ).rows;
  // Cash, reversals and non-cash settlements remain distinguishable. A reversal is dated
  // by its accounting date, even when the original payment falls outside the period.
  const movements = (
    await c.query(
      `SELECT date,type,document,reference,amount,effect FROM (
    SELECT p.date,CASE WHEN ${receiptDocument} THEN 'Cobro' ELSE 'Pago' END AS type,
      coalesce(d.number,'') AS document,p.reference,p.amount,
      CASE WHEN ${receiptDocument} THEN 'Entrada' ELSE 'Salida' END AS effect,p.id::text AS id
      FROM payments p JOIN documents d ON d.id=p.document_id WHERE ${contactIdentity('d', '$1')}
    UNION ALL
    SELECT p.reversal_date,'Reversión de ' || CASE WHEN ${receiptDocument} THEN 'cobro' ELSE 'pago' END,
      coalesce(d.number,''),p.reference,p.amount,
      CASE WHEN ${receiptDocument} THEN 'Salida' ELSE 'Entrada' END,p.id::text || ':reversal'
      FROM payments p JOIN documents d ON d.id=p.document_id WHERE ${contactIdentity('d', '$1')} AND p.reversed_at IS NOT NULL
    UNION ALL
    SELECT f.date,CASE WHEN f.direction='receipt' THEN 'Anticipo recibido' ELSE 'Anticipo entregado' END,
      '',f.reference,f.amount,CASE WHEN f.direction='receipt' THEN 'Entrada' ELSE 'Salida' END,f.id::text
      FROM unapplied_funds f WHERE ${contactIdentity('f', '$1')}
    UNION ALL
    SELECT a.date,CASE WHEN a.kind='apply' THEN 'Anticipo aplicado' ELSE 'Anticipo devuelto' END,
      coalesce(d.number,''),f.reference,a.amount,
      CASE WHEN a.kind='apply' THEN 'Sin movimiento de caja' WHEN f.direction='receipt' THEN 'Salida' ELSE 'Entrada' END,a.id::text
      FROM fund_applications a JOIN unapplied_funds f ON f.id=a.fund_id LEFT JOIN documents d ON d.id=a.document_id WHERE ${contactIdentity('f', '$1')}
    UNION ALL
    SELECT cr.date,'Abono aplicado',coalesce(d.number,''),coalesce(cr.number,''),a.amount,'Sin movimiento de caja',a.id::text
      FROM credit_applications a JOIN documents d ON d.id=a.invoice_id JOIN documents cr ON cr.id=a.credit_id
      WHERE ${contactIdentity('d', '$1')}
  ) movements WHERE date BETWEEN $2 AND $3 ORDER BY date,id`,
      params,
    )
  ).rows;
  return {
    contact: { name, taxId },
    company: { name: company?.name || '', taxId: company?.taxId || '' },
    from,
    to,
    generated: new Date().toISOString(),
    balances,
    documents,
    movements,
  };
}
export function contactStatementRoutes(api: FastifyInstance) {
  api.get('/contacts/:id/statement', async (req, reply) => {
    const id = z.object({ id: z.uuid() }).parse(req.params).id;
    const q = contactStatementQuerySchema.parse(req.query);
    const report = await transaction((c) => readContactStatement(c, id, q.from, q.to), true);
    const file = q.format === 'pdf' ? await statementPdf(report) : await statementWorkbook(report);
    const filename = `extracto-${report.contact.taxId}-${q.from}-${q.to}.${q.format}`;
    return reply
      .type(
        q.format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header('Cache-Control', 'private, no-store')
      .header(
        'Content-Disposition',
        `attachment; filename="extracto.${q.format}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      )
      .send(file);
  });
}
