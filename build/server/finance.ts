import { searchWhere, searchOrder } from './advanced-search.ts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { pool, assert, audit, transaction } from './db.ts';
import { requireAdmin } from './auth.ts';
import {
  command,
  getDocument,
  lockDocument,
  postEntry,
  addPayment,
  saveDocument,
} from './services.ts';
import { dateSchema, partySchema, money, type DocumentInput } from '../shared/domain.ts';
export const amountSchema = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,2})?$/)
  .refine((v) => {
    try {
      return new Decimal(v).gt(0);
    } catch {
      return false;
    }
  }, 'El importe debe ser positivo');
export const runCommand = <T>(req: FastifyRequest, fn: (c: PoolClient) => Promise<T>) =>
  command(
    z.uuid().parse(req.headers['idempotency-key']),
    req.user!.id,
    `${req.method}:${req.url}`,
    req.body,
    fn,
  );
export const paramId = (req: FastifyRequest) => z.uuid().parse((req.params as { id: string }).id);

export async function schedule(client: { query: PoolClient['query'] }, id: string) {
  const doc = await getDocument(client as any, id);
  const revisions = (
    await client.query(
      'SELECT s.*,u.name AS actor FROM document_schedules s JOIN public.users u ON u.id=s.created_by WHERE document_id=$1 ORDER BY version DESC',
      [id],
    )
  ).rows;
  let rows = revisions.length
    ? (
        await client.query(
          'SELECT * FROM document_dues WHERE schedule_id=$1 ORDER BY due_date,position',
          [revisions[0].id],
        )
      ).rows
    : [{ id: 'default', position: 0, due_date: doc.due_date, amount: doc.total }];
  let paid = new Decimal(doc.settled);
  rows = rows.map((r) => {
    const applied = Decimal.min(paid, r.amount);
    paid = paid.minus(applied);
    return { ...r, settled: money(applied), balance: money(new Decimal(r.amount).minus(applied)) };
  });
  return { version: revisions[0]?.version || 0, rows, revisions };
}
export async function financeRoutes(api: FastifyInstance) {
  api.get(
    '/series',
    async () => (await pool.query('SELECT * FROM series_config ORDER BY kind,code')).rows,
  );
  api.post('/series', async (req) => {
    requireAdmin(req);
    const b = z
      .object({
        code: z.string().regex(/^[A-Z][A-Z0-9]{1,11}$/),
        kind: z.enum(['invoice', 'quote', 'purchase', 'credit']),
        name: z.string().trim().min(2).max(100),
      })
      .parse(req.body);
    return runCommand(req, async (c) => {
      await c.query('INSERT INTO series_config(code,kind,name) VALUES($1,$2,$3)', [
        b.code,
        b.kind,
        b.name,
      ]);
      await audit(c, req.user!.id, b.code, 'Serie creada', b);
      return b;
    });
  });
  api.put('/series/:code', async (req) => {
    requireAdmin(req);
    const code = z
        .string()
        .regex(/^[A-Z][A-Z0-9]{1,11}$/)
        .parse((req.params as any).code),
      b = z.object({ active: z.boolean() }).parse(req.body);
    return runCommand(req, async (c) => {
      assert(
        (await c.query('UPDATE series_config SET active=$2 WHERE code=$1', [code, b.active]))
          .rowCount,
        'Serie no encontrada',
        404,
      );
      await audit(c, req.user!.id, code, b.active ? 'Serie activada' : 'Serie desactivada');
      return { ok: true };
    });
  });
  api.get('/documents/:id/schedule', (req) => schedule(pool as any, paramId(req)));
  api.post('/documents/:id/schedule', async (req) => {
    const id = paramId(req),
      b = z
        .object({
          version: z.number().int().min(0),
          reason: z.string().trim().min(5).max(500),
          dues: z
            .array(z.object({ date: dateSchema, amount: amountSchema }))
            .min(1)
            .max(60),
        })
        .parse(req.body);
    return runCommand(req, async (c) => {
      const d = await lockDocument(c, id);
      assert(
        d.kind !== 'quote' && d.status !== 'draft',
        'Confirma el documento antes de pactar sus plazos.',
      );
      const old = await schedule(c, id);
      assert(old.version === b.version, 'Los plazos han cambiado. Recarga antes de guardar.');
      assert(
        b.dues.every((v) => v.date >= d.date),
        'Un vencimiento no puede preceder al documento.',
        400,
      );
      assert(
        b.dues.reduce((sum, v) => sum.plus(v.amount), new Decimal(0)).eq(d.total),
        'Los plazos deben sumar el total completo del documento.',
        400,
      );
      const s = (
        await c.query(
          'INSERT INTO document_schedules(document_id,version,reason,created_by) VALUES($1,$2,$3,$4) RETURNING id',
          [id, b.version + 1, b.reason, req.user!.id],
        )
      ).rows[0];
      for (const [i, due] of b.dues.entries())
        await c.query(
          'INSERT INTO document_dues(schedule_id,position,due_date,amount) VALUES($1,$2,$3,$4)',
          [s.id, i, due.date, due.amount],
        );
      await audit(c, req.user!.id, id, 'Calendario de vencimientos revisado', {
        version: b.version + 1,
        reason: b.reason,
        dues: b.dues,
      });
      return schedule(c, id);
    });
  });
  api.get('/documents/:id/credit-remaining', async (req) => {
    const id = paramId(req),
      d = await getDocument(pool, id);
    const previous = (
      await pool.query(
        'SELECT id,number,status,lines,total FROM documents WHERE original_id=$1 ORDER BY created_at',
        [id],
      )
    ).rows;
    return {
      previous,
      lines: d.lines.map((l, index) => {
        const used = previous
          .filter((p) => p.status === 'issued')
          .flatMap((p) =>
            p.lines.map((v: any, i: number) => ({ ...v, sourceLine: v.sourceLine ?? i })),
          )
          .filter((v: any) => v.sourceLine === index)
          .reduce((s: Decimal, v: any) => s.plus(v.quantity), new Decimal(0));
        return {
          sourceLine: index,
          description: l.description,
          quantity: l.quantity,
          remaining: new Decimal(l.quantity).minus(used).toString(),
        };
      }),
    };
  });
  api.post('/documents/:id/duplicate', async (req) => {
    const b = z.object({ date: dateSchema }).parse(req.body);
    return runCommand(req, async (c) => {
      const d = await getDocument(c, paramId(req));
      assert(d.kind !== 'credit', 'Duplica el documento original.', 400);
      const result = await saveDocument(c, req.user!.id, {
        kind: d.kind,
        date: b.date,
        dueDate: b.date,
        party: d.party,
        reference: d.kind === 'purchase' ? '' : d.reference,
        notes: d.notes,
        retentionRate: d.retention_rate as DocumentInput['retentionRate'],
        lines: d.lines,
      });
      await audit(c, req.user!.id, result.id, 'Documento duplicado', { sourceId: d.id });
      return result;
    });
  });
  api.post('/payments/batch', async (req) => {
    const b = z
      .object({
        date: dateSchema,
        method: z.enum(['bank', 'cash', 'card']),
        reference: z.string().max(300),
        amount: amountSchema,
        allocations: z
          .array(z.object({ documentId: z.uuid(), amount: amountSchema }))
          .min(1)
          .max(100),
      })
      .parse(req.body);
    return runCommand(req, async (c) => {
      assert(
        new Set(b.allocations.map((a) => a.documentId)).size === b.allocations.length,
        'No repitas la misma factura.',
        400,
      );
      assert(
        b.allocations.reduce((s, a) => s.plus(a.amount), new Decimal(0)).eq(b.amount),
        'El reparto debe coincidir con el importe del movimiento.',
        400,
      );
      const ids = b.allocations.map((a) => a.documentId).sort();
      let direction = '';
      for (const id of ids) {
        const d = await lockDocument(c, id);
        const next =
          d.kind === 'invoice' || (d.kind === 'credit' && d.credit_side === 'purchase')
            ? 'receipt'
            : 'payment';
        assert(
          !direction || direction === next,
          'No mezcles cobros y pagos en un movimiento.',
          400,
        );
        direction = next;
      }
      const batch = (
        await c.query(
          'INSERT INTO payment_batches(date,amount,reference,created_by) VALUES($1,$2,$3,$4) RETURNING *',
          [b.date, b.amount, b.reference, req.user!.id],
        )
      ).rows[0];
      for (const a of b.allocations) {
        const p = await addPayment(c, req.user!.id, {
          ...a,
          date: b.date,
          method: b.method,
          reference: b.reference,
        });
        await c.query('INSERT INTO batch_payments(batch_id,payment_id) VALUES($1,$2)', [
          batch.id,
          p.id,
        ]);
      }
      await audit(c, req.user!.id, batch.id, 'Movimiento repartido entre documentos', {
        amount: b.amount,
        allocations: b.allocations,
      });
      return batch;
    });
  });
  api.get('/funds', async (req) => {
    const { search } = z
      .object({ search: z.string().trim().max(4096).default('') })
      .parse(req.query);
    const values: unknown[] = [];
    const where = searchWhere(
      search,
      'funds',
      {
        text: "concat_ws(' ',f.party->>'name',f.party->>'taxId',f.reference)",
        date: 'f.date',
        amount: 'f.amount',
        method: 'f.method',
        direction: 'f.direction',
      },
      values,
    );
    const order = searchOrder(
      search,
      'funds',
      'f.date DESC,f.created_at DESC,f.id',
      'f.date',
      'f.amount',
    );
    return (
      await pool.query(
        'SELECT f.*,f.amount-coalesce(a.used,0) AS available FROM unapplied_funds f LEFT JOIN LATERAL(SELECT sum(amount) AS used FROM fund_applications WHERE fund_id=f.id) a ON true WHERE ' +
          where +
          ' ORDER BY ' +
          order,
        values,
      )
    ).rows;
  });
  api.post('/funds', async (req) => {
    const b = z
      .object({
        direction: z.enum(['receipt', 'payment']),
        party: partySchema,
        date: dateSchema,
        method: z.enum(['bank', 'cash', 'card']),
        reference: z.string().trim().min(3).max(300),
        amount: amountSchema,
      })
      .parse(req.body);
    return runCommand(req, async (c) => {
      const bank = b.method === 'cash' ? '570' : '572',
        receipt = b.direction === 'receipt';
      const entry = await postEntry(
        c,
        req.user!.id,
        b.date,
        `Anticipo · ${b.party.name} · ${b.reference}`,
        [
          { account: receipt ? bank : '407', debit: b.amount, credit: '0' },
          { account: receipt ? '438' : bank, debit: '0', credit: b.amount },
        ],
      );
      const r = (
        await c.query(
          'INSERT INTO unapplied_funds(direction,party,amount,date,method,reference,entry_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
          [b.direction, b.party, b.amount, b.date, b.method, b.reference, entry, req.user!.id],
        )
      ).rows[0];
      await audit(c, req.user!.id, r.id, 'Anticipo registrado', {
        amount: b.amount,
        direction: b.direction,
      });
      return r;
    });
  });
  api.post('/funds/:id/apply', async (req) => {
    const b = z
      .object({ date: dateSchema, amount: amountSchema, documentId: z.uuid().nullable() })
      .parse(req.body);
    return runCommand(req, async (c) => {
      const f = (
        await c.query('SELECT * FROM unapplied_funds WHERE id=$1 FOR UPDATE', [paramId(req)])
      ).rows[0];
      assert(f, 'Anticipo no encontrado', 404);
      if (b.documentId) await lockDocument(c, b.documentId);
      const receipt = f.direction === 'receipt',
        bank = f.method === 'cash' ? '570' : '572';
      const debit = receipt ? '438' : b.documentId ? '400' : bank,
        credit = receipt ? (b.documentId ? '430' : bank) : '407';
      const entry = await postEntry(
        c,
        req.user!.id,
        b.date,
        `${b.documentId ? 'Aplicación' : 'Devolución'} de anticipo · ${f.party.name}`,
        [
          { account: debit, debit: b.amount, credit: '0' },
          { account: credit, debit: '0', credit: b.amount },
        ],
        b.documentId,
      );
      const r = (
        await c.query(
          'INSERT INTO fund_applications(fund_id,document_id,amount,date,entry_id,kind,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
          [
            f.id,
            b.documentId,
            b.amount,
            b.date,
            entry,
            b.documentId ? 'apply' : 'refund',
            req.user!.id,
          ],
        )
      ).rows[0];
      await audit(
        c,
        req.user!.id,
        b.documentId || f.id,
        b.documentId ? 'Anticipo aplicado' : 'Anticipo devuelto',
        { fundId: f.id, amount: b.amount },
      );
      return r;
    });
  });
}
