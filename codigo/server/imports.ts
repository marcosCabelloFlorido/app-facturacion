import type { FastifyInstance } from 'fastify';
import { searchWhere } from './advanced-search.ts';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { pool, assert, audit, AppError } from './db.ts';
import { documentSchema, productSchema, calculate } from '../shared/domain.ts';
import { saveDocument } from './services.ts';
import { runCommand, paramId } from './finance.ts';
import { readTable } from './import-reader.ts';
import { importMetricSchema, importMetricCondition } from './module-kpis.ts';
const hash = (v: unknown) =>
  createHash('sha256')
    .update(typeof v === 'string' ? v : JSON.stringify(v))
    .digest('hex');
const decimal = (v: string, fallback = '0') => {
  const s = (v || fallback).trim().replace(/\s/g, '');
  return s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
};
const date = (v: string) => {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
};
const options = z.object({
  delimiter: z.enum([';', ',', '\t']).default(';'),
  encoding: z.enum(['utf-8', 'windows-1252']).default('utf-8'),
});
export async function importRoutes(api: FastifyInstance) {
  api.get('/imports', async (req) => {
    const { metric, page, pagination, search } = z
      .object({
        search: z.string().max(4096).default(''),
        pagination: z.literal('1').optional(),
        metric: importMetricSchema.default('all'),
        page: z.coerce.number().int().min(1).max(100000).default(1),
      })
      .parse(req.query);
    const values: unknown[] = [(page - 1) * 100, pagination ? 101 : 100];
    const where = searchWhere(
      search,
      'imports',
      { text: "concat_ws(' ',f.filename,b.kind)", date: 'b.created_at::date' },
      values,
    );
    const rows = (
      await pool.query(
        `SELECT b.*,f.filename,count(i.id)::int AS total,count(i.id) FILTER(WHERE i.status='ready')::int AS ready,count(i.id) FILTER(WHERE i.status='imported')::int AS imported,count(i.id) FILTER(WHERE i.status='error')::int AS errors FROM import_batches b JOIN stored_files f ON f.id=b.file_id LEFT JOIN import_items i ON i.batch_id=b.id WHERE (${importMetricCondition(metric)}) AND (${where}) GROUP BY b.id,f.filename ORDER BY b.created_at DESC,b.id DESC LIMIT $2 OFFSET $1`,
        values,
      )
    ).rows;
    return pagination ? { rows: rows.slice(0, 100), hasMore: rows.length > 100 } : rows;
  });
  api.post('/imports/preview', async (req) => {
    const b = options
      .extend({
        fileId: z.uuid(),
        kind: z.enum(['invoice', 'purchase', 'product']),
        mapping: z.record(z.string().max(40), z.number().int().min(0).max(99)),
      })
      .parse(req.body);
    const f = (
      await pool.query('SELECT id,filename,data,sha256 FROM active_stored_files WHERE id=$1', [
        b.fileId,
      ])
    ).rows[0];
    assert(f, 'Archivo no encontrado.', 404);
    const table = await readTable(f, b.delimiter, b.encoding);
    assert(
      Object.values(b.mapping).every((i) => i < table.headers.length),
      'El mapeo apunta a una columna inexistente.',
      400,
    );
    const mapping = {
      ...b,
      mapping: Object.fromEntries(Object.entries(b.mapping).sort(([a], [b]) => a.localeCompare(b))),
    };
    const mappingHash = hash(mapping);
    return runCommand(req, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        f.id + b.kind + mappingHash,
      ]);
      const old = (
        await c.query(
          'SELECT id FROM import_batches WHERE file_id=$1 AND kind=$2 AND mapping_hash=$3',
          [f.id, b.kind, mappingHash],
        )
      ).rows[0];
      if (old) return old;
      const batch = (
        await c.query(
          'INSERT INTO import_batches(file_id,kind,mapping,mapping_hash,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id',
          [f.id, b.kind, mapping, mappingHash, req.user!.id],
        )
      ).rows[0];
      const groups = new Map<
        string,
        {
          row: number;
          values: Record<string, string>;
          lines: { row: number; value: Record<string, string> }[];
        }
      >();
      table.rows.forEach((row, index) => {
        const values: Record<string, string> = Object.fromEntries(
          Object.entries(b.mapping).map(([field, col]) => [field, (row[col] || '').trim()]),
        );
        const key = b.kind === 'product' ? String(index) : values.recordKey || String(index);
        const group = groups.get(key);
        if (group) group.lines.push({ row: index + 2, value: values });
        else
          groups.set(key, { row: index + 2, values, lines: [{ row: index + 2, value: values }] });
      });
      for (const [key, g] of groups) {
        const v = g.values;
        let payload: unknown;
        let errors: { row: number; field: string; message: string }[] = [];
        if (b.kind === 'product')
          payload = {
            sku: v.sku || '',
            name: v.productName || '',
            description: v.description || '',
            unitPrice: decimal(v.unitPrice),
            taxRate: decimal(v.taxRate, '21'),
            exemptionReason: v.exemptionReason || '',
            unit: v.unit || 'ud.',
            active: true,
          };
        else {
          payload = {
            kind: b.kind,
            date: date(v.date || ''),
            dueDate: date(v.dueDate || v.date || ''),
            party: {
              name: v.partyName || '',
              taxId: v.taxId || '',
              address: v.address || '',
              email: v.email || '',
            },
            reference: v.reference || '',
            notes: `Importado desde ${f.filename}, registro ${key}`,
            retentionRate: decimal(v.retentionRate),
            lines: g.lines.map((l) => ({
              description: l.value.description || '',
              quantity: decimal(l.value.quantity, '1'),
              unitPrice: decimal(l.value.unitPrice),
              discount: decimal(l.value.discount),
              taxRate: decimal(l.value.taxRate, '21'),
              exemptionReason: l.value.exemptionReason || '',
            })),
          };
          for (const l of g.lines)
            for (const field of [
              'partyName',
              'taxId',
              'address',
              'email',
              'date',
              'dueDate',
              'reference',
              'retentionRate',
            ])
              if ((l.value[field] || '') !== (v[field] || ''))
                errors.push({
                  row: l.row,
                  field,
                  message:
                    'Las filas del mismo documento deben compartir tercero, fechas y referencia.',
                });
          if (b.kind === 'purchase' && !v.reference)
            errors.push({
              row: g.row,
              field: 'reference',
              message: 'Falta el número del proveedor.',
            });
        }
        const parsed = (b.kind === 'product' ? productSchema : documentSchema).safeParse(payload);
        if (!parsed.success)
          errors.push(
            ...parsed.error.issues.map((e) => ({
              row:
                e.path[0] === 'lines' && typeof e.path[1] === 'number'
                  ? g.lines[e.path[1]]?.row || g.row
                  : g.row,
              field: e.path.join('.'),
              message: e.message,
            })),
          );
        if (parsed.success && b.kind !== 'product') {
          const d = documentSchema.parse(parsed.data);
          if (Number(calculate(d.lines, d.retentionRate).total) <= 0)
            errors.push({ row: g.row, field: 'total', message: 'El total debe ser positivo.' });
        }
        if (
          parsed.success &&
          b.kind === 'product' &&
          (await c.query('SELECT 1 FROM products WHERE sku=$1', [v.sku])).rowCount
        )
          errors.push({
            row: g.row,
            field: 'sku',
            message: 'El SKU ya existe. No se sustituirá el artículo.',
          });
        if (
          parsed.success &&
          b.kind === 'purchase' &&
          (
            await c.query(
              "SELECT 1 FROM documents WHERE kind='purchase' AND regexp_replace(upper(party->>'taxId'),'[^A-Z0-9]','','g')=regexp_replace(upper($1),'[^A-Z0-9]','','g') AND reference=$2 AND extract(year from date)=extract(year from $3::date)",
              [v.taxId, v.reference, date(v.date)],
            )
          ).rowCount
        )
          errors.push({
            row: g.row,
            field: 'reference',
            message: 'Ya existe una compra del proveedor con esa referencia y ejercicio.',
          });
        const sourceKey = hash([f.sha256, b.kind, key]);
        const prior = (
          await c.query('SELECT result_id FROM import_results WHERE source_key=$1', [sourceKey])
        ).rows[0];
        await c.query(
          'INSERT INTO import_items(batch_id,row_number,source_key,payload,errors,status,result_id) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [
            batch.id,
            g.row,
            sourceKey,
            parsed.success ? parsed.data : payload,
            JSON.stringify(errors),
            prior ? 'duplicate' : errors.length ? 'error' : 'ready',
            prior?.result_id || null,
          ],
        );
      }
      await audit(c, req.user!.id, batch.id, 'Importación preparada para revisar', {
        filename: f.filename,
        kind: b.kind,
        count: groups.size,
      });
      return batch;
    });
  });
  api.get('/imports/:id', async (req) => {
    const id = paramId(req),
      q = z.object({ page: z.coerce.number().int().min(1).default(1) }).parse(req.query);
    const b = (
      await pool.query(
        'SELECT b.*,f.filename FROM import_batches b JOIN stored_files f ON f.id=b.file_id WHERE b.id=$1',
        [id],
      )
    ).rows[0];
    assert(b, 'Lote no encontrado.', 404);
    const rows = (
      await pool.query(
        'SELECT * FROM import_items WHERE batch_id=$1 ORDER BY row_number LIMIT 50 OFFSET $2',
        [id, (q.page - 1) * 50],
      )
    ).rows;
    const totals = (
      await pool.query(
        'SELECT status,count(*)::int AS count FROM import_items WHERE batch_id=$1 GROUP BY status',
        [id],
      )
    ).rows;
    return { ...b, rows, totals, page: q.page };
  });
  api.post('/imports/:id/commit', async (req) => {
    const b = z
      .object({ rows: z.array(z.number().int().positive()).max(100).optional() })
      .parse(req.body);
    return runCommand(req, async (c) => {
      const id = paramId(req),
        batch = (await c.query('SELECT * FROM import_batches WHERE id=$1 FOR UPDATE', [id]))
          .rows[0];
      assert(batch, 'Lote no encontrado.', 404);
      const items = (
        await c.query(
          "SELECT * FROM import_items WHERE batch_id=$1 AND status='ready' AND($2::bigint[] IS NULL OR id=ANY($2)) ORDER BY row_number LIMIT 100 FOR UPDATE",
          [id, b.rows || null],
        )
      ).rows;
      let imported = 0,
        failed = 0,
        duplicates = 0;
      for (const item of items) {
        await c.query('SAVEPOINT import_row');
        try {
          await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [item.source_key]);
          const prior = (
            await c.query('SELECT result_id FROM import_results WHERE source_key=$1', [
              item.source_key,
            ])
          ).rows[0];
          let resultId = prior?.result_id;
          if (prior) duplicates++;
          else {
            if (batch.kind === 'product') {
              const p = productSchema.parse(item.payload);
              resultId = (
                await c.query(
                  'INSERT INTO products(sku,name,description,unit_price,tax_rate,exemption_reason,unit,active) VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING id',
                  [p.sku, p.name, p.description, p.unitPrice, p.taxRate, p.exemptionReason, p.unit],
                )
              ).rows[0].id;
            } else {
              const data = documentSchema.parse(item.payload);
              if (data.kind === 'purchase') {
                await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
                  data.party.taxId.toUpperCase().replace(/[^A-Z0-9]/g, '') +
                    data.reference +
                    data.date.slice(0, 4),
                ]);
                assert(
                  !(
                    await c.query(
                      "SELECT 1 FROM documents WHERE kind='purchase' AND regexp_replace(upper(party->>'taxId'),'[^A-Z0-9]','','g')=regexp_replace(upper($1),'[^A-Z0-9]','','g') AND reference=$2 AND extract(year from date)=extract(year from $3::date)",
                      [data.party.taxId, data.reference, data.date],
                    )
                  ).rowCount,
                  'Ya existe esta compra.',
                );
              }
              resultId = (await saveDocument(c, req.user!.id, data)).id;
            }
            await c.query(
              'INSERT INTO import_results(source_key,result_id,batch_id) VALUES($1,$2,$3)',
              [item.source_key, resultId, id],
            );
            imported++;
          }
          await c.query('UPDATE import_items SET status=$2,result_id=$3 WHERE id=$1', [
            item.id,
            prior ? 'duplicate' : 'imported',
            resultId,
          ]);
          await c.query('RELEASE SAVEPOINT import_row');
        } catch (e) {
          await c.query('ROLLBACK TO SAVEPOINT import_row');
          await c.query('RELEASE SAVEPOINT import_row');
          const message =
            e instanceof AppError
              ? e.message
              : (e as any).code === '23505'
                ? 'El registro ya existe.'
                : 'No se pudo importar; revisa la fila y sus campos.';
          await c.query("UPDATE import_items SET status='error',errors=$2 WHERE id=$1", [
            item.id,
            JSON.stringify([{ row: item.row_number, field: 'record', message }]),
          ]);
          failed++;
        }
      }
      await audit(c, req.user!.id, id, 'Lote de importación procesado', {
        imported,
        failed,
        duplicates,
      });
      return {
        imported,
        failed,
        duplicates,
        remaining: (
          await c.query(
            "SELECT count(*)::int AS n FROM import_items WHERE batch_id=$1 AND status='ready'",
            [id],
          )
        ).rows[0].n,
      };
    });
  });
}
