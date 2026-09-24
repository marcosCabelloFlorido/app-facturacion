import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool, assert, audit, transaction } from './db.ts';
import { requireAdmin } from './auth.ts';
import { runCommand, paramId } from './finance.ts';
import { templateSchema } from '../shared/templates.ts';
import { templateLogo } from './template-assets.ts';
import { documentPdf } from './pdf.ts';
import { getDocument, lockDocument } from './services.ts';
export async function templateRoutes(api: FastifyInstance) {
  api.get('/documents/:id/template', async (req) => {
    const id = paramId(req);
    const doc = await getDocument(pool as any, id);
    const rendering =
      (
        await pool.query(
          "SELECT r.*,v.data->>'name' AS name FROM document_renderings r LEFT JOIN template_versions v ON v.template_id=r.template_id AND v.version=r.template_version WHERE document_id=$1",
          [id],
        )
      ).rows[0] || null;
    const choice = (
      await pool.query('SELECT template_id FROM document_template_choices WHERE document_id=$1', [
        id,
      ])
    ).rows[0];
    return { templateId: choice?.template_id || null, rendering, editable: doc.status === 'draft' };
  });
  api.put('/documents/:id/template', async (req) => {
    const b = z
      .object({ templateId: z.uuid().nullable(), version: z.number().int().positive() })
      .parse(req.body);
    return runCommand(req, async (c) => {
      const d = await lockDocument(c, paramId(req));
      assert(d.status === 'draft', 'El PDF emitido conserva su plantilla.', 400);
      assert(d.version === b.version, 'El documento ha cambiado. Recarga antes de guardar.');
      if (b.templateId)
        assert(
          (
            await c.query(
              'SELECT 1 FROM document_templates WHERE id=$1 AND kind=$2 AND archived_at IS NULL',
              [b.templateId, d.kind],
            )
          ).rowCount,
          'Selecciona una plantilla del mismo tipo de documento.',
          400,
        );
      await c.query(
        'INSERT INTO document_template_choices(document_id,template_id,updated_by) VALUES($1,$2,$3) ON CONFLICT(document_id) DO UPDATE SET template_id=excluded.template_id,updated_by=excluded.updated_by,updated_at=now()',
        [d.id, b.templateId, req.user!.id],
      );
      await c.query('UPDATE documents SET version=version+1 WHERE id=$1', [d.id]);
      await audit(c, req.user!.id, d.id, 'Plantilla del borrador seleccionada', {
        templateId: b.templateId,
      });
      return { ok: true };
    });
  });
  api.get(
    '/templates',
    async () =>
      (
        await pool.query(
          'SELECT * FROM document_templates WHERE archived_at IS NULL ORDER BY kind,name',
        )
      ).rows,
  );
  api.get(
    '/templates/:id/versions',
    async (req) =>
      (
        await pool.query(
          'SELECT version,data,created_at FROM template_versions WHERE template_id=$1 ORDER BY version DESC',
          [paramId(req)],
        )
      ).rows,
  );
  api.post('/templates', async (req) => {
    requireAdmin(req);
    const b = templateSchema.parse(req.body);
    return runCommand(req, async (c) => {
      await templateLogo(c, b.settings);
      const t = (
        await c.query(
          'INSERT INTO document_templates(name,kind,settings,created_by) VALUES($1,$2,$3,$4) RETURNING *',
          [b.name, b.kind, b.settings, req.user!.id],
        )
      ).rows[0];
      await c.query(
        'INSERT INTO template_versions(template_id,version,data,created_by) VALUES($1,1,$2,$3)',
        [t.id, t, req.user!.id],
      );
      await audit(c, req.user!.id, t.id, 'Plantilla creada');
      return t;
    });
  });
  api.put('/templates/:id', async (req) => {
    requireAdmin(req);
    const b = templateSchema.extend({ version: z.number().int().positive() }).parse(req.body);
    return runCommand(req, async (c) => {
      await templateLogo(c, b.settings);
      const t = (
        await c.query(
          'UPDATE document_templates SET name=$2,settings=$3,version=version+1 WHERE id=$1 AND version=$4 AND kind=$5 AND archived_at IS NULL RETURNING *',
          [paramId(req), b.name, b.settings, b.version, b.kind],
        )
      ).rows[0];
      assert(t, 'La plantilla ha cambiado. Recarga antes de guardar.');
      await c.query(
        'INSERT INTO template_versions(template_id,version,data,created_by) VALUES($1,$2,$3,$4)',
        [t.id, t.version, t, req.user!.id],
      );
      await audit(c, req.user!.id, t.id, 'Nueva versión de plantilla', { version: t.version });
      return t;
    });
  });
  api.post('/templates/:id/activate', async (req) => {
    requireAdmin(req);
    const b = z
      .object({ version: z.number().int().positive(), active: z.boolean() })
      .parse(req.body);
    return runCommand(req, async (c) => {
      await c.query(
        "SELECT pg_advisory_xact_lock(hashtextextended(current_schema()||':templates',0))",
      );
      const t = (
        await c.query(
          'SELECT * FROM document_templates WHERE id=$1 AND archived_at IS NULL FOR UPDATE',
          [paramId(req)],
        )
      ).rows[0];
      assert(t && t.version === b.version, 'La plantilla ha cambiado.');
      if (b.active)
        await c.query('UPDATE document_templates SET active=false WHERE kind=$1 AND active', [
          t.kind,
        ]);
      await c.query('UPDATE document_templates SET active=$2 WHERE id=$1', [t.id, b.active]);
      await audit(c, req.user!.id, t.id, b.active ? 'Plantilla activada' : 'Plantilla desactivada');
      return { ok: true };
    });
  });
  api.delete('/templates/:id', async (req) => {
    requireAdmin(req);
    const b = z.object({ version: z.number().int().positive() }).parse(req.body);
    return runCommand(req, async (c) => {
      const t = (
        await c.query(
          'SELECT * FROM document_templates WHERE id=$1 AND archived_at IS NULL FOR UPDATE',
          [paramId(req)],
        )
      ).rows[0];
      assert(
        t && t.version === b.version,
        'La plantilla ha cambiado. Recarga antes de eliminarla.',
      );
      await c.query('UPDATE document_templates SET active=false,archived_at=now() WHERE id=$1', [
        t.id,
      ]);
      await c.query(
        'UPDATE document_template_choices SET template_id=NULL,updated_by=$2,updated_at=now() WHERE template_id=$1',
        [t.id, req.user!.id],
      );
      await audit(c, req.user!.id, t.id, 'Plantilla eliminada', {
        name: t.name,
        kind: t.kind,
        version: t.version,
      });
      return { ok: true };
    });
  });
  api.post('/templates/preview', async (req, reply) => {
    const b = templateSchema.extend({ documentId: z.uuid() }).parse(req.body);
    const buffer = await transaction(async (c) => {
      const d = await getDocument(c, b.documentId);
      assert(d.kind === b.kind, 'Selecciona un documento del mismo tipo.', 400);
      const company =
        d.company_snapshot || (await c.query('SELECT data FROM company WHERE id=1')).rows[0].data;
      return documentPdf(d, company, b.settings, await templateLogo(c, b.settings));
    }, true);
    return reply
      .type('application/pdf')
      .header('Content-Disposition', 'inline; filename="vista-previa.pdf"')
      .send(buffer);
  });
}
