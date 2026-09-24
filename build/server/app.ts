import { profileRoutes } from './profile.ts';
import { changePasswordSchema } from '../shared/profile.ts';
import { documentStatusHistory } from './document-status-history.ts';
import { searchWhere, searchOrder } from './advanced-search.ts';
import { salesToolsRoutes } from './sales-tools.ts';
import { listDocuments, documentCsv } from './document-list.ts';
import Fastify from 'fastify';
import { dashboardDetail, dashboardSummary } from './dashboard.ts';
import { moduleKpiRoutes, auditMetricSchema, auditMetricCondition } from './module-kpis.ts';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z, ZodError } from 'zod';
import { Decimal } from 'decimal.js';
import { companySchema, dateSchema, documentSchema, productSchema } from '../shared/domain.ts';
import { AppError, assert, audit, pool, transaction, workspaceContext } from './db.ts';
import { workspaceRoutes } from './workspaces.ts';
import { contactsRoutes } from './contacts.ts';
import { amountRangeRoutes } from './amount-ranges.ts';
import { workingDraftRoutes } from './working-drafts.ts';
import { listDocumentCustomers } from './document-customers.ts';
import { contactTaxIdSchema } from '../shared/contacts.ts';
import { financeRoutes } from './finance.ts';
import { listDueDates } from './due-dates.ts';
import { accountingRoutes, accountingReview, validateManual } from './accounting.ts';
import { accessRoutes } from './access.ts';
import { fileRoutes } from './files.ts';
import { importRoutes } from './imports.ts';
import { buyerRoutes } from './buyer-requirements.ts';
import {
  createSession,
  hashPassword,
  hashToken,
  requireAdmin,
  requireUser,
  verifyPassword,
} from './auth.ts';
import {
  addPayment,
  command,
  createCredit,
  dashboard,
  getDocument,
  issueDocument,
  lockDocument,
  postEntry,
  quoteAction,
  reversePayment,
  saveDocument,
} from './services.ts';
import { documentPreviewRoutes } from './document-preview.ts';
import { documentPdf } from './pdf.ts';
import { archivePdf } from './archive.ts';
import { templateRoutes } from './templates.ts';
import { activeTemplate, templateLogo } from './template-assets.ts';
import { mailRoutes } from './mail.ts';
import { portalRoutes, publicPortalRoutes } from './portal.ts';

const uuid = z.uuid();
const credentials = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
});
const entityId = (params: unknown) => z.object({ id: uuid }).parse(params).id;
const paymentSchema = z.object({
  documentId: uuid,
  amount: z.string().regex(/^\d{1,15}(\.\d{1,2})?$/),
  date: dateSchema,
  method: z.enum(['bank', 'cash', 'card']),
  reference: z.string().trim().max(200).default(''),
});
const accounts = [
  '430',
  '400',
  '700',
  '600',
  '472',
  '477',
  '473',
  '4751',
  '572',
  '570',
  '629',
  '100',
  '555',
] as const;
const csvCell = (value: unknown) => {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
};
function csv(headers: string[], rows: unknown[][]) {
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
}

