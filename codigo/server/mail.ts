import nodemailer from 'nodemailer';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool, assert, audit, transaction, workspaceContext } from './db.ts';
import { requireAdmin } from './auth.ts';
import { paramId, runCommand } from './finance.ts';
import { lockDocument, getDocument } from './services.ts';
import { archivePdf } from './archive.ts';
import { seal, unseal } from './secrets.ts';
const configSchema = z.object({
  host: z
    .string()
    .trim()
    .min(3)
    .max(250)
    .regex(/^[a-zA-Z0-9.-]+$/),
  port: z.union([z.literal(465), z.literal(587)]),
  username: z.string().trim().min(1).max(250),
  from: z.email(),
  fromName: z.string().trim().min(2).max(160),
  enabled: z.boolean(),
  authorizedSender: z.literal(true),
});
const messageSchema = z.object({
  recipient: z.email(),
  subject: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((v) => !/[\r\n]/.test(v)),
  body: z.string().trim().min(1).max(20000),
});
export const messageStates = {
  draft: 'Preparado',
  queued: 'Pendiente de envío',
  sending: 'Enviando',
  sent: 'Aceptado por el servidor de correo',
  failed: 'No enviado',
  uncertain: 'Resultado por comprobar',
  cancelled: 'Cancelado',
};
const context = () => (workspaceContext.getStore() || 'public') + ':smtp';
function transport(c: any) {
  return nodemailer.createTransport({
    host: c.data.host,
    port: c.data.port,
    secure: c.data.port === 465,
    requireTLS: true,
    auth: { user: c.data.username, pass: unseal(c.password_encrypted, context()) },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    dnsTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
}
export async function mailOptions(m: any) {
  const f = (
    await pool.query('SELECT data,sha256 FROM document_archives WHERE document_id=$1', [
      m.document_id,
    ])
  ).rows[0];
  assert(f, 'No se encuentra el PDF archivado.');
  return {
    from: { name: m.sender_name, address: m.sender },
    to: m.recipient,
    subject: m.subject,
    text: m.body,
    messageId: `<${m.id}@${m.sender.split('@')[1] || 'kronjop.local'}>`,
    date: new Date(m.created_at),
    attachments: [{ filename: 'documento.pdf', content: f.data, contentType: 'application/pdf' }],
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
export async function mailRoutes(api: FastifyInstance) {
  api.get('/mail/settings', async (req) => {
    const c = (await pool.query('SELECT * FROM communication_settings WHERE id=1')).rows[0];
    return {
      configured: !!c,
      canConfigure: req.user!.role === 'admin',
      ready: !!c?.data.enabled && c.version === c.verified_version,
      version: c?.version || 0,
      ...(req.user!.role === 'admin'
        ? { data: c?.data || null, hasPassword: !!c?.password_encrypted }
        : {}),
      sender: c?.data.from || '',
    };
  });
  api.put('/mail/settings', async (req) => {
    requireAdmin(req);
    const b = configSchema
      .extend({ password: z.string().max(1000).optional(), version: z.number().int().min(0) })
      .parse(req.body);
    return runCommand(req, async (c) => {
      await c.query(
        "SELECT pg_advisory_xact_lock(hashtextextended(current_schema()||':smtp-settings',0))",
      );
      const old = (await c.query('SELECT * FROM communication_settings WHERE id=1 FOR UPDATE'))
        .rows[0];
      assert(
        (old?.version || 0) === b.version,
        'La configuración ha cambiado. Recarga antes de guardar.',
      );
      const encrypted = b.password ? seal(b.password, context()) : old?.password_encrypted;
      assert(encrypted, 'Introduce la contraseña SMTP.', 400);
      const data = configSchema.parse(b);
      const result = (
        await c.query(
          'INSERT INTO communication_settings(id,data,password_encrypted,updated_by) VALUES(1,$1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=excluded.data,password_encrypted=excluded.password_encrypted,version=communication_settings.version+1,verified_version=null,updated_by=excluded.updated_by RETURNING version',
          [data, encrypted, req.user!.id],
        )
      ).rows[0];
      await audit(c, req.user!.id, 'smtp', 'Configuración de correo actualizada', {
        version: result.version,
        enabled: b.enabled,
      });
      return result;
    });
  });
  api.post('/mail/verify', async (req) => {
    requireAdmin(req);
    const c = (await pool.query('SELECT * FROM communication_settings WHERE id=1')).rows[0];
    assert(c, 'Configura el servidor SMTP.', 400);
    const t = transport(c);
    try {
      await t.verify();
    } catch {
      assert(
        false,
        'No se pudo verificar la conexión y autenticación SMTP. Revisa servidor, puerto y credenciales.',
        400,
      );
    } finally {
      t.close();
    }
    const saved = await pool.query(
      'UPDATE communication_settings SET verified_version=version WHERE id=1 AND version=$1',
      [c.version],
    );
    assert(saved.rowCount, 'La configuración ha cambiado durante la verificación.');
    return { ok: true, message: 'Conexión verificada. No se ha enviado ningún mensaje.' };
  });
  api.get(
    '/documents/:id/messages',
    async (req) =>
      (
        await pool.query(
          'SELECT id,recipient,subject,status,version,error,attempts,created_at,sent_at FROM outgoing_messages WHERE document_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [paramId(req)],
        )
      ).rows,
  );
  api.get('/messages/:id', async (req) => {
    const m = (
      await pool.query('SELECT * FROM outgoing_messages WHERE id=$1 AND deleted_at IS NULL', [
        paramId(req),
      ])
    ).rows[0];
    assert(m, 'Mensaje no encontrado.', 404);
    return {
      id: m.id,
      document_id: m.document_id,
      recipient: m.recipient,
      subject: m.subject,
      body: m.body,
      status: m.status,
      version: m.version,
      error: m.error,
      attempts: m.attempts,
      sent_at: m.sent_at,
      history: (
        await pool.query(
          'SELECT state,details,created_at FROM message_attempts WHERE message_id=$1 ORDER BY id',
          [m.id],
        )
      ).rows,
    };
  });
  api.post('/documents/:id/messages', async (req) => {
    const b = messageSchema.parse(req.body);
    return runCommand(req, async (c) => {
      await lockDocument(c, paramId(req));
      const d = await getDocument(c, paramId(req));
      assert(d.status !== 'draft', 'Confirma el documento antes de preparar su envío.', 400);
      await archivePdf(c, d, 'reconstructed');
      const m = (
        await c.query(
          'INSERT INTO outgoing_messages(document_id,recipient,subject,body,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id',
          [d.id, b.recipient, b.subject, b.body, req.user!.id],
        )
      ).rows[0];
      await audit(c, req.user!.id, d.id, 'Correo preparado', { messageId: m.id });
      return m;
    });
  });
  api.put('/messages/:id', async (req) => {
    const b = messageSchema.extend({ version: z.number().int().positive() }).parse(req.body);
    return runCommand(req, async (c) => {
      const m = (
        await c.query(
          "UPDATE outgoing_messages SET recipient=$2,subject=$3,body=$4,status='draft',version=version+1,error=null WHERE id=$1 AND deleted_at IS NULL AND version=$5 AND status IN ('draft','failed','cancelled') RETURNING id,version",
          [paramId(req), b.recipient, b.subject, b.body, b.version],
        )
      ).rows[0];
      assert(m, 'El mensaje ha cambiado o ya está en curso.');
      return m;
    });
  });
  api.delete('/messages/:id', async (req) => {
    const b = z.object({ version: z.number().int().positive() }).parse(req.body);
    return runCommand(req, async (c) => {
      const m = (
        await c.query(
          'SELECT id,document_id,status,version FROM outgoing_messages WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',
          [paramId(req)],
        )
      ).rows[0];
      assert(m, 'Mensaje no encontrado.', 404);
      assert(m.version === b.version, 'El mensaje ha cambiado. Vuelve a intentarlo.');
      assert(
        m.status !== 'sending',
        'El correo se está enviando. Espera a que termine para eliminarlo.',
      );
      await c.query(
        "UPDATE outgoing_messages SET deleted_at=now(),deleted_by=$2,status=CASE WHEN status='queued' THEN 'cancelled' ELSE status END,version=version+1 WHERE id=$1",
        [m.id, req.user!.id],
      );
      await audit(c, req.user!.id, m.document_id, 'Correo eliminado', {
        messageId: m.id,
        previousStatus: m.status,
      });
      return { id: m.id };
    });
  });
  api.post('/messages/:id/queue', async (req) => {
    const b = z
      .object({
        version: z.number().int().positive(),
        acknowledgeUncertain: z.boolean().default(false),
      })
      .parse(req.body);
    return runCommand(req, async (c) => {
      const m = (
        await c.query(
          'SELECT * FROM outgoing_messages WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',
          [paramId(req)],
        )
      ).rows[0];
      assert(m && m.version === b.version, 'El mensaje ha cambiado.');
      assert(
        ['draft', 'failed', 'uncertain', 'cancelled'].includes(m.status),
        'Este mensaje ya está en curso o fue enviado.',
      );
      assert(
        m.status !== 'uncertain' || b.acknowledgeUncertain,
        'Comprueba primero con el destinatario o el proveedor si se entregó antes de reenviar.',
      );
      const s = (await c.query('SELECT * FROM communication_settings WHERE id=1 FOR SHARE'))
        .rows[0];
      assert(
        s?.data.enabled && s.verified_version === s.version,
        'Configura, habilita y verifica el servidor de correo antes de enviar.',
        400,
      );
      assert(
        m.status !== 'uncertain' || m.sender === s.data.from,
        'Para cambiar el remitente de un envío incierto, prepara un nuevo mensaje.',
        400,
      );
      await c.query(
        "UPDATE outgoing_messages SET status='queued',sender=$2,sender_name=$3,smtp_version=$4,version=version+1,error=null,queued_by=$5 WHERE id=$1",
        [
          m.id,
          s.data.from,
          m.status === 'uncertain' ? m.sender_name : s.data.fromName,
          s.version,
          req.user!.id,
        ],
      );
      await audit(c, req.user!.id, m.document_id, 'Envío de correo autorizado', {
        messageId: m.id,
        recipient: m.recipient,
        uncertainRetry: b.acknowledgeUncertain,
      });
      return { ok: true };
    });
  });
  api.post('/messages/:id/cancel', async (req) => {
    const b = z.object({ version: z.number().int().positive() }).parse(req.body);
    return runCommand(req, async (c) => {
      const m = (
        await c.query(
          "UPDATE outgoing_messages SET status='cancelled',version=version+1 WHERE id=$1 AND deleted_at IS NULL AND version=$2 AND status='queued' RETURNING id,document_id",
          [paramId(req), b.version],
        )
      ).rows[0];
      assert(m, 'El mensaje ha cambiado o ya no está pendiente de envío.');
      await audit(c, req.user!.id, m.document_id, 'Envío de correo cancelado', { messageId: m.id });
      return { id: m.id };
    });
  });
  api.get('/messages/:id/eml', async (req, reply) => {
    const m = (
      await pool.query('SELECT * FROM outgoing_messages WHERE id=$1 AND deleted_at IS NULL', [
        paramId(req),
      ])
    ).rows[0];
    assert(m, 'Mensaje no encontrado.', 404);
    const s = (await pool.query('SELECT data FROM communication_settings WHERE id=1')).rows[0];
    const company = (await pool.query('SELECT data FROM company WHERE id=1')).rows[0].data;
    m.sender = m.sender || s?.data.from || company.email || 'sin-configurar@example.invalid';
    m.sender_name = m.sender_name || company.name;
    const info = await nodemailer
      .createTransport({
        streamTransport: true,
        buffer: true,
        newline: 'windows',
        disableFileAccess: true,
        disableUrlAccess: true,
      })
      .sendMail({ ...(await mailOptions(m)), headers: { 'X-Unsent': '1' } });
    return reply
      .type('message/rfc822')
      .header('Content-Disposition', 'attachment; filename="mensaje.eml"')
      .send(info.message);
  });
}
export type MailDelivery = (
  message: any,
  settings: any,
) => Promise<{ accepted: unknown[]; rejected?: unknown[] }>;
export async function processMail(workspaceId: string, deliver?: MailDelivery) {
  // A process may die after SMTP accepted DATA. Never automatically resend that uncertain attempt.
  await transaction(async (c) => {
    const stale = (
      await c.query(
        "UPDATE outgoing_messages SET status='uncertain',error='Se perdió la confirmación del envío. Comprueba la entrega antes de reintentar.',version=version+1 WHERE status='sending' AND lease_at<now()-interval '5 minutes' RETURNING id,attempts",
      )
    ).rows;
    for (const m of stale)
      await c.query(
        "INSERT INTO message_attempts(message_id,attempt,state) VALUES($1,$2,'uncertain')",
        [m.id, m.attempts],
      );
  });
  const job = await transaction(async (c) => {
    const m = (
      await c.query(
        "SELECT * FROM outgoing_messages WHERE status='queued' AND deleted_at IS NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",
      )
    ).rows[0];
    if (!m) return null;
    const member = (
      await c.query(
        "SELECT 1 FROM public.workspace_members m JOIN public.users u ON u.id=m.user_id WHERE m.workspace_id=$1 AND m.user_id=$2 AND m.active AND u.active AND m.role IN ('admin','operator')",
        [workspaceId, m.queued_by],
      )
    ).rowCount;
    const s = (await c.query('SELECT * FROM communication_settings WHERE id=1')).rows[0];
    if (
      !member ||
      !s?.data.enabled ||
      s.version !== m.smtp_version ||
      s.verified_version !== s.version
    ) {
      await c.query(
        "UPDATE outgoing_messages SET status='failed',error='Revisa permisos y configuración de correo antes de autorizar de nuevo.',version=version+1 WHERE id=$1",
        [m.id],
      );
      return null;
    }
    await c.query(
      "UPDATE outgoing_messages SET status='sending',lease_at=now(),attempts=attempts+1,version=version+1 WHERE id=$1",
      [m.id],
    );
    await c.query(
      "INSERT INTO message_attempts(message_id,attempt,state) VALUES($1,$2,'sending')",
      [m.id, m.attempts + 1],
    );
    return { m: { ...m, attempts: m.attempts + 1 }, s };
  });
  if (!job) return false;
  let state = 'sent',
    error: string | null = null,
    details: object = {};
  try {
    const opts = await mailOptions(job.m);
    const t = deliver ? null : transport(job.s);
    let result;
    try {
      result = deliver ? await deliver(opts, job.s) : await t!.sendMail(opts);
    } finally {
      t?.close();
    }
    if (result.accepted?.length !== 1)
      throw Object.assign(new Error('Destinatario rechazado'), { code: 'EENVELOPE' });
    details = {
      accepted: result.accepted,
      messageId: opts.messageId,
      meaning: 'Aceptado por SMTP; no acredita entrega o lectura.',
    };
  } catch (e) {
    const v = e as { code?: string; responseCode?: number; command?: string };
    const known =
      (v.responseCode && v.responseCode >= 400) ||
      ['EAUTH', 'EDNS', 'ECONNECTION', 'ETLS', 'EENVELOPE'].includes(v.code || '');
    state = known ? 'failed' : 'uncertain';
    error = known
      ? 'El servidor rechazó el envío o no se pudo conectar. Revisa la configuración antes de reintentar.'
      : 'No se pudo confirmar el resultado. Comprueba la entrega antes de reintentar.';
    details = { code: v.code || 'UNKNOWN', responseCode: v.responseCode || null };
  }
  await transaction(async (c) => {
    await c.query(
      "UPDATE outgoing_messages SET status=$2,error=$3,sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END,version=version+1 WHERE id=$1 AND status='sending'",
      [job.m.id, state, error],
    );
    await c.query(
      'INSERT INTO message_attempts(message_id,attempt,state,details) VALUES($1,$2,$3,$4)',
      [job.m.id, job.m.attempts, state, details],
    );
  });
  return true;
}
