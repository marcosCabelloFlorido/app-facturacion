import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { contactTaxIdSchema } from '../shared/contacts.ts';
import { type CustomerHistory } from '../shared/sales-tools.ts';
import { transaction } from './db.ts';

export function salesToolsRoutes(api: FastifyInstance) {
  api.get('/sales/customer-context', async (req) => {
    const { customer } = z.object({ customer: contactTaxIdSchema }).parse(req.query);
    return transaction(async (c) => {
      const identity = "upper(regexp_replace(d.party->>'taxId','[[:space:].-]','','g'))=$1";
      const summary = (
        await c.query(
          `SELECT count(*) FILTER(WHERE status='issued')::int AS "invoiceCount",coalesce(sum(balance) FILTER(WHERE status='issued'),0)::text AS pending FROM document_balances d WHERE kind='invoice' AND ${identity}`,
          [customer],
        )
      ).rows[0];
      const overdue = (
        await c.query(
          `SELECT coalesce(sum(v.balance),0)::text AS amount FROM document_due_balances v JOIN document_balances d ON d.id=v.document_id WHERE d.kind='invoice' AND d.status='issued' AND v.balance>0 AND v.due_date<CURRENT_DATE AND ${identity}`,
          [customer],
        )
      ).rows[0].amount;
      const recent = (
        await c.query(
          `SELECT id,number,date,due_date AS "dueDate",total,lines FROM document_balances d WHERE d.kind='invoice' AND d.status IN ('draft','issued') AND ${identity} ORDER BY date DESC,created_at DESC,id LIMIT 20`,
          [customer],
        )
      ).rows;
      return { ...summary, overdue, recent } as CustomerHistory;
    }, true);
  });
}
