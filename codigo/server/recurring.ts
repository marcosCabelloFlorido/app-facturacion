import type { PoolClient } from 'pg';
import { z, ZodError } from 'zod';
import { contactParty } from '../shared/contacts.ts';
import {
  addDays,
  isFinished,
  nextOccurrence,
  renderText,
  type Frequency,
} from '../shared/recurring.ts';
import { AppError, assert, audit, pool, transaction } from './db.ts';
import { issueDocument, saveDocument } from './services.ts';
import { prepareDocumentMessage, queueMessage } from './mail.ts';

const money = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});
const longDate = (d: string) => d.split('-').reverse().join('/');
const MAX_CATCH_UP = 60;

export type Outcome = 'none' | 'generated' | 'blocked';
export type ProcessOptions = {
  /** Fecha de hoy (Europe/Madrid). Solo se inyecta en tests. */
  today?: string;
  /** Acción manual: emitir ya, o reintentar una fecha con error. No exige next_date <= hoy. */
  manual?: 'now' | 'retry';
};

function failureMessage(e: unknown) {
  if (e instanceof AppError) return e.message;
  if (e instanceof ZodError)
    return (
      'Los datos de la factura no son válidos: ' + (e.issues[0]?.message ?? 'revisa la plantilla.')
    );
  // RAISE EXCEPTION de los triggers: el texto ya está pensado para el usuario.
  if ((e as { code?: string })?.code === 'P0001') return (e as Error).message;
  console.error('Error inesperado en facturación recurrente', e);
  return 'Error inesperado al generar la factura. Revisa el registro del servidor.';
}

async function advance(c: PoolClient, rec: any, counted: boolean) {
  const done = rec.occurrences_done + (counted ? 1 : 0);
  const next = nextOccurrence(
    rec.next_date,
    rec.frequency as Frequency,
    rec.interval_count,
    Number(rec.start_date.slice(8, 10)),
  );
  const finished = isFinished(next, done, rec.end_date, rec.max_occurrences);
  await c.query(
    "UPDATE recurring_invoices SET next_date=$2,occurrences_done=$3,status=CASE WHEN $4 THEN 'finished' ELSE status END,version=version+1,updated_at=now() WHERE id=$1",
    [rec.id, next, done, finished],
  );
}

async function upsertRun(
  c: PoolClient,
  recurringId: string,
  date: string,
  status: string,
  documentId: string | null,
  error: string | null,
  note: string | null,
) {
  await c.query(
    `INSERT INTO recurring_runs(recurring_id,scheduled_date,status,document_id,error,note) VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(recurring_id,scheduled_date) DO UPDATE SET status=excluded.status,document_id=excluded.document_id,error=excluded.error,note=excluded.note,updated_at=now()`,
    [recurringId, date, status, documentId, error, note],
  );
}

