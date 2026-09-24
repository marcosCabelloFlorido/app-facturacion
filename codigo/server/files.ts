import { previewFileTable } from './file-preview.ts';
import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { pool, assert, audit } from './db.ts';
import { getDocument, lockDocument } from './services.ts';
import { runCommand, paramId } from './finance.ts';
import { checkXlsxArchive, readTable } from './import-reader.ts';
export const filePayload = z.object({
  filename: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((v) => !/[\r\n\/\\]/.test(v)),
  data: z
    .string()
    .max(7 * 1024 * 1024)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  documentId: z.uuid().nullable().default(null),
});
export function inspectFile(filename: string, data: Buffer) {
  assert(
    data.length > 0 && data.length <= 5 * 1024 * 1024,
    'El archivo debe ocupar entre 1 byte y 5 MB.',
    400,
  );
  const ext = filename.split('.').at(-1)?.toLowerCase();
  let mime = '';
  if (ext === 'pdf' && data.subarray(0, 5).toString() === '%PDF-') mime = 'application/pdf';
  if (ext === 'png' && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    mime = 'image/png';
  if (['jpg', 'jpeg'].includes(ext || '') && data[0] === 255 && data[1] === 216 && data[2] === 255)
    mime = 'image/jpeg';
  if (ext === 'csv' && !data.includes(0)) mime = 'text/csv';
  if (ext === 'xlsx') {
    checkXlsxArchive(data);
    mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  assert(mime, 'Admite PDF, PNG, JPEG, CSV y XLSX con contenido válido.', 400);
  return mime;
}
export async function fileRoutes(api: FastifyInstance) {
  api.get('/documents/:id/files', async (req) => {
    const id = paramId(req);
    await getDocument(pool, id);
    return (
      await pool.query(
        'SELECT id,filename,mime,size,sha256,created_at FROM active_stored_files WHERE document_id=$1 ORDER BY created_at,id',
        [id],
      )
    ).rows;
  });
  api.post('/files', { bodyLimit: 8 * 1024 * 1024 }, async (req) => {
    const b = filePayload.parse(req.body),
      data = Buffer.from(b.data, 'base64'),
      mime = inspectFile(b.filename, data),
      hash = createHash('sha256').update(data).digest('hex');
    return runCommand(req, async (c) => {
      if (b.documentId) await lockDocument(c, b.documentId);
      const existing = (
        await c.query(
          'SELECT id,filename,mime,size,sha256 FROM stored_files WHERE document_id IS NOT DISTINCT FROM $1 AND sha256=$2 AND deleted_document_id IS NULL',
          [b.documentId, hash],
        )
      ).rows[0];
      if (existing) {
        const restored = await c.query('DELETE FROM file_removals WHERE file_id=$1', [existing.id]);
        if (restored.rowCount)
          await audit(c, req.user!.id, b.documentId!, 'Original restaurado', {
            fileId: existing.id,
            filename: existing.filename,
            sha256: hash,
          });
        return existing;
      }
      const row =
        (
          await c.query(
            'INSERT INTO stored_files(document_id,filename,mime,data,sha256,size,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id,filename,mime,size,sha256',
            [b.documentId, b.filename, mime, data, hash, data.length, req.user!.id],
          )
        ).rows[0] ||
        (
          await c.query(
            'SELECT id,filename,mime,size,sha256 FROM stored_files WHERE document_id IS NOT DISTINCT FROM $1 AND sha256=$2 AND deleted_document_id IS NULL',
            [b.documentId, hash],
          )
        ).rows[0];
      await audit(c, req.user!.id, b.documentId || row.id, 'Original adjuntado', {
        fileId: row.id,
        sha256: hash,
        filename: b.filename,
      });
      return row;
    });
  });
  for (const restore of [false, true]) {
    api.route({
      method: restore ? 'POST' : 'DELETE',
      url: '/documents/:id/files/:fileId' + (restore ? '/restore' : ''),
      handler: async (req) => {
        const { id, fileId } = z.object({ id: z.uuid(), fileId: z.uuid() }).parse(req.params);
        return runCommand(req, async (c) => {
          await lockDocument(c, id);
          const file = (
            await c.query(
              'SELECT id,filename,sha256 FROM stored_files WHERE id=$1 AND document_id=$2',
              [fileId, id],
            )
          ).rows[0];
          assert(file, 'Archivo no encontrado.', 404);
          const changed = restore
            ? await c.query('DELETE FROM file_removals WHERE file_id=$1', [fileId])
            : await c.query(
                'INSERT INTO file_removals(file_id,removed_by) VALUES($1,$2) ON CONFLICT DO NOTHING',
                [fileId, req.user!.id],
              );
          if (changed.rowCount)
            await audit(
              c,
              req.user!.id,
              id,
              restore ? 'Original restaurado' : 'Original eliminado',
              {
                fileId,
                filename: file.filename,
                sha256: file.sha256,
              },
            );
          return { ok: true };
        });
      },
    });
  }
  api.get('/files/:id', async (req, reply) => {
    const f = (await pool.query('SELECT * FROM active_stored_files WHERE id=$1', [paramId(req)]))
      .rows[0];
    assert(f, 'Archivo no encontrado.', 404);
    const inline =
      (req.query as { inline?: string }).inline === '1' &&
      ['application/pdf', 'image/png', 'image/jpeg'].includes(f.mime);
    return reply
      .type(f.mime)
      .header(
        'Content-Disposition',
        `${inline ? 'inline' : 'attachment'}; filename="archivo.${f.filename.split('.').at(-1)}"; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      )
      .header('X-Content-Type-Options', 'nosniff')
      .header('Cache-Control', 'private,no-store')
      .header('ETag', `"${f.sha256}"`)
      .send(f.data);
  });
  api.get('/files/:id/preview', async (req, reply) => {
    const options = z
      .object({
        page: z.coerce.number().int().min(1).max(201).default(1),
        sheet: z.coerce.number().int().min(0).default(0),
        delimiter: z.enum(['auto', ';', ',', '\t']).default('auto'),
        encoding: z.enum(['utf-8', 'windows-1252']).default('utf-8'),
      })
      .parse(req.query);
    const file = (
      await pool.query('SELECT filename,data FROM active_stored_files WHERE id=$1', [paramId(req)])
    ).rows[0];
    assert(file, 'Archivo no encontrado.', 404);
    reply.header('Cache-Control', 'private,no-store');
    return previewFileTable(file, options);
  });
  api.get('/files/:id/table', async (req) => {
    const b = z
      .object({
        delimiter: z.enum([';', ',', '\t']).default(';'),
        encoding: z.enum(['utf-8', 'windows-1252']).default('utf-8'),
      })
      .parse(req.query);
    const f = (
      await pool.query('SELECT filename,data FROM active_stored_files WHERE id=$1', [paramId(req)])
    ).rows[0];
    assert(f, 'Archivo no encontrado.', 404);
    const inline =
      (req.query as { inline?: string }).inline === '1' &&
      ['application/pdf', 'image/png', 'image/jpeg'].includes(f.mime);
    const table = await readTable(f, b.delimiter, b.encoding);
    return { headers: table.headers, sample: table.rows.slice(0, 10), rowCount: table.rows.length };
  });
}
