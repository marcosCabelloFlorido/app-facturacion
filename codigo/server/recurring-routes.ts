import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { calculate, dateSchema, lineSchema } from '../shared/domain.ts';
import { normalizeTaxId } from '../shared/contacts.ts';
import { frequencies, upcomingDates } from '../shared/recurring.ts';
import { assert, audit, pool } from './db.ts';
import { requireAdmin } from './auth.ts';
import { paramId, runCommand } from './finance.ts';
import { processNext, skipNext } from './recurring.ts';

const dates =
  'start_date::text AS start_date,next_date::text AS next_date,end_date::text AS end_date';
const defaultBody = [
  'Hola {cliente},',
  '',
  'Adjuntamos la factura {numero} por importe de {importe}, con vencimiento el {vencimiento}.',
  '',
  'Un saludo,',
  '{empresa}',
].join('\n');
const recurringSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    contactId: z.uuid(),
    lines: z.array(lineSchema).min(1).max(100),
    seriesCode: z
      .string()
      .regex(/^[A-Z][A-Z0-9]{1,11}$/)
      .nullable()
      .default(null),
    retentionRate: z.enum(['0', '7', '15', '19']).default('0'),
    paymentDays: z.number().int().min(0).max(365).default(30),
    notes: z.string().trim().max(4000).default(''),
    templateId: z.uuid().nullable().default(null),
    frequency: z.enum(frequencies),
    intervalCount: z.number().int().min(1).max(24).default(1),
    startDate: dateSchema,
    endDate: dateSchema.nullable().default(null),
    maxOccurrences: z.number().int().min(1).max(1000).nullable().default(null),
    autoIssue: z.boolean().default(true),
    autoSend: z.boolean().default(false),
    recipient: z.union([z.email(), z.literal('')]).default(''),
    subject: z.string().trim().min(1).max(200).default('Factura {numero}'),
    body: z.string().trim().min(1).max(20000).default(defaultBody),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: 'La fecha de fin no puede ser anterior al inicio.',
    path: ['endDate'],
  })
  .refine((v) => !v.autoSend || v.autoIssue, {
    message: 'Para enviar por correo hay que emitir la factura automáticamente.',
    path: ['autoSend'],
  });
type Body = z.infer<typeof recurringSchema>;
const versioned = z.object({ version: z.number().int().positive() });

async function validate(c: { query: (s: string, v?: unknown[]) => Promise<any> }, b: Body) {
  const contact = (await c.query('SELECT active FROM contacts WHERE id=$1', [b.contactId])).rows[0];
  assert(contact?.active, 'Elige un contacto activo.', 400);
  if (b.seriesCode) {
    const s = (await c.query('SELECT kind,active FROM series_config WHERE code=$1', [b.seriesCode]))
      .rows[0];
    assert(s?.active && s.kind === 'invoice', 'La serie no está disponible para facturas.', 400);
  }
  if (b.templateId)
    assert(
      (
        await c.query("SELECT 1 FROM document_templates WHERE id=$1 AND kind='invoice'", [
          b.templateId,
        ])
      ).rowCount,
      'La plantilla PDF no existe.',
      400,
    );
  assert(
    Number(calculate(b.lines, b.retentionRate).total) > 0,
    'El total debe ser mayor que cero.',
    400,
  );
}
const columns = (b: Body) => [
  b.name,
  b.contactId,
  JSON.stringify(b.lines),
  b.seriesCode,
  b.retentionRate,
  b.paymentDays,
  b.notes,
  b.templateId,
  b.frequency,
  b.intervalCount,
  b.endDate,
  b.maxOccurrences,
  b.autoIssue,
  b.autoSend,
  b.recipient,
  b.subject,
  b.body,
];