async function generate(c: PoolClient, rec: any, scheduled: string, today: string) {
  const userId: string = rec.created_by;
  const contact = (await c.query('SELECT * FROM contacts WHERE id=$1', [rec.contact_id])).rows[0];
  assert(contact?.active, 'El contacto está archivado o ya no existe.');
  const user = (await c.query('SELECT active FROM public.users WHERE id=$1', [userId])).rows[0];
  assert(user?.active, 'El usuario que creó la recurrencia ya no está activo.');
  const party = contactParty(contact.data);

  // Validar el envío antes de crear nada: si falla, no queda ninguna factura a medias.
  let recipient = '';
  if (rec.auto_send) {
    recipient = (rec.recipient || party.email || '').trim();
    assert(
      z.email().safeParse(recipient).success,
      'No hay un correo de destino válido (ni en la recurrencia ni en el contacto).',
    );
    const smtp = (await c.query('SELECT * FROM communication_settings WHERE id=1')).rows[0];
    assert(
      smtp?.data.enabled && smtp.verified_version === smtp.version,
      'El servidor de correo no está configurado, habilitado y verificado.',
    );
  }

  // Cada factura lleva la fecha de su periodo, salvo periodo cerrado o serie ya emitida más adelante.
  let date = scheduled;
  let note: string | null = null;
  const closed = (
    await c.query("SELECT closed_at FROM periods WHERE month=date_trunc('month',$1::date)::date", [
      scheduled,
    ])
  ).rows[0]?.closed_at;
  const lastDate: string | null = rec.series_code
    ? ((
        await c.query('SELECT last_date FROM series_counters WHERE code=$1 AND year=$2', [
          rec.series_code,
          Number(scheduled.slice(0, 4)),
        ])
      ).rows[0]?.last_date ?? null)
    : ((
        await c.query("SELECT last_date FROM series WHERE kind='invoice' AND year=$1", [
          Number(scheduled.slice(0, 4)),
        ])
      ).rows[0]?.last_date ?? null);
  if (scheduled > today) {
    date = today;
    note = 'Emitida antes de la fecha prevista.';
  } else if (closed) {
    date = today;
    note = `El periodo contable de ${longDate(scheduled)} está cerrado: se usa la fecha de hoy.`;
  } else if (lastDate && lastDate > scheduled) {
    date = today;
    note = `La serie ya tiene facturas posteriores a ${longDate(scheduled)}: se usa la fecha de hoy.`;
  }

  const draft = await saveDocument(c, userId, {
    kind: 'invoice',
    date,
    dueDate: addDays(date, rec.payment_days),
    party,
    reference: '',
    notes: rec.notes,
    retentionRate: String(rec.retention_rate) as '0' | '7' | '15' | '19',
    seriesCode: rec.series_code,
    lines: rec.lines,
  });
  await c.query('UPDATE documents SET recurring_id=$2 WHERE id=$1', [draft.id, rec.id]);
  if (rec.template_id)
    await c.query(
      'INSERT INTO document_template_choices(document_id,template_id,updated_by) VALUES($1,$2,$3) ON CONFLICT(document_id) DO UPDATE SET template_id=excluded.template_id',
      [draft.id, rec.template_id, userId],
    );
  if (!rec.auto_issue) {
    return { status: 'draft', documentId: draft.id, note };
  }
  const issued = await issueDocument(c, userId, draft.id, draft.version);
  if (rec.auto_send) {
    const vars = {
      cliente: party.name,
      numero: issued.number ?? '',
      importe: money.format(Number(issued.total)),
      fecha: longDate(issued.date),
      vencimiento: longDate(issued.due_date),
      empresa: (issued.company_snapshot as { name?: string } | null)?.name ?? '',
    };
    const message = await prepareDocumentMessage(c, userId, issued, {
      recipient,
      subject:
        renderText(rec.subject, vars)
          .replace(/[\r\n]+/g, ' ')
          .trim()
          .slice(0, 200) || `Factura ${vars.numero}`,
      body:
        renderText(rec.body, vars).trim().slice(0, 20000) ||
        `Adjuntamos la factura ${vars.numero}.`,
    });
    const row = (await c.query('SELECT * FROM outgoing_messages WHERE id=$1', [message.id]))
      .rows[0];
    await queueMessage(c, userId, row);
  }
  return { status: 'issued', documentId: issued.id, note };
}

const recSelect =
  'SELECT *,start_date::text AS start_date,next_date::text AS next_date,end_date::text AS end_date FROM recurring_invoices';

/**
 * Procesa la siguiente fecha pendiente de una recurrencia en su propia transacción.
 * El worker bloquea la fila con FOR UPDATE SKIP LOCKED para que dos instancias no choquen.
 * No usa SAVEPOINT: el trigger guard_entry_append exige que el asiento y sus líneas
 * nazcan en la misma (sub)transacción. Si falla, se deshace todo y el error se anota en
 * una segunda transacción, sin avanzar la fecha.
 */
