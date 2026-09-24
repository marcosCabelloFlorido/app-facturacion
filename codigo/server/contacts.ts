import { contactFilesRoutes } from './contact-files.ts';
import { readSearch, textSearchWhere } from './advanced-search.ts';
import { invalidNifSearch, nifError, nifSchema } from '../shared/nif.ts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { contactDocumentScope } from './contact-activity-scope.ts';
import { contactSortSchema } from '../shared/contact-tools.ts';
import { contactBalancesSql, contactOrderSql } from './contact-balances.ts';
import { contactOverviewRoutes } from './contact-overview.ts';
import { contactStatementRoutes } from './contact-statement.ts';
import {
  contactSchema,
  canSearchContacts,
  contactTaxIdSchema,
  normalizeTaxId,
  type Contact,
  type ContactInput,
} from '../shared/contacts.ts';
import { assert, audit, pool, transaction } from './db.ts';
import { command } from './services.ts';
import { contactActivityQuerySchema } from '../shared/contact-activity-filters.ts';
import {
  contactMetricSchema,
  contactMetricCondition,
  documentMetricCondition,
} from './module-kpis.ts';

const entityId = (params: unknown) => z.object({ id: z.uuid() }).parse(params).id;
const fields = 'id,data,active,version,created_at,updated_at';
const contact = (row: any): Contact => {
  const { data, ...metadata } = row;
  return { ...data, ...metadata };
};
async function uniqueTaxId(c: PoolClient, data: ContactInput, id?: string) {
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['contact:' + data.taxId]);
  const existing = (await c.query('SELECT id,active FROM contacts WHERE tax_key=$1', [data.taxId]))
    .rows[0];
  assert(
    !existing || existing.id === id,
    existing?.active === false
      ? 'Ya existe una ficha archivada con este identificador fiscal. Puedes recuperarla en Lista de clientes → Archivados.'
      : 'Ya existe una ficha con este identificador fiscal. Búscala en la lista y selecciónala o edítala.',
    409,
  );
}
export function contactsRoutes(api: FastifyInstance) {
  contactStatementRoutes(api);
  contactOverviewRoutes(api);
  contactFilesRoutes(api);
  const run = <T>(req: FastifyRequest, fn: (c: PoolClient) => Promise<T>) =>
    command(
      z.uuid().parse(req.headers['idempotency-key']),
      req.user!.id,
      `${req.method}:${req.url}`,
      req.body,
      fn,
    );
  api.get('/contacts', async (req) => {
    const source = req.query as Record<string, unknown>;
    const interpreted =
      typeof source.search === 'string' ? readSearch(source.search, 'contacts') : null;
    const q = z
      .object({
        search: z.string().trim().max(150).default(''),
        around: z.uuid().optional(),
        type: z.enum(['all', 'customer', 'supplier']).default('all'),
        status: z.enum(['active', 'archived', 'all']).default('active'),
        metric: contactMetricSchema.optional(),
        sort: contactSortSchema,
        page: z.coerce.number().int().min(1).max(100000).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(25),
      })
      .parse(
        interpreted
          ? {
              ...source,
              status: 'all',
              type: 'all',
              metric: undefined,
              sort: 'name_asc',
              ...interpreted.filters,
              search: interpreted.filters.text || '',
            }
          : req.query,
      );
    const values: unknown[] = [];
    const conditions: string[] = [];
    if (q.metric) conditions.push(contactMetricCondition(q.metric));
    if (q.status !== 'all') conditions.push(q.status === 'active' ? 'active' : 'NOT active');
    if (q.type !== 'all') {
      values.push(q.type);
      conditions.push(`data->>'type' IN ($${values.length},'both')`);
    }
    if (q.search) {
      const textCondition = textSearchWhere(
        q.search,
        "concat_ws(' ',data->>'name',data->>'taxId',data->>'email',data->>'phone')",
        values,
      );
      const tax = normalizeTaxId(q.search);
      if (tax) {
        values.push(tax);
        conditions.push(`((${textCondition}) OR strpos(tax_key,$${values.length})>0)`);
      } else conditions.push('(' + textCondition + ')');
    }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    return transaction(async (c) => {
      if (q.around) {
        const result = (
          await c.query(
            `WITH ordered AS (
          SELECT ${fields},to_jsonb(totals) AS balances,row_number() OVER(ORDER BY ${contactOrderSql[q.sort]}) AS row_position
          FROM contacts LEFT JOIN LATERAL (${contactBalancesSql('contacts.tax_key')}) totals ON true${where}
        ), current_contact AS (SELECT row_position FROM ordered WHERE id=$${values.length + 1}::uuid)
        SELECT (SELECT count(*)::int FROM ordered) AS count,
          (SELECT row_position::int FROM current_contact) AS position,
          coalesce((SELECT jsonb_agg(to_jsonb(r)-'row_position' ORDER BY row_position) FROM ordered r
            WHERE row_position BETWEEN (SELECT row_position-1 FROM current_contact) AND (SELECT row_position+1 FROM current_contact)), '[]'::jsonb) AS rows`,
            [...values, q.around],
          )
        ).rows[0];
        return { ...result, rows: result.rows.map(contact), page: q.page, pageSize: q.pageSize };
      }
      const count = (await c.query(`SELECT count(*)::int AS count FROM contacts${where}`, values))
        .rows[0].count;
      const rows = (
        await c.query(
          `SELECT ${fields},to_jsonb(totals) AS balances FROM contacts LEFT JOIN LATERAL (${contactBalancesSql('contacts.tax_key')}) totals ON true${where} ORDER BY ${contactOrderSql[q.sort]} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
          [...values, q.pageSize, (q.page - 1) * q.pageSize],
        )
      ).rows.map(contact);
      return { rows, count, page: q.page, pageSize: q.pageSize };
    }, true);
  });
  api.get('/contacts/suggestions', async (req) => {
    const { taxId, search } = z
      .object({
        taxId: z
          .string()
          .trim()
          .max(30)
          .transform(normalizeTaxId)
          .pipe(z.string().min(3).max(30))
          .optional(),
        search: z.string().trim().max(160).refine(canSearchContacts).optional(),
      })
      .refine((q) => !!q.taxId || !!q.search)
      .parse(req.query);
    const identity = taxId || normalizeTaxId(search!);
    assert(!invalidNifSearch(identity), nifError, 400);
    const escaped = identity.replace(/[\\%_]/g, '\\$&');
    const rows = (
      await pool.query(
        `SELECT ${fields} FROM contacts WHERE (tax_key LIKE $1 OR tax_key LIKE $3${search ? " OR data->>'name' ILIKE $4" : ''})
       ORDER BY (tax_key=$2) DESC, active DESC, (tax_key LIKE $1) DESC, tax_key,id LIMIT 9`,
        [
          escaped + '%',
          identity,
          '%' + escaped,
          ...(search ? ['%' + search.replace(/[\\%_]/g, '\\$&') + '%'] : []),
        ],
      )
    ).rows.map(contact);
    return { rows: rows.slice(0, 8), hasMore: rows.length > 8 };
  });
  api.get('/contacts/lookup', async (req) => {
    const { taxId } = z.object({ taxId: nifSchema }).parse(req.query);
    const row = (await pool.query(`SELECT ${fields} FROM contacts WHERE tax_key=$1`, [taxId]))
      .rows[0];
    // Include archived entries and every contact type: a fiscal identity is unique per workspace.
    return { contact: row ? contact(row) : null };
  });
  api.get('/contacts/:id', async (req) => {
    const row = (
      await pool.query(`SELECT ${fields} FROM contacts WHERE id=$1`, [entityId(req.params)])
    ).rows[0];
    assert(row, 'No se encuentra la ficha.', 404);
    return contact(row);
  });
  api.get('/contacts/:id/activity', async (req) => {
    const id = entityId(req.params);
    const source = req.query as Record<string, unknown>;
    const interpreted =
      typeof source.search === 'string' ? readSearch(source.search, 'activity') : null;
    const q = contactActivityQuerySchema.parse(
      interpreted
        ? { ...source, ...interpreted.filters, search: interpreted.filters.text || '' }
        : req.query,
    );
    // Match fiscal identity, never a mutable name; totals cover all pages.
    // The read snapshot retains the authenticated workspace's isolation.
    return transaction(async (c) => {
      const row = (await c.query('SELECT tax_key FROM contacts WHERE id=$1', [id])).rows[0];
      assert(row, 'No se encuentra la ficha.', 404);
      const identity = "upper(regexp_replace(d.party->>'taxId', '[[:space:].-]', '', 'g'))=$1";
      const pendingQuotes = `kind='quote' AND ${documentMetricCondition('quote', 'sent', 'CURRENT_DATE')}`;
      const summary = (
        await c.query(
          `SELECT
        coalesce(sum(CASE WHEN kind='invoice' THEN total WHEN kind='credit' AND credit_side='sale' THEN -total ELSE 0 END) FILTER (WHERE status IN ('issued','recorded')),0) AS sales,
        coalesce(sum(CASE WHEN kind='purchase' THEN total WHEN kind='credit' AND credit_side='purchase' THEN -total ELSE 0 END) FILTER (WHERE status IN ('issued','recorded')),0) AS purchases,
        coalesce(sum(balance) FILTER (WHERE status IN ('issued','recorded') AND (kind='invoice' OR (kind='credit' AND credit_side='purchase'))),0) AS receivable,
        coalesce(sum(balance) FILTER (WHERE status IN ('issued','recorded') AND (kind='purchase' OR (kind='credit' AND credit_side='sale'))),0) AS payable,
        count(*) FILTER (WHERE kind='quote')::int AS quotes,
        count(*) FILTER (WHERE ${pendingQuotes})::int AS "pendingQuotes"
        FROM document_balances d WHERE ${identity}`,
          [row.tax_key],
        )
      ).rows[0];
      const pageSize = 10;
      const result: import('../shared/contacts.ts').ContactActivity = {
        summary,
        documents: [],
        payments: [],
        funds: [],
        count: 0,
        page: q.page,
        pageSize,
      };
      const params: unknown[] = [row.tax_key];
      const searchCondition = (expression: string) =>
        q.search ? ' AND (' + textSearchWhere(q.search, expression, params) + ')' : '';
      const rangeConditions = (amount: string, date: string) => {
        let sql = '';
        for (const [value, expression, operator] of [
          [q.minTotal, amount, '>='],
          [q.maxTotal, amount, '<='],
          [q.from, date, '>='],
          [q.to, date, '<='],
        ]) {
          if (value !== undefined) {
            params.push(value);
            sql += ` AND ${expression}${operator}$${params.length}`;
          }
        }
        return sql;
      };
      const nextDue =
        'coalesce((SELECT min(v.due_date) FROM document_due_balances v WHERE v.document_id=d.id AND v.balance>0),d.due_date)';
      const fundAvailable =
        'd.amount-coalesce((SELECT sum(a.amount) FROM fund_applications a WHERE a.fund_id=d.id),0)';
      const paymentReceipt = "(d.kind='invoice' OR (d.kind='credit' AND d.credit_side='purchase'))";
      const statusCondition = () => {
        if (q.status === 'all') return '';
        let condition: string;
        if (q.view === 'payments') {
          condition =
            q.status === 'reversed'
              ? 'p.reversed_at IS NOT NULL'
              : `p.reversed_at IS NULL AND ${q.status === 'payment' ? 'NOT ' : ''}${paymentReceipt}`;
        } else if (q.view === 'funds') {
          condition =
            q.status === 'used'
              ? `(${fundAvailable})=0`
              : q.status === 'partial'
                ? `(${fundAvailable})>0 AND (${fundAvailable})<d.amount`
                : `(${fundAvailable})>0`;
        } else {
          const states: Record<string, string> = {
            draft: "d.status='draft'",
            sent: "d.status='sent'",
            accepted: "d.status='accepted'",
            rejected: "d.status='rejected'",
            converted: "d.status='converted'",
            expired: "d.kind='quote' AND d.status='sent' AND d.due_date<CURRENT_DATE",
            paid: "d.status IN ('issued','recorded') AND d.balance=0",
            pending: `d.status IN ('issued','recorded') AND d.balance>0 AND d.balance>=d.total AND ${nextDue}>=CURRENT_DATE`,
            partial: `d.status IN ('issued','recorded') AND d.balance>0 AND d.balance<d.total AND ${nextDue}>=CURRENT_DATE`,
            overdue: `d.status IN ('issued','recorded') AND d.balance>0 AND ${nextDue}<CURRENT_DATE`,
          };
          condition = states[q.status];
        }
        return ' AND (' + condition + ')';
      };
      const pagination = () => [...params, pageSize, (q.page - 1) * pageSize];
      const limit = () => `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      if (q.view === 'payments') {
        const search = searchCondition("concat_ws(' ',d.number,d.reference,p.reference,p.method)");
        const from = `FROM payments p JOIN documents d ON d.id=p.document_id WHERE ${identity}${search}${rangeConditions('p.amount', 'p.date')}${statusCondition()}`;
        result.count = (
          await c.query(`SELECT count(*)::int AS count ${from}`, params)
        ).rows[0].count;
        result.payments = (
          await c.query(
            `SELECT p.*,d.number,d.party->>'name' AS party_name,d.kind,d.credit_side ${from} ORDER BY p.date DESC,p.created_at DESC,p.id ${limit()}`,
            pagination(),
          )
        ).rows;
      } else if (q.view === 'funds') {
        const search = searchCondition("concat_ws(' ',d.reference,d.method)");
        const from = `FROM unapplied_funds d WHERE ${identity}${search}${rangeConditions('d.amount', 'd.date')}${statusCondition()}`;
        result.count = (
          await c.query(`SELECT count(*)::int AS count ${from}`, params)
        ).rows[0].count;
        result.funds = (
          await c.query(
            `SELECT d.id,d.direction,d.amount,d.date,d.method,d.reference,
          ${fundAvailable} AS available
          ${from} ORDER BY d.date DESC,d.created_at DESC,d.id ${limit()}`,
            pagination(),
          )
        ).rows;
      } else {
        const kind = ' AND (' + contactDocumentScope(q.view) + ')';
        const search = searchCondition(
          "concat_ws(' ',d.number,d.reference,(SELECT string_agg(line->>'description',' ') FROM jsonb_array_elements(d.lines) line),(SELECT number FROM documents WHERE id=d.converted_id))",
        );
        const filters = rangeConditions('d.total', 'd.date') + statusCondition();
        result.count = (
          await c.query(
            `SELECT count(*)::int AS count FROM document_balances d WHERE ${identity}${kind}${search}${filters}`,
            params,
          )
        ).rows[0].count;
        result.documents = (
          await c.query(
            `SELECT d.id,d.kind,d.status,d.number,d.date,
          ${nextDue} AS due_date,
          d.credit_side,d.reference,d.total,d.balance,
          coalesce(nullif(btrim(d.lines->0->>'description'),''),d.reference,'') AS description,
          (SELECT json_build_object('id',invoice.id,'number',invoice.number,'status',invoice.status)
            FROM documents invoice WHERE invoice.id=d.converted_id AND d.kind='quote') AS "convertedInvoice"
          FROM document_balances d WHERE ${identity}${kind}${search}${filters}
          ORDER BY d.date DESC,d.created_at DESC,d.id ${limit()}`,
            pagination(),
          )
        ).rows;
      }
      return result;
    }, true);
  });
  api.post('/contacts', async (req) => {
    const data = contactSchema.parse(req.body);
    return run(req, async (c) => {
      await uniqueTaxId(c, data);
      const row = (
        await c.query(`INSERT INTO contacts(data) VALUES($1) RETURNING ${fields}`, [data])
      ).rows[0];
      await audit(c, req.user!.id, row.id, 'Cliente o proveedor añadido');
      return contact(row);
    });
  });
  api.put('/contacts/:id', async (req) => {
    const id = entityId(req.params);
    const body = z
      .object({ contact: contactSchema, version: z.number().int().positive() })
      .parse(req.body);
    return run(req, async (c) => {
      const current = (await c.query('SELECT * FROM contacts WHERE id=$1 FOR UPDATE', [id]))
        .rows[0];
      assert(current, 'No se encuentra la ficha.', 404);
      assert(
        current.version === body.version,
        'Otra sesión ha modificado esta ficha. Ciérrala y vuelve a abrirla para cargar los datos actuales.',
      );
      await uniqueTaxId(c, body.contact, id);
      const row = (
        await c.query(
          `UPDATE contacts SET data=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING ${fields}`,
          [id, body.contact],
        )
      ).rows[0];
      await audit(c, req.user!.id, id, 'Ficha de cliente o proveedor actualizada');
      return contact(row);
    });
  });
  api.put('/contacts/:id/status', async (req) => {
    const id = entityId(req.params);
    const body = z
      .object({ active: z.boolean(), version: z.number().int().positive() })
      .parse(req.body);
    return run(req, async (c) => {
      const current = (await c.query('SELECT version FROM contacts WHERE id=$1 FOR UPDATE', [id]))
        .rows[0];
      assert(current, 'No se encuentra la ficha.', 404);
      assert(
        current.version === body.version,
        'Otra sesión ha modificado esta ficha. Actualiza la lista antes de continuar.',
      );
      const row = (
        await c.query(
          `UPDATE contacts SET active=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING ${fields}`,
          [id, body.active],
        )
      ).rows[0];
      await audit(c, req.user!.id, id, body.active ? 'Ficha recuperada' : 'Ficha archivada');
      return contact(row);
    });
  });
}