export async function recurringRoutes(api: FastifyInstance) {
  api.get('/recurring/settings', async () => ({
    enabled: !!(await pool.query('SELECT enabled FROM recurring_settings WHERE id=1')).rows[0]
      ?.enabled,
  }));
  api.put('/recurring/settings', async (req) => {
    requireAdmin(req);
    const b = z.object({ enabled: z.boolean() }).parse(req.body);
    return runCommand(req, async (c) => {
      await c.query(
        'UPDATE recurring_settings SET enabled=$1,updated_by=$2,updated_at=now() WHERE id=1',
        [b.enabled, req.user!.id],
      );
      await audit(
        c,
        req.user!.id,
        'recurring',
        b.enabled ? 'Facturación recurrente activada' : 'Facturación recurrente desactivada',
      );
      return b;
    });
  });
  api.get('/recurring/preview', async (req) => {
    const q = z
      .object({
        startDate: dateSchema,
        frequency: z.enum(frequencies),
        interval: z.coerce.number().int().min(1).max(24).default(1),
        count: z.coerce.number().int().min(1).max(24).default(3),
        endDate: dateSchema.optional(),
        maxOccurrences: z.coerce.number().int().min(1).optional(),
      })
      .parse(req.query);
    return {
      dates: upcomingDates(q.startDate, q.count, q.frequency, q.interval, {
        endDate: q.endDate,
        maxOccurrences: q.maxOccurrences,
      }),
    };
  });
  api.get('/recurring', async () => {
    const rows = (
      await pool.query(
        `SELECT r.*,${dates},c.data->>'name' AS contact_name,
           (SELECT to_jsonb(x) FROM (SELECT u.status,u.scheduled_date::text AS scheduled_date,u.error,u.document_id,d.number FROM recurring_runs u LEFT JOIN documents d ON d.id=u.document_id WHERE u.recurring_id=r.id ORDER BY u.scheduled_date DESC LIMIT 1) x) AS last_run
         FROM recurring_invoices r JOIN contacts c ON c.id=r.contact_id ORDER BY (r.status='finished'),r.next_date,r.created_at`,
      )
    ).rows;
    return rows.map((r) => ({ ...r, total: calculate(r.lines, String(r.retention_rate)).total }));
  });
  api.get('/recurring/:id', async (req) => {
    const id = paramId(req);
    const r = (
      await pool.query(
        `SELECT r.*,${dates},c.data->>'name' AS contact_name,c.data->>'email' AS contact_email,c.active AS contact_active FROM recurring_invoices r JOIN contacts c ON c.id=r.contact_id WHERE r.id=$1`,
        [id],
      )
    ).rows[0];
    assert(r, 'Recurrencia no encontrada.', 404);
    const runs = (
      await pool.query(
        'SELECT u.id,u.scheduled_date::text AS scheduled_date,u.status,u.error,u.note,u.document_id,u.created_at,u.updated_at,d.number,d.status AS document_status FROM recurring_runs u LEFT JOIN documents d ON d.id=u.document_id WHERE u.recurring_id=$1 ORDER BY u.scheduled_date DESC LIMIT 100',
        [id],
      )
    ).rows;
    return {
      ...r,
      total: calculate(r.lines, String(r.retention_rate)).total,
      upcoming:
        r.status === 'finished'
          ? []
          : upcomingDates(r.next_date, 3, r.frequency, r.interval_count, {
              anchorDay: Number(r.start_date.slice(8, 10)),
              endDate: r.end_date,
              maxOccurrences: r.max_occurrences,
              done: r.occurrences_done,
            }),
      runs,
    };
  });
  api.post('/recurring', async (req) => {
    const b = recurringSchema.parse(req.body);
    return runCommand(req, async (c) => {
      await validate(c, b);
      const r = (
        await c.query(
          `INSERT INTO recurring_invoices(name,contact_id,lines,series_code,retention_rate,payment_days,notes,template_id,frequency,interval_count,end_date,max_occurrences,auto_issue,auto_send,recipient,subject,body,start_date,next_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18,$19) RETURNING id,version`,
          [...columns(b), b.startDate, req.user!.id],
        )
      ).rows[0];
      await audit(c, req.user!.id, r.id, 'Recurrencia creada', {
        name: b.name,
        frequency: b.frequency,
      });
      return r;
    });
  });
  api.put('/recurring/:id', async (req) => {
    const b = recurringSchema.and(versioned).parse(req.body);
    return runCommand(req, async (c) => {
      const old = (
        await c.query(`SELECT *,${dates} FROM recurring_invoices WHERE id=$1 FOR UPDATE`, [
          paramId(req),
        ])
      ).rows[0];
      assert(old, 'Recurrencia no encontrada.', 404);
      assert(
        old.version === b.version,
        'Otra sesión ha modificado la recurrencia. Recarga los datos.',
      );
      assert(old.status !== 'finished', 'La recurrencia ha finalizado y no se puede editar.');
      assert(
        b.startDate === old.start_date || old.occurrences_done === 0,
        'El inicio no se puede cambiar una vez generada alguna factura.',
        400,
      );
      await validate(c, b);
      const startChanged = b.startDate !== old.start_date;
      await c.query(
        `UPDATE recurring_invoices SET name=$2,contact_id=$3,lines=$4,series_code=$5,retention_rate=$6,payment_days=$7,notes=$8,template_id=$9,frequency=$10,interval_count=$11,end_date=$12,max_occurrences=$13,auto_issue=$14,auto_send=$15,recipient=$16,subject=$17,body=$18,start_date=$19,next_date=CASE WHEN $20 THEN $19::date ELSE next_date END,version=version+1,updated_at=now() WHERE id=$1`,
        [old.id, ...columns(b), b.startDate, startChanged],
      );
      await audit(c, req.user!.id, old.id, 'Recurrencia actualizada');
      return { id: old.id, version: old.version + 1 };
    });
  });
  const setStatus = (path: string, from: string, to: string, action: string) =>
    api.post(path, async (req) => {
      const b = versioned.parse(req.body);
      return runCommand(req, async (c) => {
        const r = (
          await c.query(
            'UPDATE recurring_invoices SET status=$3,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 AND status=$4 RETURNING id,version',
            [paramId(req), b.version, to, from],
          )
        ).rows[0];
        assert(r, 'La recurrencia ha cambiado o no está en un estado válido para esta acción.');
        await audit(c, req.user!.id, r.id, action);
        return r;
      });
    });
  setStatus('/recurring/:id/pause', 'active', 'paused', 'Recurrencia pausada');
  setStatus('/recurring/:id/resume', 'paused', 'active', 'Recurrencia reanudada');
  const manual = (path: string, mode: 'now' | 'retry') =>
    api.post(path, async (req) => {
      const id = paramId(req);
      const outcome = await processNext(id, { manual: mode });
      assert(outcome !== 'none', 'La recurrencia no está activa.');
      const run = (
        await pool.query(
          'SELECT status,error,note,document_id FROM recurring_runs WHERE recurring_id=$1 ORDER BY updated_at DESC LIMIT 1',
          [id],
        )
      ).rows[0];
      return { outcome, run };
    });
  manual('/recurring/:id/run-now', 'now');
  manual('/recurring/:id/retry', 'retry');
  api.post('/recurring/:id/skip', async (req) => {
    const id = paramId(req);
    return runCommand(req, (c) => skipNext(c, id, req.user!.id));
  });
  api.get(
    '/recurring/:id/runs',
    async (req) =>
      (
        await pool.query(
          'SELECT u.id,u.scheduled_date::text AS scheduled_date,u.status,u.error,u.note,u.document_id,u.updated_at,d.number FROM recurring_runs u LEFT JOIN documents d ON d.id=u.document_id WHERE u.recurring_id=$1 ORDER BY u.scheduled_date DESC',
          [paramId(req)],
        )
      ).rows,
  );
  // Datos de una factura para precargar el formulario "Hacer recurrente".
  api.get('/documents/:id/recurring-draft', async (req) => {
    const d = (
      await pool.query(
        'SELECT id,kind,party,lines,retention_rate,notes,series_code,(due_date-date) AS days FROM documents WHERE id=$1',
        [paramId(req)],
      )
    ).rows[0];
    assert(d, 'Documento no encontrado.', 404);
    assert(d.kind === 'invoice', 'Solo las facturas emitidas pueden ser recurrentes.', 400);
    const contact = (
      await pool.query('SELECT id FROM contacts WHERE tax_key=$1', [normalizeTaxId(d.party.taxId)])
    ).rows[0];
    const template = (
      await pool.query('SELECT template_id FROM document_template_choices WHERE document_id=$1', [
        d.id,
      ])
    ).rows[0];
    return {
      name: `Factura recurrente · ${d.party.name}`,
      contactId: contact?.id ?? null,
      contactName: d.party.name,
      lines: d.lines,
      seriesCode: d.series_code,
      retentionRate: String(d.retention_rate),
      paymentDays: Number(d.days),
      notes: d.notes,
      templateId: template?.template_id ?? null,
    };
  });
  // Recurrencia que generó un documento, para mostrarlo en su ficha.
  api.get(
    '/documents/:id/recurring',
    async (req) =>
      (
        await pool.query(
          'SELECT r.id,r.name FROM documents d JOIN recurring_invoices r ON r.id=d.recurring_id WHERE d.id=$1',
          [paramId(req)],
        )
      ).rows[0] ?? null,
  );
}