export async function processNext(id: string, options: ProcessOptions = {}): Promise<Outcome> {
  let pending: { scheduled: string; userId: string } | null = null;
  try {
    return await transaction(async (c) => {
      const today = options.today ?? (await c.query('SELECT CURRENT_DATE::text AS d')).rows[0].d;
      const rec = (
        await c.query(
          options.manual
            ? `${recSelect} WHERE id=$1 AND status='active' FOR UPDATE`
            : `${recSelect} WHERE id=$1 AND status='active' AND next_date<=$2::date FOR UPDATE SKIP LOCKED`,
          options.manual ? [id] : [id, today],
        )
      ).rows[0];
      if (!rec) return 'none';
      const scheduled: string = rec.next_date;
      const run = (
        await c.query('SELECT * FROM recurring_runs WHERE recurring_id=$1 AND scheduled_date=$2', [
          id,
          scheduled,
        ])
      ).rows[0];
      if (options.manual === 'retry')
        assert(run?.status === 'failed', 'No hay ninguna ejecución con error que reintentar.');
      else if (run?.status === 'failed') return 'blocked';
      else if (run) {
        // Ya estaba hecha (p. ej. una ejecución interrumpida): solo avanzar.
        await advance(c, rec, run.status === 'issued' || run.status === 'draft');
        return 'generated';
      }
      pending = { scheduled, userId: rec.created_by };
      const result = await generate(c, rec, scheduled, today);
      await upsertRun(c, id, scheduled, result.status, result.documentId, null, result.note);
      await audit(c, rec.created_by, id, 'Factura recurrente generada', {
        scheduledDate: scheduled,
        documentId: result.documentId,
        status: result.status,
      });
      await advance(c, rec, true);
      return 'generated';
    });
  } catch (e) {
    if (!pending) throw e;
    const { scheduled, userId } = pending as { scheduled: string; userId: string };
    const error = failureMessage(e);
    await transaction(async (c) => {
      await c.query('SELECT 1 FROM recurring_invoices WHERE id=$1 FOR UPDATE', [id]);
      await upsertRun(c, id, scheduled, 'failed', null, error, null);
      await audit(c, userId, id, 'Factura recurrente fallida', { scheduledDate: scheduled, error });
    });
    return 'blocked';
  }
}

/** Salta la fecha pendiente (con o sin error previo) y avanza a la siguiente. */
export async function skipNext(c: PoolClient, id: string, userId: string) {
  const rec = (
    await c.query(
      "SELECT *,start_date::text AS start_date,next_date::text AS next_date,end_date::text AS end_date FROM recurring_invoices WHERE id=$1 AND status IN ('active','paused') FOR UPDATE",
      [id],
    )
  ).rows[0];
  assert(rec, 'La recurrencia no existe o ya ha finalizado.', 404);
  const run = (
    await c.query('SELECT status FROM recurring_runs WHERE recurring_id=$1 AND scheduled_date=$2', [
      id,
      rec.next_date,
    ])
  ).rows[0];
  assert(!run || run.status === 'failed', 'Esa fecha ya se ha generado.');
  await upsertRun(c, id, rec.next_date, 'skipped', null, null, 'Omitida manualmente.');
  await audit(c, userId, id, 'Fecha de factura recurrente omitida', {
    scheduledDate: rec.next_date,
  });
  await advance(c, rec, false);
  return { skipped: rec.next_date as string };
}

/**
 * Recorre las recurrencias vencidas del negocio actual (debe ejecutarse dentro de workspaceContext).
 * Si el servidor estuvo parado, genera los periodos pendientes uno a uno y en orden.
 * Se detiene en la primera fecha con error de cada recurrencia.
 */
export async function runRecurringForWorkspace(options: { today?: string } = {}) {
  const enabled = (await pool.query('SELECT enabled FROM recurring_settings WHERE id=1')).rows[0]
    ?.enabled;
  if (!enabled) return { generated: 0, blocked: 0 };
  const today = options.today ?? (await pool.query('SELECT CURRENT_DATE::text AS d')).rows[0].d;
  const ids = (
    await pool.query(
      "SELECT id FROM recurring_invoices WHERE status='active' AND next_date<=$1::date ORDER BY next_date,created_at",
      [today],
    )
  ).rows;
  let generated = 0;
  let blocked = 0;
  for (const { id } of ids) {
    for (let n = 0; n < MAX_CATCH_UP; n++) {
      const outcome = await processNext(id, { today });
      if (outcome === 'generated') generated++;
      else {
        if (outcome === 'blocked') blocked++;
        break;
      }
    }
  }
  return { generated, blocked };
}
