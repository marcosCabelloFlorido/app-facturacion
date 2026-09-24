import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { pool, assert, audit, transaction } from './db.ts';
import { requireAdmin } from './auth.ts';
import { dateSchema, money } from '../shared/domain.ts';
import { postEntry } from './services.ts';
import { paramId, runCommand } from './finance.ts';
const value = z.string().regex(/^\d{1,15}(\.\d{1,2})?$/);
export const entrySchema = z.object({
  date: dateSchema,
  description: z.string().trim().min(5).max(300),
  lines: z
    .array(
      z.object({ account: z.string().regex(/^[1-9][0-9]{2,9}$/), debit: value, credit: value }),
    )
    .min(2)
    .max(100),
});
export async function validateManual(c: PoolClient, b: z.infer<typeof entrySchema>) {
  assert(
    b.lines.every((l) => new Decimal(l.debit).isZero() !== new Decimal(l.credit).isZero()),
    'Cada línea debe tener importe en debe o haber.',
    400,
  );
  const accounts = (
    await c.query('SELECT * FROM chart_accounts WHERE code=ANY($1) FOR SHARE', [
      b.lines.map((l) => l.account),
    ])
  ).rows;
  assert(
    b.lines.every((l) => accounts.some((a) => a.code === l.account && a.active)),
    'Alguna cuenta no existe o está inactiva.',
    400,
  );
  assert(
    !accounts.some((a) => a.control || /^(400|430|407|438)/.test(a.code)),
    'Las cuentas de clientes, proveedores y anticipos se mueven desde documentos y cobros/pagos para conservar el auxiliar.',
    400,
  );
  assert(
    b.lines.reduce((s, l) => s.plus(l.debit).minus(l.credit), new Decimal(0)).eq(0),
    'El debe y el haber deben coincidir.',
    400,
  );
}
export async function accountingReview(c: { query: PoolClient['query'] }, to: string) {
  const controls = (
    await c.query(
      `WITH expected AS (
 SELECT '430'::text AS account,coalesce(sum(CASE WHEN kind='invoice' THEN total WHEN kind='credit' AND credit_side='sale' THEN -total ELSE 0 END),0) AS amount FROM documents WHERE status IN ('issued','recorded') AND coalesce(registration_date,date)<=$1
 UNION ALL SELECT '400',coalesce(sum(CASE WHEN kind='purchase' THEN total WHEN kind='credit' AND credit_side='purchase' THEN -total ELSE 0 END),0) FROM documents WHERE status IN ('issued','recorded') AND coalesce(registration_date,date)<=$1),
 paid AS (SELECT CASE WHEN d.kind='purchase' OR d.credit_side='purchase' THEN '400' ELSE '430' END AS account,sum(CASE WHEN d.kind='credit' THEN -p.amount ELSE p.amount END) AS amount FROM payments p JOIN documents d ON d.id=p.document_id WHERE p.date<=$1 AND(p.reversal_date IS NULL OR p.reversal_date>$1) GROUP BY 1),
 funds AS (SELECT CASE WHEN d.kind='purchase' THEN '400' ELSE '430' END AS account,sum(f.amount) AS amount FROM fund_applications f JOIN documents d ON d.id=f.document_id WHERE f.date<=$1 GROUP BY 1),
 ledger AS (SELECT l.account,sum(CASE WHEN l.account='400' THEN l.credit-l.debit ELSE l.debit-l.credit END) AS amount FROM journal_lines l JOIN journal_entries e ON e.id=l.entry_id WHERE e.date<=$1 AND l.account IN ('400','430') GROUP BY l.account)
 SELECT x.account,(x.amount-coalesce(p.amount,0)-coalesce(f.amount,0))::text AS auxiliary,coalesce(l.amount,0)::text AS ledger,(coalesce(l.amount,0)-x.amount+coalesce(p.amount,0)+coalesce(f.amount,0))::text AS difference FROM expected x LEFT JOIN paid p USING(account) LEFT JOIN funds f USING(account) LEFT JOIN ledger l USING(account) ORDER BY account`,
      [to],
    )
  ).rows;
  const unbalanced = (
    await c.query(
      'SELECT e.id,e.number FROM journal_entries e JOIN journal_lines l ON l.entry_id=e.id WHERE e.date<=$1 GROUP BY e.id HAVING sum(l.debit)<>sum(l.credit) OR count(*)<2',
      [to],
    )
  ).rows;
  const draftCount = (
    await c.query("SELECT count(*)::int AS n FROM documents WHERE status='draft' AND date<=$1", [
      to,
    ])
  ).rows[0].n;
  const missingArchive = (
    await c.query(
      "SELECT d.id,d.number FROM documents d LEFT JOIN document_archives a ON a.document_id=d.id WHERE d.status<>'draft' AND coalesce(d.registration_date,d.date)<=$1 AND a.document_id IS NULL",
      [to],
    )
  ).rows;
  const blocks = controls
    .filter((v) => !new Decimal(v.difference).eq(0))
    .map((v) => `La cuenta ${v.account} difiere del auxiliar en ${v.difference} EUR.`);
  if (unbalanced.length) blocks.push(`${unbalanced.length} asientos descuadrados.`);
  return {
    to,
    controls,
    blocks,
    warnings: [
      ...(draftCount ? [`${draftCount} documentos en borrador hasta la fecha de corte.`] : []),
      ...(missingArchive.length
        ? [
            `${missingArchive.length} documentos históricos pendientes de archivar al consultar su PDF.`,
          ]
        : []),
    ],
    missingArchive,
    canClose: blocks.length === 0,
  };
}
export async function accountingRoutes(api: FastifyInstance) {
  api.get(
    '/accounting/accounts',
    async () => (await pool.query('SELECT * FROM chart_accounts ORDER BY code')).rows,
  );
  api.post('/accounting/accounts', async (req) => {
    requireAdmin(req);
    const b = z
      .object({
        code: z.string().regex(/^[1-9][0-9]{2,9}$/),
        name: z.string().trim().min(3).max(160),
        section: z.enum(['asset', 'liability', 'equity', 'expense', 'income']),
      })
      .parse(req.body);
    return runCommand(req, async (c) => {
      assert(
        !/^(400|430|407|438)/.test(b.code),
        'Las cuentas de control se reservan a los circuitos documentales.',
        400,
      );
      await c.query('INSERT INTO chart_accounts(code,name,section) VALUES($1,$2,$3)', [
        b.code,
        b.name,
        b.section,
      ]);
      await audit(c, req.user!.id, b.code, 'Cuenta contable creada', b);
      return b;
    });
  });
  api.get('/accounting/reports', async (req) => {
    const { from, to } = z.object({ from: dateSchema, to: dateSchema }).parse(req.query);
    assert(from <= to, 'Rango de fechas inválido', 400);
    return transaction(async (c) => {
      const rows = (
        await c.query(
          `SELECT a.code,a.name,a.section,coalesce(sum(l.debit-l.credit) FILTER(WHERE e.date<$1),0)::text AS opening,coalesce(sum(l.debit) FILTER(WHERE e.date BETWEEN $1 AND $2),0)::text AS debit,coalesce(sum(l.credit) FILTER(WHERE e.date BETWEEN $1 AND $2),0)::text AS credit,coalesce(sum(l.debit-l.credit),0)::text AS closing FROM chart_accounts a LEFT JOIN(journal_lines l JOIN journal_entries e ON e.id=l.entry_id AND e.date<=$2) ON l.account=a.code GROUP BY a.code ORDER BY a.code`,
          [from, to],
        )
      ).rows;
      const section = (key: string, period = false) =>
        money(
          rows
            .filter((a) => a.section === key)
            .reduce(
              (s, a) =>
                s.plus(
                  new Decimal(period ? new Decimal(a.debit).minus(a.credit) : a.closing).mul(
                    ['liability', 'equity', 'income'].includes(key) ? -1 : 1,
                  ),
                ),
              new Decimal(0),
            ),
        );
      const income = section('income', true),
        expenses = section('expense', true);
      return {
        rows,
        assets: section('asset'),
        liabilities: section('liability'),
        equity: section('equity'),
        accumulatedResult: money(new Decimal(section('income')).minus(section('expense'))),
        income,
        expenses,
        result: money(new Decimal(income).minus(expenses)),
        review: await accountingReview(c, to),
      };
    }, true);
  });
  api.get('/accounting/ledger', async (req) => {
    const b = z
      .object({
        account: z.string().regex(/^[1-9][0-9]{2,9}$/),
        from: dateSchema,
        to: dateSchema,
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(req.query);
    assert(b.from <= b.to, 'Rango inválido', 400);
    return transaction(async (c) => {
      const opening = (
        await c.query(
          'SELECT coalesce(sum(l.debit-l.credit),0)::text AS balance FROM journal_lines l JOIN journal_entries e ON e.id=l.entry_id WHERE l.account=$1 AND e.date<$2',
          [b.account, b.from],
        )
      ).rows[0].balance;
      const rows = (
        await c.query(
          `SELECT *,($4::numeric+sum(debit-credit) OVER(ORDER BY date,number,id))::text AS balance,count(*) OVER()::int AS count FROM(SELECT l.id,l.debit,l.credit,e.id AS entry_id,e.date,e.number,e.description,e.document_id FROM journal_lines l JOIN journal_entries e ON e.id=l.entry_id WHERE l.account=$1 AND e.date BETWEEN $2 AND $3) l ORDER BY date,number,id LIMIT 50 OFFSET $5`,
          [b.account, b.from, b.to, opening, (b.page - 1) * 50],
        )
      ).rows;
      return { opening, rows, page: b.page, count: rows[0]?.count || 0 };
    }, true);
  });
  api.get('/accounting/review', (req) =>
    transaction((c) => accountingReview(c, dateSchema.parse((req.query as any).to)), true),
  );
  api.get(
    '/accounting/drafts',
    async () =>
      (
        await pool.query(
          'SELECT d.*,u.name AS actor FROM journal_drafts d JOIN public.users u ON u.id=d.created_by WHERE posted_id IS NULL ORDER BY updated_at DESC',
        )
      ).rows,
  );
  api.post('/accounting/drafts', async (req) => {
    requireAdmin(req);
    const b = entrySchema.parse(req.body);
    return runCommand(req, async (c) => {
      const d = (
        await c.query('INSERT INTO journal_drafts(payload,created_by) VALUES($1,$2) RETURNING *', [
          b,
          req.user!.id,
        ])
      ).rows[0];
      await c.query(
        'INSERT INTO journal_draft_versions(draft_id,version,payload,actor_id) VALUES($1,1,$2,$3)',
        [d.id, b, req.user!.id],
      );
      await audit(c, req.user!.id, d.id, 'Borrador de asiento creado');
      return d;
    });
  });
  api.put('/accounting/drafts/:id', async (req) => {
    requireAdmin(req);
    const b = z
      .object({ version: z.number().int().positive(), entry: entrySchema })
      .parse(req.body);
    return runCommand(req, async (c) => {
      const d = (
        await c.query(
          'UPDATE journal_drafts SET payload=$2,version=version+1,updated_at=now() WHERE id=$1 AND version=$3 AND posted_id IS NULL RETURNING *',
          [paramId(req), b.entry, b.version],
        )
      ).rows[0];
      assert(d, 'El borrador ha cambiado o ya está contabilizado.');
      await c.query(
        'INSERT INTO journal_draft_versions(draft_id,version,payload,actor_id) VALUES($1,$2,$3,$4)',
        [d.id, d.version, b.entry, req.user!.id],
      );
      return d;
    });
  });
  api.post('/accounting/drafts/:id/post', async (req) => {
    requireAdmin(req);
    const b = z.object({ version: z.number().int().positive() }).parse(req.body);
    return runCommand(req, async (c) => {
      const d = (
        await c.query('SELECT * FROM journal_drafts WHERE id=$1 FOR UPDATE', [paramId(req)])
      ).rows[0];
      assert(
        d && !d.posted_id && d.version === b.version,
        'El borrador ha cambiado o ya está contabilizado.',
      );
      const entry = entrySchema.parse(d.payload);
      await validateManual(c, entry);
      const id = await postEntry(c, req.user!.id, entry.date, entry.description, entry.lines);
      await c.query('UPDATE journal_drafts SET posted_id=$2,version=version+1 WHERE id=$1', [
        d.id,
        id,
      ]);
      await audit(c, req.user!.id, id, 'Asiento revisado y contabilizado', { draftId: d.id });
      return { id };
    });
  });
  api.post('/accounting/entries/:id/reverse', async (req) => {
    requireAdmin(req);
    const b = z
      .object({ date: dateSchema, reason: z.string().trim().min(5).max(300) })
      .parse(req.body);
    return runCommand(req, async (c) => {
      const e = (
        await c.query('SELECT * FROM journal_entries WHERE id=$1 FOR UPDATE', [paramId(req)])
      ).rows[0];
      assert(
        e && e.event === 'manual' && !e.document_id && !e.payment_id,
        'Revierte los asientos automáticos desde su documento o movimiento.',
        400,
      );
      assert(b.date >= e.date, 'La reversión no puede ser anterior al asiento.', 400);
      assert(
        !(
          await c.query('SELECT 1 FROM entry_reversals WHERE original_id=$1 OR reversal_id=$1', [
            e.id,
          ])
        ).rowCount,
        'El asiento ya está revertido o es una reversión.',
      );
      assert(
        !(
          await c.query(
            'SELECT 1 FROM unapplied_funds WHERE entry_id=$1 UNION ALL SELECT 1 FROM fund_applications WHERE entry_id=$1',
            [e.id],
          )
        ).rowCount,
        'Gestiona el anticipo desde cobros y pagos.',
        400,
      );
      const lines = (
        await c.query(
          'SELECT account,credit AS debit,debit AS credit FROM journal_lines WHERE entry_id=$1',
          [e.id],
        )
      ).rows;
      const id = await postEntry(
        c,
        req.user!.id,
        b.date,
        `Reversión #${e.number} · ${b.reason}`,
        lines,
        null,
        null,
        'reversal',
      );
      await c.query(
        'INSERT INTO entry_reversals(original_id,reversal_id,reason) VALUES($1,$2,$3)',
        [e.id, id, b.reason],
      );
      await audit(c, req.user!.id, e.id, 'Asiento revertido', { reversalId: id, reason: b.reason });
      return { id };
    });
  });
}
