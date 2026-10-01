// Pruebas con base de datos real (Supabase) en un esquema temporal `workspace_<uuid>`.
// Solo se crea y borra ese esquema, un usuario y (en la prueba de correo) un negocio temporales.
// Nunca se envía correo real: el envío usa el `deliver` inyectable de processMail.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool, transaction, workspaceContext } from '../server/db.ts';
import { migrateWorkspace } from '../server/migrate.ts';
import { processNext, runRecurringForWorkspace, skipNext } from '../server/recurring.ts';
import { processMail } from '../server/mail.ts';

const workspaceId = randomUUID();
const schema = 'workspace_' + workspaceId.replaceAll('-', '');
const userId = randomUUID();
const inSchema = <T>(fn: () => Promise<T>) => workspaceContext.run(schema, fn);
const q = (sql: string, values?: unknown[]) => pool.query(sql, values);
let contactId = '';

const line = [
  { description: 'Cuota mensual', quantity: '1', unitPrice: '100', discount: '0', taxRate: '21' },
];
async function createRecurring(fields: Record<string, unknown> = {}) {
  const f = {
    name: 'Prueba',
    start_date: '2026-07-31',
    next_date: '2026-07-31',
    frequency: 'monthly',
    auto_issue: true,
    auto_send: false,
    recipient: '',
    max_occurrences: null,
    ...fields,
  };
  const keys = Object.keys(f);
  const r = await q(
    `INSERT INTO recurring_invoices(contact_id,lines,created_by,${keys.join(',')}) VALUES($1,$2,$3,${keys.map((_, i) => '$' + (i + 4)).join(',')}) RETURNING id`,
    [contactId, JSON.stringify(line), userId, ...keys.map((k) => f[k as keyof typeof f])],
  );
  return r.rows[0].id as string;
}
const enable = (on = true) => q('UPDATE recurring_settings SET enabled=$1 WHERE id=1', [on]);
const docs = (id: string) =>
  q('SELECT id,date::text,number,status FROM documents WHERE recurring_id=$1 ORDER BY date', [id]);
const runs = (id: string) =>
  q(
    'SELECT scheduled_date::text,status,error,note FROM recurring_runs WHERE recurring_id=$1 ORDER BY scheduled_date',
    [id],
  );
const rec = async (id: string) =>
  (
    await q('SELECT status,next_date::text,occurrences_done FROM recurring_invoices WHERE id=$1', [
      id,
    ])
  ).rows[0];

