import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { pool, assert } from './db.ts';
import { command, saveDocument, issueDocument } from './services.ts';
import { documentSchema } from '../shared/domain.ts';

const text = z.string().max(4000);
const draftPayload = z
  .object({
    kind: z.enum(['invoice', 'quote', 'purchase']),
    date: text,
    dueDate: text,
    party: z.object({ name: text, taxId: text, address: text, email: text }),
    reference: text,
    notes: text,
    retentionRate: text,
    lines: z
      .array(
        z.object({
          description: text,
          quantity: text,
          unitPrice: text,
          discount: text,
          taxRate: text,
          exemptionReason: text,
        }),
      )
      .max(100),
  })
  .passthrough();
const keySchema = z
  .string()
  .regex(/^(new:(invoice|quote|purchase)(:[0-9a-f-]{36})?|edit:[0-9a-f-]{36}(:[0-9a-f-]{36})?)$/);
const keyOf = (req: FastifyRequest) => keySchema.parse((req.params as { key: string }).key);
export async function workingDraftRoutes(api: FastifyInstance) {
  const run = <T>(req: FastifyRequest, fn: Parameters<typeof command<T>>[4]) =>
    command(
      z.uuid().parse(req.headers['idempotency-key']),
      req.user!.id,
      `${req.method}:${req.url}`,
      req.body,
      fn,
    );
  api.get(
    '/working-drafts',
    async (req) =>
      (
        await pool.query(
          'SELECT resource_key,payload,step,version,updated_at FROM working_drafts WHERE owner_id=$1 ORDER BY updated_at DESC',
          [req.user!.id],
        )
      ).rows,
  );
  api.get(
    '/working-drafts/:key',
    async (req) =>
      (
        await pool.query(
          'SELECT *,document_version AS "documentVersion" FROM working_drafts WHERE owner_id=$1 AND resource_key=$2',
          [req.user!.id, keyOf(req)],
        )
      ).rows[0] || null,
  );
  api.put('/working-drafts/:key', async (req) => {
    const key = keyOf(req);
    const body = z
      .object({
        payload: draftPayload,
        step: z.number().int().min(0).max(3),
        version: z.number().int().min(0),
        documentVersion: z.number().int().positive().nullable(),
      })
      .parse(req.body);
    return run(req, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        `${req.user!.id}:${key}`,
      ]);
      const old = (
        await c.query(
          'SELECT version FROM working_drafts WHERE owner_id=$1 AND resource_key=$2 FOR UPDATE',
          [req.user!.id, key],
        )
      ).rows[0];
      assert(
        (old?.version || 0) === body.version,
        'Otra pestaña ha cambiado este borrador. Revisa la versión guardada antes de continuar.',
      );
      if (key.startsWith('edit:')) {
        const doc = (
          await c.query('SELECT status,kind FROM documents WHERE id=$1', [key.slice(5, 41)])
        ).rows[0];
        assert(
          doc?.status === 'draft' && doc.kind === body.payload.kind,
          'El documento ya no se puede editar.',
        );
      } else
        assert(key.split(':')[1] === body.payload.kind, 'El tipo del borrador no coincide.', 400);
      return (
        await c.query(
          'INSERT INTO working_drafts(owner_id,resource_key,payload,step,document_version) VALUES($1,$2,$3,$4,$5) ON CONFLICT(owner_id,resource_key) DO UPDATE SET payload=excluded.payload,step=excluded.step,document_version=excluded.document_version,version=working_drafts.version+1,updated_at=now() RETURNING version,updated_at',
          [req.user!.id, key, body.payload, body.step, body.documentVersion],
        )
      ).rows[0];
    });
  });
  api.post('/working-drafts/:key/finish', async (req) => {
    const key = keyOf(req),
      body = z
        .object({
          version: z.number().int().positive(),
          action: z.enum(['draft', 'issue']).optional(),
        })
        .parse(req.body);
    return run(req, async (c) => {
      const draft = (
        await c.query(
          'SELECT * FROM working_drafts WHERE owner_id=$1 AND resource_key=$2 FOR UPDATE',
          [req.user!.id, key],
        )
      ).rows[0];
      assert(
        draft && draft.version === body.version,
        'El borrador ha cambiado. Recarga y revisa antes de guardarlo.',
      );
      const data = documentSchema.parse(draft.payload);
      assert(
        body.action !== 'issue' || data.kind === 'invoice' || data.kind === 'purchase',
        'Esta acción solo está disponible para facturas de venta y compras.',
        400,
      );
      let doc = await saveDocument(
        c,
        req.user!.id,
        data,
        key.startsWith('edit:') ? key.slice(5, 41) : undefined,
        draft.document_version || undefined,
      );
      if (body.action === 'issue') doc = await issueDocument(c, req.user!.id, doc.id, doc.version);
      await c.query('DELETE FROM working_drafts WHERE owner_id=$1 AND resource_key=$2', [
        req.user!.id,
        key,
      ]);
      return doc;
    });
  });
  api.delete('/working-drafts/:key', async (req) => {
    const key = keyOf(req),
      body = z.object({ version: z.number().int().positive() }).parse(req.body);
    return run(req, async (c) => {
      const deleted = await c.query(
        'DELETE FROM working_drafts WHERE owner_id=$1 AND resource_key=$2 AND version=$3',
        [req.user!.id, key, body.version],
      );
      assert(deleted.rowCount, 'El borrador ha cambiado. No se ha descartado.');
      return { ok: true };
    });
  });
}
