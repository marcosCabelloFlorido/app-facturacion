import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { pool, assert, audit, transaction, workspaceContext } from './db.ts';
import { hashToken, requireAdmin } from './auth.ts';
import { runCommand, paramId } from './finance.ts';
import { lockDocument, getDocument } from './services.ts';
import { archivePdf } from './archive.ts';
import { seal, unseal } from './secrets.ts';
const access = z.object({ workspaceId: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) });
export const signatureDeclaration =
  'Declaro que soy la persona indicada y estoy autorizado para comunicar esta decisión sobre el documento y su PDF identificado por la huella mostrada.';
export async function portalRoutes(api: FastifyInstance) {
  api.get(
    '/portal/settings',
    async () =>
      (await pool.query('SELECT base_url AS "baseUrl",version FROM portal_settings WHERE id=1'))
        .rows[0] || { baseUrl: '', version: 0 },
  );
  api.put('/portal/settings', async (req) => {
    requireAdmin(req);
    const b = z
      .object({ baseUrl: z.string().trim().max(500), version: z.number().int().min(0) })
      .parse(req.body);
    let baseUrl = '';
    if (b.baseUrl) {
      let u: URL;
      try {
        u = new URL(b.baseUrl);
      } catch {
        assert(false, 'Introduce una dirección completa.', 400);
      }
      assert(
        (u!.protocol === 'https:' ||
          (u!.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u!.hostname))) &&
          !u!.username &&
          !u!.password &&
          !u!.search &&
          !u!.hash &&
          u!.pathname === '/',
        'Usa HTTPS para una dirección pública, sin ruta ni credenciales.',
        400,
      );
      baseUrl = u!.origin;
    }
    return runCommand(req, async (c) => {
      await c.query(
        "SELECT pg_advisory_xact_lock(hashtextextended(current_schema()||':portal-settings',0))",
      );
      const old = (await c.query('SELECT version FROM portal_settings WHERE id=1')).rows[0];
      assert((old?.version || 0) === b.version, 'La configuración ha cambiado.');
      const r = (
        await c.query(
          'INSERT INTO portal_settings(id,base_url) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url,version=portal_settings.version+1 RETURNING version',
          [baseUrl],
        )
      ).rows[0];
      await audit(c, req.user!.id, 'portal', 'Dirección del portal actualizada', { baseUrl });
      return r;
    });
  });
  api.get(
    '/documents/:id/shares',
    async (req) =>
      (
        await pool.query(
          'SELECT s.id,s.recipient,s.allow_sign,s.file_ids,s.expires_at,s.revoked_at,s.created_at,(SELECT count(*)::int FROM portal_events e WHERE e.share_id=s.id) AS accesses,(SELECT to_jsonb(r) FROM portal_receipts r WHERE r.share_id=s.id) AS receipt FROM portal_shares s WHERE document_id=$1 ORDER BY created_at DESC',
          [paramId(req)],
        )
      ).rows,
  );
  api.post('/documents/:id/shares', async (req) => {
    const b = z
      .object({
        recipient: z.email(),
        expiresInDays: z.number().int().min(1).max(90),
        allowSign: z.boolean(),
        fileIds: z.array(z.uuid()).max(20).default([]),
      })
      .parse(req.body);
    return runCommand(req, async (c) => {
      await lockDocument(c, paramId(req));
      const d = await getDocument(c, paramId(req));
      assert(d.status !== 'draft', 'Confirma el documento antes de compartirlo.', 400);
      assert(
        !b.allowSign || d.kind === 'quote',
        'Solo los presupuestos permiten aceptación o rechazo.',
        400,
      );
      const ids = Array.from(new Set(b.fileIds));
      const files = await c.query(
        'SELECT id FROM active_stored_files WHERE id=ANY($1::uuid[]) AND document_id=$2',
        [ids, d.id],
      );
      assert(files.rowCount === ids.length, 'Algún adjunto no pertenece a este documento.', 400);
      await archivePdf(c, d, 'reconstructed');
      const token = randomBytes(32).toString('hex');
      const result = (
        await c.query(
          "INSERT INTO portal_shares(document_id,token_hash,token_encrypted,recipient,allow_sign,file_ids,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,now()+$7*interval '1 day',$8) RETURNING id",
          [
            d.id,
            hashToken(token),
            seal(token, req.workspace!.schema + ':portal'),
            b.recipient,
            b.allowSign,
            ids,
            b.expiresInDays,
            req.user!.id,
          ],
        )
      ).rows[0];
      await audit(c, req.user!.id, d.id, 'Enlace privado creado', {
        shareId: result.id,
        recipient: b.recipient,
        fileIds: ids,
        allowSign: b.allowSign,
      });
      return result;
    });
  });
  api.get('/shares/:id/link', async (req) => {
    const s = (
      await pool.query(
        'SELECT token_encrypted FROM portal_shares WHERE id=$1 AND revoked_at IS NULL AND expires_at>now()',
        [paramId(req)],
      )
    ).rows[0];
    assert(s, 'El enlace ha caducado o ha sido revocado.', 404);
    const path =
      '/portal#' +
      req.workspace!.id +
      '.' +
      unseal(s.token_encrypted, req.workspace!.schema + ':portal');
    const config = (await pool.query('SELECT base_url FROM portal_settings WHERE id=1')).rows[0];
    return { path, url: config?.base_url ? config.base_url + path : null };
  });
  api.post('/shares/:id/revoke', async (req) =>
    runCommand(req, async (c) => {
      const s = (
        await c.query(
          'UPDATE portal_shares SET revoked_at=coalesce(revoked_at,now()) WHERE id=$1 RETURNING document_id',
          [paramId(req)],
        )
      ).rows[0];
      assert(s, 'Enlace no encontrado.', 404);
      await audit(c, req.user!.id, s.document_id, 'Enlace privado revocado', {
        shareId: paramId(req),
      });
      return { ok: true };
    }),
  );
}
async function withShare<T>(req: FastifyRequest, fn: (c: PoolClient, s: any) => Promise<T>) {
  const b = access.parse(req.body);
  const w = (
    await pool.query('SELECT schema_name FROM public.workspaces WHERE id=$1', [b.workspaceId])
  ).rows[0];
  assert(w, 'El enlace no está disponible.', 404);
  return workspaceContext.run(w.schema_name, () =>
    transaction(async (c) => {
      const s = (
        await c.query(
          'SELECT * FROM portal_shares WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now() FOR UPDATE',
          [hashToken(b.token)],
        )
      ).rows[0];
      assert(s, 'El enlace no está disponible o ha caducado.', 404);
      return fn(c, s);
    }),
  );
}
export async function publicPortalRoutes(app: FastifyInstance) {
  const options = { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };
  app.post('/api/portal/document', options, async (req) =>
    withShare(req, async (c, s) => {
      const d = await getDocument(c, s.document_id),
        a = (await c.query('SELECT sha256 FROM document_archives WHERE document_id=$1', [d.id]))
          .rows[0];
      const files = (
        await c.query(
          'SELECT id,filename,size FROM active_stored_files WHERE id=ANY($1::uuid[]) AND document_id=$2',
          [s.file_ids, d.id],
        )
      ).rows;
      await c.query("INSERT INTO portal_events(share_id,event) VALUES($1,'view')", [s.id]);
      const receipt =
        (
          await c.query(
            'SELECT id,decision,signer_name,created_at,sha256,declaration FROM portal_receipts WHERE share_id=$1',
            [s.id],
          )
        ).rows[0] || null;
      return {
        document: {
          kind: d.kind,
          number: d.number,
          date: d.date,
          due_date: d.due_date,
          status: d.status,
          party: { name: d.party.name, taxId: d.party.taxId, address: d.party.address },
          company: d.company_snapshot,
          lines: d.lines,
          net: d.net,
          tax: d.tax,
          retention: d.retention,
          retention_rate: d.retention_rate,
          credit_side: d.credit_side,
          operation_date: d.operation_date,
          total: d.total,
          reference: d.reference,
          notes: d.notes,
        },
        sha256: a.sha256,
        files,
        expiresAt: s.expires_at,
        canSign: s.allow_sign && d.kind === 'quote' && d.status === 'sent',
        receipt,
        declaration: signatureDeclaration,
      };
    }),
  );
  app.post('/api/portal/pdf', options, async (req, reply) => {
    const a = await withShare(req, async (c, s) => {
      await c.query("INSERT INTO portal_events(share_id,event) VALUES($1,'pdf')", [s.id]);
      return (
        await c.query('SELECT data,sha256 FROM document_archives WHERE document_id=$1', [
          s.document_id,
        ])
      ).rows[0];
    });
    return reply
      .type('application/pdf')
      .header('Content-Disposition', 'attachment; filename="documento.pdf"')
      .header('ETag', '"' + a.sha256 + '"')
      .send(a.data);
  });
  app.post('/api/portal/file', options, async (req, reply) => {
    const id = access.extend({ fileId: z.uuid() }).parse(req.body).fileId;
    const f = await withShare(req, async (c, s) => {
      assert(s.file_ids.includes(id), 'Archivo no compartido.', 404);
      const f = (
        await c.query(
          'SELECT data,mime,filename FROM active_stored_files WHERE id=$1 AND document_id=$2',
          [id, s.document_id],
        )
      ).rows[0];
      assert(f, 'Archivo no encontrado.', 404);
      await c.query("INSERT INTO portal_events(share_id,event) VALUES($1,'attachment')", [s.id]);
      return f;
    });
    return reply
      .type(f.mime)
      .header(
        'Content-Disposition',
        `attachment; filename="adjunto"; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      )
      .send(f.data);
  });
  app.post('/api/portal/sign', options, async (req) => {
    const b = access
      .extend({
        name: z.string().trim().min(3).max(160),
        decision: z.enum(['accept', 'reject']),
        consent: z.literal(true),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(req.body);
    return withShare(req, async (c, s) => {
      assert(s.allow_sign, 'El enlace no permite comunicar decisiones.', 403);
      await lockDocument(c, s.document_id);
      const d = await getDocument(c, s.document_id);
      const a = (await c.query('SELECT sha256 FROM document_archives WHERE document_id=$1', [d.id]))
        .rows[0];
      assert(a.sha256 === b.sha256, 'La huella del documento no coincide. Recarga la vista.');
      const existing = (await c.query('SELECT * FROM portal_receipts WHERE share_id=$1', [s.id]))
        .rows[0];
      if (existing) {
        assert(
          existing.decision === b.decision && existing.signer_name === b.name,
          'Ya existe una decisión firmada para este enlace.',
        );
        return { id: existing.id };
      }
      if (d.kind === 'quote') {
        assert(d.status === 'sent', 'El presupuesto ya tiene una decisión o se ha convertido.');
        if (b.decision === 'accept')
          assert(
            !(await c.query('SELECT $1::date<CURRENT_DATE AS expired', [d.due_date])).rows[0]
              .expired,
            'El presupuesto ha caducado.',
          );
        await c.query('UPDATE documents SET status=$2,version=version+1 WHERE id=$1', [
          d.id,
          b.decision === 'accept' ? 'accepted' : 'rejected',
        ]);
      }
      const r = (
        await c.query(
          'INSERT INTO portal_receipts(share_id,document_id,sha256,decision,signer_name,declaration,ip,user_agent) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
          [
            s.id,
            d.id,
            a.sha256,
            b.decision,
            b.name,
            signatureDeclaration,
            req.ip,
            (req.headers['user-agent'] || '').slice(0, 300),
          ],
        )
      ).rows[0];
      await c.query(
        'INSERT INTO audit_events(actor_id,entity_id,action,details) VALUES(NULL,$1,$2,$3)',
        [
          d.id,
          'Decisión del destinatario en portal',
          {
            receiptId: r.id,
            shareId: s.id,
            signerName: b.name,
            decision: b.decision,
            sha256: a.sha256,
            identity: 'Declarada por quien posee el enlace; sin certificado cualificado',
          },
        ],
      );
      return r;
    });
  });
}
