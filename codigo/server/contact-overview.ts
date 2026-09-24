import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { assert, transaction } from './db.ts';
import { contactBalancesSql, contactIdentity, receiptDocument } from './contact-balances.ts';
import { documentMetricCondition } from './module-kpis.ts';
import type { ContactOverview } from '../shared/contact-overview.ts';

// Registered only inside contactsRoutes: requireUser authenticates membership and
// workspaceContext binds every query to that workspace's schema (server/app.ts).
export function contactOverviewRoutes(api: FastifyInstance) {
  api.get('/contacts/:id/overview', async (req): Promise<ContactOverview> => {
    assert(req.user && req.workspace, 'Inicia sesión para continuar.', 401);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    return transaction(async (c) => {
      const row = (await c.query('SELECT tax_key FROM contacts WHERE id=$1', [id])).rows[0];
      assert(row, 'No se encuentra la ficha.', 404);
      const params = [row.tax_key];
      const balances = (await c.query(contactBalancesSql('$1'), params)).rows[0];
      const totals = (
        await c.query(
          `SELECT
        coalesce(sum(CASE WHEN kind='invoice' THEN total WHEN kind='credit' AND credit_side='sale' THEN -total ELSE 0 END) FILTER (WHERE status IN ('issued','recorded')),0)::text AS sales,
        coalesce(sum(CASE WHEN kind='purchase' THEN total WHEN kind='credit' AND credit_side='purchase' THEN -total ELSE 0 END) FILTER (WHERE status IN ('issued','recorded')),0)::text AS purchases,
        count(*) FILTER (WHERE kind='quote' AND ${documentMetricCondition('quote', 'sent', 'CURRENT_DATE')})::int AS "pendingQuotes",
        count(*) FILTER (WHERE status='draft')::int AS drafts
        FROM document_balances d WHERE ${contactIdentity('d', '$1')}`,
          params,
        )
      ).rows[0];
      const advances = (
        await c.query(
          `SELECT
        coalesce(sum(available) FILTER (WHERE direction='receipt'),0)::text AS receipt,
        coalesce(sum(available) FILTER (WHERE direction='payment'),0)::text AS payment
        FROM (SELECT f.direction, f.amount-coalesce((SELECT sum(a.amount) FROM fund_applications a WHERE a.fund_id=f.id),0) AS available
          FROM unapplied_funds f WHERE ${contactIdentity('f', '$1')}) funds`,
          params,
        )
      ).rows[0];
      const scope = `FROM document_due_balances v JOIN document_balances d ON d.id=v.document_id
        WHERE ${contactIdentity('d', '$1')} AND d.status IN ('issued','recorded') AND v.balance>0`;
      const dueCount = (await c.query(`SELECT count(*)::int AS count ${scope}`, params)).rows[0]
        .count;
      const dues = (
        await c.query(
          `SELECT d.id::text || ':' || v.position::text AS id, d.id AS "documentId", d.number,
        coalesce(d.lines->0->>'description','') AS description, v.due_date AS "dueDate", v.balance::text,
        CASE WHEN ${receiptDocument} THEN 'receipt' ELSE 'payment' END AS direction
        ${scope} ORDER BY v.due_date,d.number,v.position LIMIT 5`,
          params,
        )
      ).rows;
      const asOf = (await c.query('SELECT CURRENT_DATE::text AS date')).rows[0].date;
      return { asOf, balances, totals, advances, dueCount, dues };
    }, true);
  });
}