export async function buildApp(logging = true) {
  const app = Fastify({
    logger: logging
      ? { redact: ['req.headers.cookie', 'req.headers.authorization', 'password', 'DATABASE_URL'] }
      : false,
    bodyLimit: 512 * 1024,
  });
  await app.register(cookie);
  await app.register(rateLimit, { max: 240, timeWindow: '1 minute' });
  app.decorateRequest('user', null);
  app.decorateRequest('workspace', null);
  app.addHook('onRequest', async (request, reply) => {
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('X-Frame-Options', 'DENY')
      .header(
        'Referrer-Policy',
        request.url.startsWith('/portal') || request.url.startsWith('/api/portal/')
          ? 'no-referrer'
          : 'same-origin',
      );
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; frame-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      assert(request.headers['x-requested-with'] === 'kronjop', 'Petición no autorizada.', 403);
      const origin = request.headers.origin;
      if (origin)
        assert(new URL(origin).host === request.headers.host, 'Origen no autorizado.', 403);
    }
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError)
      return reply.status(400).send({
        message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '),
      });
    const e = error as { code?: string; statusCode?: number; message: string };
    if (e.code === '23505')
      return reply
        .status(409)
        .send({ message: 'Ya existe un registro con esa referencia, código o correo.' });
    if (e.code === 'P0001') return reply.status(409).send({ message: e.message });
    if (e.code === '23503')
      return reply.status(409).send({
        message: 'El registro está relacionado con otros movimientos y no se puede eliminar.',
      });
    if (e.statusCode && e.statusCode < 500)
      return reply.status(e.statusCode).send({ message: e.message });
    request.log.error({ err: error }, 'Fallo de operación');
    return reply
      .status(500)
      .send({ message: 'No se ha podido completar la operación. Los cambios se han revertido.' });
  });
  app.get('/api/health', async () => {
    await pool.query('SELECT 1');
    return { status: 'ok', fiscalMode: 'development' };
  });
  app.get('/api/auth/status', async () => ({
    needsSetup: !(await pool.query('SELECT 1 FROM public.users LIMIT 1')).rowCount,
  }));
  app.post(
    '/api/auth/setup',
    { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } },
    async (req, reply) => {
      const data = credentials
        .extend({
          name: z.string().trim().min(2).max(100),
          company: companySchema,
          demo: z.boolean().default(false),
        })
        .parse(req.body);
      const passwordHash = await hashPassword(data.password);
      const user = await transaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(9102027)');
        assert(
          !(await client.query('SELECT 1 FROM public.users LIMIT 1')).rowCount,
          'La aplicación ya está configurada.',
        );
        await client.query('INSERT INTO company(id,data,demo) VALUES(1,$1,$2)', [
          data.company,
          data.demo,
        ]);
        const user = (
          await client.query(
            "INSERT INTO public.users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') RETURNING id,name,email,role",
            [data.name, data.email, passwordHash],
          )
        ).rows[0];
        const workspace = (
          await client.query(
            "INSERT INTO public.workspaces(schema_name,name) VALUES('public',$1) RETURNING id",
            [data.company.name],
          )
        ).rows[0];
        await client.query(
          "INSERT INTO public.workspace_members(workspace_id,user_id,role) VALUES($1,$2,'admin')",
          [workspace.id, user.id],
        );
        await audit(client, user.id, 'company', 'Empresa y administrador creados');
        if (data.demo) {
          const { seedDemo } = await import('./seed.ts');
          await seedDemo(client, user.id);
        }
        return user;
      });
      await createSession(reply, user.id, req.headers['user-agent']);
      return { user };
    },
  );
  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } },
    async (req, reply) => {
      const data = credentials.extend({ password: z.string().min(1).max(128) }).parse(req.body);
      const user = (
        await pool.query('SELECT * FROM public.users WHERE email=$1 AND active=true', [data.email])
      ).rows[0];
      const fallback = '00000000000000000000000000000000:' + '0'.repeat(128);
      const valid = await verifyPassword(data.password, user?.password_hash || fallback);
      assert(user && valid, 'Correo o contraseña incorrectos.', 401);
      await createSession(reply, user.id, req.headers['user-agent']);
      return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    },
  );
  await publicPortalRoutes(app);
  await app.register(
    async (api) => {
      api.addHook('preHandler', requireUser);
      api.addHook('preHandler', (req, _reply, done) => {
        workspaceContext.run(req.workspace!.schema, done);
      });
      workspaceRoutes(api);
      contactsRoutes(api);
      salesToolsRoutes(api);
      await workingDraftRoutes(api);
      await financeRoutes(api);
      await accountingRoutes(api);
      await accessRoutes(api);
      await fileRoutes(api);
      await importRoutes(api);
      await buyerRoutes(api);
      await templateRoutes(api);
      documentPreviewRoutes(api);
      await mailRoutes(api);
      await portalRoutes(api);
      profileRoutes(api);
      api.get('/me', async (req) => ({
        user: req.user,
        workspaceId: req.workspace!.id,
        ...(await pool.query('SELECT data AS company,demo FROM company WHERE id=1')).rows[0],
        fiscalMode: 'development',
      }));
      api.post('/auth/logout', async (req, reply) => {
        await pool.query('DELETE FROM public.sessions WHERE token_hash=$1', [
          hashToken(req.cookies.session!),
        ]);
        reply.clearCookie('session', { path: '/' });
        return { ok: true };
      });
      api.get('/dashboard', dashboard);
      api.get('/dashboard/summary', dashboardSummary);
      moduleKpiRoutes(api);
      amountRangeRoutes(api);
      api.get('/dashboard/:metric', (req) =>
        dashboardDetail((req.params as { metric: string }).metric, req.query),
      );
      api.get('/due-dates', (req) => listDueDates(req.query));
      api.get('/document-customers', (req) =>
        listDocumentCustomers(
          req.user!.role === 'viewer' ? null : req.user!.id,
          z
            .object({ kind: z.enum(['sales', 'quote', 'purchase']).default('sales') })
            .parse(req.query).kind,
        ),
      );
      api.get('/sales/document-neighbours/:id', (req) =>
        listDocuments(
          { ...(req.query as object), kind: 'sales' },
          req.user!.role === 'viewer' ? null : req.user!.id,
          false,
          z.object({ id: z.uuid() }).parse(req.params).id,
        ),
      );
      api.get('/quotes/document-neighbours/:id', (req) =>
        listDocuments(
          { ...(req.query as object), kind: 'quote' },
          req.user!.role === 'viewer' ? null : req.user!.id,
          false,
          z.object({ id: z.uuid() }).parse(req.params).id,
        ),
      );
      api.get('/purchases/document-neighbours/:id', (req) =>
        listDocuments(
          { ...(req.query as object), kind: 'purchase' },
          req.user!.role === 'viewer' ? null : req.user!.id,
          false,
          z.object({ id: z.uuid() }).parse(req.params).id,
        ),
      );
      api.get('/documents', (req) =>
        listDocuments(req.query, req.user!.role === 'viewer' ? null : req.user!.id),
      );
      api.get('/documents/export.csv', async (req, reply) => {
        const result = await listDocuments(
          req.query,
          req.user!.role === 'viewer' ? null : req.user!.id,
          true,
        );
        return reply
          .type('text/csv; charset=utf-8')
          .header(
            'Content-Disposition',
            (req.query as { kind?: string }).kind === 'quote'
              ? 'attachment; filename="presupuestos.csv"'
              : (req.query as { kind?: string }).kind === 'purchase'
                ? 'attachment; filename="compras.csv"'
                : 'attachment; filename="facturas.csv"',
          )
          .send(
            documentCsv(
              result,
              (req.query as { kind?: string }).kind === 'quote',
              (req.query as { kind?: string }).kind === 'purchase',
            ),
          );
      });
      api.get('/documents/:id', async (req) => {
        const id = entityId(req.params);
        const doc = await getDocument(pool, id);
        doc.payments = (
          await pool.query(
            'SELECT * FROM payments WHERE document_id=$1 ORDER BY date DESC,created_at DESC',
            [id],
          )
        ).rows;
        doc.status_history = await documentStatusHistory(pool, doc);
        doc.audit = (
          await pool.query(
            'SELECT a.action,a.created_at,u.name AS actor FROM audit_events a LEFT JOIN public.users u ON u.id=a.actor_id WHERE entity_id=$1 ORDER BY a.id DESC',
            [id],
          )
        ).rows;
        return doc;
      });
      const run = <T>(
        req: import('fastify').FastifyRequest,
        fn: (client: import('pg').PoolClient) => Promise<T>,
      ) =>
        command(
          uuid.parse(req.headers['idempotency-key']),
          req.user!.id,
          `${req.method}:${req.url}`,
          req.body,
          fn,
        );
      api.post('/documents', async (req) =>
        run(req, (c) => saveDocument(c, req.user!.id, documentSchema.parse(req.body))),
      );
      api.put('/documents/:id', async (req) => {
        const body = z
          .object({ document: documentSchema, version: z.number().int().positive() })
          .parse(req.body);
        return run(req, (c) =>
          saveDocument(c, req.user!.id, body.document, entityId(req.params), body.version),
        );
      });
      api.delete('/documents/:id', async (req) =>
        run(req, async (c) => {
          const id = entityId(req.params);
          const doc = await lockDocument(c, id);
          assert(doc.status === 'draft', 'Solo se pueden eliminar borradores.');
          const files = (
            await c.query(
              'SELECT id,filename,sha256 FROM stored_files WHERE document_id=$1 ORDER BY id',
              [id],
            )
          ).rows;
          await c.query('DELETE FROM documents WHERE id=$1', [id]);
          await audit(c, req.user!.id, id, 'Borrador eliminado', { files });
          return { ok: true };
        }),
      );
      api.post('/documents/:id/issue', async (req) => {
        const { version } = z.object({ version: z.number().int().positive() }).parse(req.body);
        return run(req, (c) => issueDocument(c, req.user!.id, entityId(req.params), version));
      });
      api.post('/documents/:id/credit', async (req) => {
        const body = z
          .object({
            date: dateSchema,
            reason: z.string().trim().min(5).max(2000),
            lines: z
              .array(
                z.object({
                  sourceLine: z.number().int().min(0).max(99),
                  quantity: z.string().regex(/^\d{1,7}(\.\d{1,4})?$/),
                }),
              )
              .min(1)
              .max(100)
              .optional(),
          })
          .parse(req.body);
        return run(req, (c) =>
          createCredit(c, req.user!.id, entityId(req.params), body.date, body.reason, body.lines),
        );
      });
      api.post('/documents/:id/quote', async (req) => {
        const body = z
          .object({ action: z.enum(['accept', 'reject', 'convert']), date: dateSchema.optional() })
          .parse(req.body);
        return run(req, (c) =>
          quoteAction(c, req.user!.id, entityId(req.params), body.action, body.date),
        );
      });
      api.get('/documents/:id/pdf', async (req, reply) => {
        const { layout } = z
          .object({ layout: z.enum(['current', 'archived']).default('archived') })
          .parse(req.query);
        const doc = await getDocument(pool, entityId(req.params));
        const company =
          doc.company_snapshot ||
          (await pool.query('SELECT data FROM company WHERE id=1')).rows[0].data;
        const archived =
          doc.status === 'draft' || layout === 'current'
            ? null
            : await transaction(async (c) => {
                await lockDocument(c, doc.id);
                return archivePdf(c, await getDocument(c, doc.id), 'reconstructed');
              });
        const buffer =
          archived?.data ||
          (await transaction(async (c) => {
            const saved =
              layout === 'current'
                ? (
                    await c.query('SELECT settings FROM document_renderings WHERE document_id=$1', [
                      doc.id,
                    ])
                  ).rows[0]
                : null;
            const template = saved
              ? { settings: saved.settings, logo: await templateLogo(c, saved.settings) }
              : await activeTemplate(c, doc.kind, doc.id);
            return documentPdf(doc, company, template.settings, template.logo);
          }, true));
        if (archived)
          reply.header('ETag', `"${archived.sha256}"`).header('X-Archive-Origin', archived.origin);
        return reply
          .type('application/pdf')
          .header('Content-Disposition', `inline; filename="${doc.number || 'borrador'}.pdf"`)
          .send(buffer);
      });
      api.get('/payments', async (req) => {
        const { search } = z
          .object({ search: z.string().trim().max(4096).default('') })
          .parse(req.query);
        const values: unknown[] = [];
        const where = searchWhere(
          search,
          'payments',
          {
            text: "concat_ws(' ',d.number,d.party->>'name',d.party->>'taxId',p.reference)",
            date: 'p.date',
            amount: 'p.amount',
            method: 'p.method',
            direction:
              "CASE WHEN d.kind='invoice' OR (d.kind='credit' AND d.credit_side='purchase') THEN 'receipt' ELSE 'payment' END",
            status: { active: 'p.reversed_at IS NULL', reversed: 'p.reversed_at IS NOT NULL' },
          },
          values,
        );
        const order = searchOrder(
          search,
          'payments',
          'p.date DESC,p.created_at DESC,p.id',
          'p.date',
          'p.amount',
        );
        return (
          await pool.query(
            "SELECT p.*,d.number,d.party->>'name' AS party_name,d.party->>'taxId' AS party_tax_id,d.kind,d.credit_side FROM payments p JOIN documents d ON d.id=p.document_id WHERE " +
              where +
              ' ORDER BY ' +
              order +
              ' LIMIT 250',
            values,
          )
        ).rows;
      });
      api.post('/payments', async (req) =>
        run(req, (c) => addPayment(c, req.user!.id, paymentSchema.parse(req.body))),
      );
      api.post('/payments/:id/reverse', async (req) => {
        const body = z
          .object({ date: dateSchema, reason: z.string().trim().min(5).max(500) })
          .parse(req.body);
        return run(req, (c) =>
          reversePayment(c, req.user!.id, entityId(req.params), body.date, body.reason),
        );
      });
      api.get(
        '/products',
        async () =>
          (
            await pool.query(
              'SELECT id,sku,name,description,unit_price AS "unitPrice",tax_rate::text AS "taxRate",exemption_reason AS "exemptionReason",unit,active FROM products ORDER BY active DESC,name',
            )
          ).rows,
      );
      api.post('/products', async (req) => {
        const b = productSchema.parse(req.body);
        return run(req, async (c) => {
          const r = await c.query(
            'INSERT INTO products(sku,name,description,unit_price,tax_rate,exemption_reason,unit,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
            [
              b.sku,
              b.name,
              b.description,
              b.unitPrice,
              b.taxRate,
              b.exemptionReason,
              b.unit,
              b.active,
            ],
          );
          await audit(c, req.user!.id, r.rows[0].id, 'Artículo creado');
          return r.rows[0];
        });
      });
      api.put('/products/:id', async (req) => {
        const b = productSchema.parse(req.body);
        return run(req, async (c) => {
          const r = await c.query(
            'UPDATE products SET sku=$2,name=$3,description=$4,unit_price=$5,tax_rate=$6,exemption_reason=$7,unit=$8,active=$9 WHERE id=$1 RETURNING id',
            [
              entityId(req.params),
              b.sku,
              b.name,
              b.description,
              b.unitPrice,
              b.taxRate,
              b.exemptionReason,
              b.unit,
              b.active,
            ],
          );
          assert(r.rowCount, 'Artículo no encontrado.', 404);
          await audit(c, req.user!.id, r.rows[0].id, 'Artículo actualizado');
          return r.rows[0];
        });
      });
      api.delete('/products/:id', async (req) =>
        run(req, async (c) => {
          const id = entityId(req.params);
          const result = await c.query('DELETE FROM products WHERE id=$1 RETURNING id,sku,name', [
            id,
          ]);
          assert(result.rowCount, 'Artículo no encontrado.', 404);
          await audit(c, req.user!.id, id, 'Artículo eliminado', {
            sku: result.rows[0].sku,
            name: result.rows[0].name,
          });
          return { ok: true };
        }),
      );
      api.put('/company', async (req) => {
        requireAdmin(req);
        const data = companySchema.parse(req.body);
        return run(req, async (c) => {
          await c.query('UPDATE company SET data=$1 WHERE id=1', [data]);
          await c.query('UPDATE public.workspaces SET name=$1 WHERE id=$2', [
            data.name,
            req.workspace!.id,
          ]);
          await audit(c, req.user!.id, 'company', 'Datos de empresa actualizados');
          return data;
        });
      });
      api.get('/users', async (req) => {
        requireAdmin(req);
        return (
          await pool.query(
            'SELECT u.id,u.name,u.email,m.role,(u.active AND m.active) AS active,m.version FROM public.users u JOIN public.workspace_members m ON m.user_id=u.id WHERE m.workspace_id=$1 ORDER BY u.name',
            [req.workspace!.id],
          )
        ).rows;
      });
      api.post('/users', async (req) => {
        requireAdmin(req);
        const b = credentials
          .extend({
            name: z.string().trim().min(2).max(100),
            role: z.enum(['admin', 'operator', 'viewer']),
          })
          .parse(req.body);
        const hash = await hashPassword(b.password);
        return run(req, async (c) => {
          const r = await c.query(
            'INSERT INTO public.users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role',
            [b.name, b.email, hash, b.role],
          );
          await c.query(
            'INSERT INTO public.workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)',
            [req.workspace!.id, r.rows[0].id, b.role],
          );
          await audit(c, req.user!.id, r.rows[0].id, 'Usuario creado', { role: b.role });
          return r.rows[0];
        });
      });
      api.post('/auth/password', async (req) => {
        const b = changePasswordSchema.parse(req.body);
        const user = (
          await pool.query('SELECT password_hash FROM public.users WHERE id=$1', [req.user!.id])
        ).rows[0];
        assert(
          await verifyPassword(b.currentPassword, user.password_hash),
          'La contraseña actual no coincide.',
          400,
        );
        const hash = await hashPassword(b.password);
        return transaction(async (c) => {
          await c.query('UPDATE public.users SET password_hash=$2 WHERE id=$1', [
            req.user!.id,
            hash,
          ]);
          await c.query('DELETE FROM public.sessions WHERE user_id=$1 AND token_hash<>$2', [
            req.user!.id,
            hashToken(req.cookies.session!),
          ]);
          await audit(c, req.user!.id, req.user!.id, 'Contraseña cambiada');
          return { ok: true };
        });
      });
      api.get('/accounting', async (req) => {
        const { from, to } = z.object({ from: dateSchema, to: dateSchema }).parse(req.query);
        assert(from <= to, 'El rango de fechas no es válido.', 400);
        const entries = (
          await pool.query(
            "SELECT e.*,u.name AS actor,(e.event='manual' AND e.document_id IS NULL AND e.payment_id IS NULL AND NOT EXISTS(SELECT 1 FROM entry_reversals r WHERE r.original_id=e.id OR r.reversal_id=e.id) AND NOT EXISTS(SELECT 1 FROM unapplied_funds f WHERE f.entry_id=e.id) AND NOT EXISTS(SELECT 1 FROM fund_applications f WHERE f.entry_id=e.id)) AS can_reverse, (SELECT jsonb_agg(jsonb_build_object('account',l.account,'debit',l.debit::text,'credit',l.credit::text) ORDER BY l.id) FROM journal_lines l WHERE l.entry_id=e.id) AS lines FROM journal_entries e JOIN public.users u ON u.id=e.created_by WHERE e.date BETWEEN $1 AND $2 ORDER BY e.date DESC,e.number DESC",
            [from, to],
          )
        ).rows;
        const trial = (
          await pool.query(
            'SELECT l.account,sum(l.debit)::text AS debit,sum(l.credit)::text AS credit,(sum(l.debit)-sum(l.credit))::text AS balance FROM journal_lines l JOIN journal_entries e ON e.id=l.entry_id WHERE e.date BETWEEN $1 AND $2 GROUP BY l.account ORDER BY l.account',
            [from, to],
          )
        ).rows;
        const periods = (await pool.query('SELECT * FROM periods ORDER BY month DESC LIMIT 36'))
          .rows;
        const taxes = (
          await pool.query(
            "SELECT CASE WHEN kind='credit' AND credit_side='purchase' THEN 'purchase_credit' ELSE kind END AS kind,sum(net)::text AS net,sum(tax)::text AS tax,sum(retention)::text AS retention FROM documents WHERE status IN ('issued','recorded') AND date BETWEEN $1 AND $2 GROUP BY kind,credit_side",
            [from, to],
          )
        ).rows;
        return { entries, trial, periods, taxes };
      });
      api.post('/accounting/entries', async (req) => {
        requireAdmin(req);
        const amount = z.string().regex(/^\d{1,15}(\.\d{1,2})?$/);
        const b = z
          .object({
            date: dateSchema,
            description: z.string().trim().min(5).max(300),
            lines: z
              .array(
                z.object({
                  account: z.string().regex(/^[1-9][0-9]{2,9}$/),
                  debit: amount,
                  credit: amount,
                }),
              )
              .min(2)
              .max(50),
          })
          .parse(req.body);
        assert(
          b.lines.every((l) => new Decimal(l.debit).isZero() !== new Decimal(l.credit).isZero()),
          'Cada línea debe tener importe en el debe o en el haber.',
          400,
        );
        return run(req, async (c) => {
          await validateManual(c, b);
          const id = await postEntry(c, req.user!.id, b.date, b.description, b.lines);
          await audit(c, req.user!.id, id, 'Asiento manual registrado');
          return { id };
        });
      });
      api.post('/accounting/period', async (req) => {
        requireAdmin(req);
        const b = z.object({ month: dateSchema, close: z.boolean() }).parse(req.body);
        assert(b.month.endsWith('-01'), 'Indica el primer día del mes.', 400);
        return run(req, async (c) => {
          await c.query('INSERT INTO periods(month) VALUES($1) ON CONFLICT DO NOTHING', [b.month]);
          await c.query('SELECT 1 FROM periods WHERE month=$1 FOR UPDATE', [b.month]);
          if (b.close) {
            const to = (
              await c.query("SELECT ($1::date+interval '1 month'-interval '1 day')::date AS last", [
                b.month,
              ])
            ).rows[0].last;
            const review = await accountingReview(c, to);
            assert(review.canClose, 'No se puede cerrar: ' + review.blocks.join(' '));
            await c.query('INSERT INTO closing_reviews(month,report,actor_id) VALUES($1,$2,$3)', [
              b.month,
              review,
              req.user!.id,
            ]);
          }
          await c.query(
            'UPDATE periods SET closed_at=CASE WHEN $2 THEN now() ELSE NULL END,closed_by=CASE WHEN $2 THEN $3::uuid ELSE NULL END WHERE month=$1',
            [b.month, b.close, req.user!.id],
          );
          await audit(c, req.user!.id, b.month, b.close ? 'Periodo cerrado' : 'Periodo reabierto');
          return { ok: true };
        });
      });
      api.get('/audit', async (req) => {
        requireAdmin(req);
        const { metric, page, pagination, search } = z
          .object({
            pagination: z.literal('1').optional(),
            search: z.string().max(4096).default(''),
            metric: auditMetricSchema.optional(),
            page: z.coerce.number().int().min(1).max(100000).default(1),
          })
          .parse(req.query);
        const values: unknown[] = [(page - 1) * 200, pagination ? 201 : 200];
        const where = searchWhere(
          search,
          'audit',
          { text: "concat_ws(' ',a.action,u.name,a.entity_id)", date: 'a.created_at::date' },
          values,
        );
        const rows = (
          await pool.query(
            `SELECT a.*,u.name AS actor FROM audit_events a LEFT JOIN public.users u ON u.id=a.actor_id WHERE (${where}) ${metric ? 'AND (' + auditMetricCondition(metric) + ')' : ''} ORDER BY a.id DESC LIMIT $2 OFFSET $1`,
            values,
          )
        ).rows;
        return pagination ? { rows: rows.slice(0, 200), hasMore: rows.length > 200 } : rows;
      });
      api.get('/export/:type', async (req, reply) => {
        const { type } = z
          .object({ type: z.enum(['sales', 'purchases', 'journal', 'payments']) })
          .parse(req.params);
        let output: string;
        if (type === 'journal') {
          const r = (
            await pool.query(
              'SELECT e.number,e.date,e.description,l.account,l.debit,l.credit FROM journal_entries e JOIN journal_lines l ON l.entry_id=e.id ORDER BY e.date,e.number,l.id',
            )
          ).rows;
          output = csv(
            ['Asiento', 'Fecha', 'Concepto', 'Cuenta', 'Debe', 'Haber'],
            r.map((v) => [v.number, v.date, v.description, v.account, v.debit, v.credit]),
          );
        } else if (type === 'payments') {
          const r = (
            await pool.query(
              'SELECT p.*,d.number,d.kind FROM payments p JOIN documents d ON d.id=p.document_id ORDER BY p.date',
            )
          ).rows;
          output = csv(
            [
              'Documento',
              'Tipo',
              'Fecha',
              'Importe',
              'Medio',
              'Referencia',
              'Revertido',
              'Fecha reversión',
            ],
            r.map((v) => [
              v.number,
              v.kind,
              v.date,
              v.amount,
              v.method,
              v.reference,
              v.reversed_at ? 'Sí' : 'No',
              v.reversal_date,
            ]),
          );
        } else {
          const r = (
            await pool.query(
              `SELECT * FROM document_balances WHERE ${type === 'sales' ? "(kind='invoice' OR (kind='credit' AND credit_side='sale'))" : "(kind='purchase' OR (kind='credit' AND credit_side='purchase'))"} ORDER BY date,number`,
            )
          ).rows;
          output = csv(
            [
              'Número',
              'Tipo',
              'Estado',
              'Fecha',
              'Vencimiento',
              'Razón social',
              'NIF',
              'Base',
              'IVA',
              'Retención',
              'Total',
              'Pendiente',
            ],
            r.map((v) => [
              v.number,
              v.kind,
              v.status,
              v.date,
              v.due_date,
              v.party.name,
              v.party.taxId,
              v.net,
              v.tax,
              v.retention,
              v.kind === 'credit' ? '-' + v.total : v.total,
              v.balance,
            ]),
          );
        }
        return reply
          .type('text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${type}.csv"`)
          .send(output);
      });
    },
    { prefix: '/api' },
  );
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  if (existsSync(dist)) {
    await app.register(fastifyStatic, { root: dist });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api/')
        ? reply.status(404).send({ message: 'Ruta no encontrada.' })
        : reply.sendFile('index.html'),
    );
  }
  return app;
}