describe('facturación recurrente (DB)', () => {
  before(async () => {
    await transaction(async (c) => {
      await c.query(`CREATE SCHEMA "${schema}"`);
      await migrateWorkspace(c, schema);
    });
    await q(
      "INSERT INTO public.users(id,name,email,password_hash,role) VALUES($1,'Test recurrentes',$2,'x','admin')",
      [userId, `recurrentes-${userId}@example.invalid`],
    );
    await inSchema(async () => {
      await q('INSERT INTO company(id,data) VALUES(1,$1)', [
        {
          name: 'Empresa de prueba SL',
          taxId: 'B12345678',
          address: 'Calle Falsa 123, Madrid',
          email: 'empresa@example.invalid',
          iban: '',
          phone: '',
          website: '',
          paymentTerms: 'Transferencia.',
          currency: 'EUR',
        },
      ]);
      contactId = (
        await q('INSERT INTO contacts(data) VALUES($1) RETURNING id', [
          {
            type: 'customer',
            name: 'Cliente Recurrente SL',
            taxId: 'B76543210',
            address: 'Calle Cliente 1, Madrid',
            email: 'cliente@example.invalid',
          },
        ])
      ).rows[0].id;
    });
  });
  after(async () => {
    await q('DELETE FROM public.workspace_members WHERE workspace_id=$1', [workspaceId]);
    await q('DELETE FROM public.workspaces WHERE id=$1', [workspaceId]);
    await q(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await q('DELETE FROM public.users WHERE id=$1', [userId]);
    await pool.end();
  });

  test('desactivada por defecto: no genera nada', () =>
    inSchema(async () => {
      assert.equal(
        (await q('SELECT enabled FROM recurring_settings WHERE id=1')).rows[0].enabled,
        false,
      );
      const id = await createRecurring({ name: 'Desactivada' });
      assert.deepEqual(await runRecurringForWorkspace({ today: '2026-10-15' }), {
        generated: 0,
        blocked: 0,
      });
      assert.equal((await docs(id)).rowCount, 0);
      await q('DELETE FROM recurring_invoices WHERE id=$1', [id]);
    }));

  test('recupera varios periodos pendientes en orden y es idempotente', () =>
    inSchema(async () => {
      await enable();
      const id = await createRecurring({ name: 'Recuperación' });
      const first = await runRecurringForWorkspace({ today: '2026-10-15' });
      assert.deepEqual(first, { generated: 3, blocked: 0 });
      const generated = (await docs(id)).rows;
      assert.deepEqual(
        generated.map((d) => d.date),
        ['2026-07-31', '2026-08-31', '2026-09-30'],
      );
      assert.ok(generated.every((d) => d.status === 'issued' && d.number));
      assert.deepEqual(await rec(id), {
        status: 'active',
        next_date: '2026-10-31',
        occurrences_done: 3,
      });
      // Segunda pasada: nada nuevo.
      assert.deepEqual(await runRecurringForWorkspace({ today: '2026-10-15' }), {
        generated: 0,
        blocked: 0,
      });
      assert.equal((await docs(id)).rowCount, 3);
      assert.equal((await runs(id)).rowCount, 3);
      // Una ejecución concurrente tampoco duplica.
      await Promise.all([
        runRecurringForWorkspace({ today: '2026-10-31' }),
        runRecurringForWorkspace({ today: '2026-10-31' }),
      ]);
      assert.equal((await docs(id)).rowCount, 4);
      await q("UPDATE recurring_invoices SET status='paused' WHERE id=$1", [id]);
    }));

  test('error: no avanza, se puede reintentar y saltar', () =>
    inSchema(async () => {
      const id = await createRecurring({
        name: 'Con error',
        start_date: '2026-10-01',
        next_date: '2026-10-01',
      });
      await q('UPDATE contacts SET active=false WHERE id=$1', [contactId]);
      const out = await runRecurringForWorkspace({ today: '2026-11-15' });
      assert.equal(out.blocked, 1);
      assert.equal(out.generated, 0);
      assert.equal((await docs(id)).rowCount, 0);
      const [failed] = (await runs(id)).rows;
      assert.equal(failed.status, 'failed');
      assert.match(failed.error, /contacto está archivado/);
      assert.equal((await rec(id)).next_date, '2026-10-01');
      assert.ok(
        (
          await q(
            "SELECT 1 FROM audit_events WHERE entity_id=$1 AND action='Factura recurrente fallida'",
            [id],
          )
        ).rowCount,
      );
      // Otra pasada no repite el error ni avanza.
      assert.equal((await runRecurringForWorkspace({ today: '2026-11-15' })).blocked, 1);
      assert.equal((await rec(id)).next_date, '2026-10-01');
      // Reintento con el contacto reactivado.
      await q('UPDATE contacts SET active=true WHERE id=$1', [contactId]);
      assert.equal(await processNext(id, { today: '2026-11-15', manual: 'retry' }), 'generated');
      assert.equal((await runs(id)).rows[0].status, 'issued');
      assert.equal((await rec(id)).next_date, '2026-11-01');
      // Saltar la fecha pendiente.
      await transaction((c) => skipNext(c, id, userId));
      assert.equal((await runs(id)).rows.at(-1)!.status, 'skipped');
      assert.equal((await rec(id)).next_date, '2026-12-01');
      await q("UPDATE recurring_invoices SET status='paused' WHERE id=$1", [id]);
    }));

  test('periodo cerrado: usa la fecha de hoy y lo anota', () =>
    inSchema(async () => {
      await q(
        "INSERT INTO periods(month,closed_at,closed_by) VALUES('2026-03-01',now(),$1) ON CONFLICT(month) DO UPDATE SET closed_at=now()",
        [userId],
      );
      const id = await createRecurring({
        name: 'Cerrado',
        start_date: '2026-03-10',
        next_date: '2026-03-10',
        max_occurrences: 1,
      });
      await runRecurringForWorkspace({ today: '2026-11-15' });
      const [d] = (await docs(id)).rows;
      assert.equal(d.date, '2026-11-15');
      assert.match((await runs(id)).rows[0].note, /cerrado/);
    }));

  test('max_occurrences finaliza la recurrencia', () =>
    inSchema(async () => {
      const id = await createRecurring({
        name: 'Máximo',
        start_date: '2026-10-01',
        next_date: '2026-10-01',
        max_occurrences: 2,
      });
      await runRecurringForWorkspace({ today: '2027-03-01' });
      assert.equal((await docs(id)).rowCount, 2);
      assert.deepEqual((await rec(id)).status, 'finished');
    }));

  test('auto_issue=false deja borradores', () =>
    inSchema(async () => {
      const id = await createRecurring({
        name: 'Borrador',
        auto_issue: false,
        start_date: '2026-10-05',
        next_date: '2026-10-05',
        max_occurrences: 1,
      });
      await runRecurringForWorkspace({ today: '2026-11-15' });
      const [d] = (await docs(id)).rows;
      assert.equal(d.status, 'draft');
      assert.equal((await runs(id)).rows[0].status, 'draft');
    }));

  test('auto_send encola el correo con el PDF y se entrega con el deliver inyectado', () =>
    inSchema(async () => {
      await q(
        "INSERT INTO communication_settings(id,data,password_encrypted,version,verified_version,updated_by) VALUES(1,$1,'x',1,1,$2)",
        [
          {
            host: 'smtp.example.invalid',
            port: 587,
            username: 'u',
            from: 'facturas@example.invalid',
            fromName: 'Facturas',
            enabled: true,
            authorizedSender: true,
          },
          userId,
        ],
      );
      const id = await createRecurring({
        name: 'Envío',
        auto_send: true,
        start_date: '2026-10-02',
        next_date: '2026-10-02',
        max_occurrences: 1,
      });
      await runRecurringForWorkspace({ today: '2026-11-15' });
      const m = (
        await q(
          'SELECT m.*,d.number FROM outgoing_messages m JOIN documents d ON d.id=m.document_id WHERE d.recurring_id=$1',
          [id],
        )
      ).rows[0];
      assert.equal(m.status, 'queued');
      assert.equal(m.recipient, 'cliente@example.invalid');
      assert.match(m.subject, /^Factura F-2026-/);
      assert.ok(
        (await q('SELECT 1 FROM document_archives WHERE document_id=$1', [m.document_id])).rowCount,
      );
      // Procesa la cola solo con un deliver falso, sin tocar la red.
      await q('INSERT INTO public.workspaces(id,schema_name,name) VALUES($1,$2,$3)', [
        workspaceId,
        schema,
        'Temporal',
      ]);
      await q(
        "INSERT INTO public.workspace_members(workspace_id,user_id,role) VALUES($1,$2,'admin')",
        [workspaceId, userId],
      );
      const delivered: any[] = [];
      assert.equal(
        await processMail(
          workspaceId,
          async (message) => (delivered.push(message), { accepted: [message.to] }),
        ),
        true,
      );
      assert.equal(delivered.length, 1);
      assert.equal(delivered[0].to, 'cliente@example.invalid');
      assert.equal(
        (await q('SELECT status FROM outgoing_messages WHERE id=$1', [m.id])).rows[0].status,
        'sent',
      );
    }));

  test('auto_send sin SMTP verificado falla sin crear la factura', () =>
    inSchema(async () => {
      await q('UPDATE communication_settings SET verified_version=null WHERE id=1');
      const id = await createRecurring({
        name: 'Sin SMTP',
        auto_send: true,
        start_date: '2026-10-03',
        next_date: '2026-10-03',
      });
      const out = await runRecurringForWorkspace({ today: '2026-11-15' });
      assert.equal(out.blocked, 1);
      assert.equal((await docs(id)).rowCount, 0);
      assert.match((await runs(id)).rows[0].error, /servidor de correo/);
    }));
});
