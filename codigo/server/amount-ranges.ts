import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { contactActivityViews } from '../shared/contacts.ts';
import { assert, pool, transaction } from './db.ts';
import { listDocumentDrafts } from './document-drafts.ts';
import { contactDocumentScope } from './contact-activity-scope.ts';

export function amountRangeRoutes(api: FastifyInstance) {
  // Complete section, before search, amount/date/status filters and pagination.
  api.get('/document-amount-range', async (req) => {
    const { kind } = z.object({ kind: z.enum(['sales', 'quote', 'purchase']) }).parse(req.query);
    const scope = {
      sales: "kind='invoice' OR (kind='credit' AND credit_side='sale')",
      quote: "kind='quote'",
      purchase: "kind='purchase' OR (kind='credit' AND credit_side='purchase')",
    }[kind];
    const result = (
      await pool.query<{ maximum: string }>(
        `SELECT greatest(coalesce(max(total),0),0)::text AS maximum FROM documents WHERE ${scope}`,
      )
    ).rows[0];
    if (req.user!.role !== 'viewer') {
      // Unfinished work belongs only to its author; incomplete totals are ignored.
      const drafts = await listDocumentDrafts(
        { kind, search: '', page: 1, sort: 'total_desc' },
        req.user!.id,
      );
      result.maximum = Decimal.max(result.maximum, drafts.rows[0]?.total || 0).toFixed(2);
    }
    return result;
  });

  api.get('/contacts/:id/activity-amount-range', async (req) => {
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { view } = z
      .object({ view: z.enum(contactActivityViews).default('documents') })
      .parse(req.query);
    return transaction(async (c) => {
      const contact = (await c.query('SELECT tax_key FROM contacts WHERE id=$1', [id])).rows[0];
      assert(contact, 'No se encuentra la ficha.', 404);
      const identity = "upper(regexp_replace(d.party->>'taxId','[[:space:].-]','','g'))=$1";
      const amount = view === 'payments' ? 'p.amount' : view === 'funds' ? 'd.amount' : 'd.total';
      const from =
        view === 'payments'
          ? 'payments p JOIN documents d ON d.id=p.document_id'
          : view === 'funds'
            ? 'unapplied_funds d'
            : 'document_balances d';
      const scope = view === 'payments' || view === 'funds' ? 'TRUE' : contactDocumentScope(view);
      return (
        await c.query<{ maximum: string }>(
          `SELECT greatest(coalesce(max(${amount}),0),0)::text AS maximum FROM ${from} WHERE ${identity} AND (${scope})`,
          [contact.tax_key],
        )
      ).rows[0];
    }, true);
  });
}
