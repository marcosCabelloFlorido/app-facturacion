import { randomBytes, createHash } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { pool, assert, AppError } from './db.ts';
import { hashToken, verifyPassword, createSession } from './auth.ts';
import { issueMcpToken } from './mcp-tokens.ts';

// Servidor de autorización OAuth 2.1 + PKCE mínimo para que cualquier cliente MCP (Claude, ChatGPT,
// etc.) pueda conectarse con el flujo estándar de "un clic": se registra solo (RFC7591), abre
// /oauth/authorize en el navegador del usuario, y a cambio de un código con PKCE recibe un token
// de acceso MCP (el mismo tipo que ya emite /api/mcp/tokens a mano).
const CODE_TTL_MS = 10 * 60 * 1000;

export function originOf(req: FastifyRequest) {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol;
  return `${proto}://${req.headers.host}`;
}
export function resourceMetadataUrl(req: FastifyRequest) {
  return `${originOf(req)}/.well-known/oauth-protected-resource`;
}

const b64url = (input: Buffer) => input.toString('base64url');
const sha256 = (input: string) => createHash('sha256').update(input).digest();

async function findSessionUser(req: FastifyRequest) {
  const token = req.cookies.session;
  if (!token) return null;
  const row = (
    await pool.query(
      'SELECT u.id,u.name,u.email FROM public.sessions s JOIN public.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',
      [hashToken(token)],
    )
  ).rows[0];
  return row || null;
}
async function userWorkspaces(userId: string) {
  return (
    await pool.query(
      `SELECT w.id,w.name FROM public.workspace_members m JOIN public.workspaces w ON w.id=m.workspace_id
       WHERE m.user_id=$1 AND m.active ORDER BY w.created_at,w.id`,
      [userId],
    )
  ).rows as { id: string; name: string }[];
}
async function findClient(clientId: string) {
  const row = (
    await pool.query('SELECT client_id,client_name,redirect_uris FROM public.oauth_clients WHERE client_id=$1', [
      clientId,
    ])
  ).rows[0];
  return row || null;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Facturee</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #fafafa; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;
    color: #0a0a0a; padding: 24px; }
  .card { width: 100%; max-width: 420px; background: #fff; border: 1px solid #e5e5e5; border-radius: 16px;
    padding: 32px; }
  .brand { font-weight: 700; font-size: 15px; letter-spacing: 0.01em; margin: 0 0 24px; }
  .brand::after { content: '.'; color: #0a0a0a; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  p.hint { color: #666; font-size: 13px; margin: 0 0 24px; line-height: 1.5; }
  label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
    color: #666; margin: 16px 0 6px; }
  input[type=email], input[type=password] { width: 100%; padding: 11px 12px; border: 1px solid #d4d4d4;
    border-radius: 10px; font-size: 14px; background: #fff; color: #0a0a0a; }
  input:focus { outline: 2px solid #0a0a0a; outline-offset: 1px; }
  .tool-list { list-style: none; margin: 0 0 24px; padding: 0; border: 1px solid #ececec; border-radius: 10px;
    overflow: hidden; }
  .tool-list li { padding: 9px 12px; font-size: 13px; border-top: 1px solid #ececec; }
  .tool-list li:first-child { border-top: 0; }
  .workspace-pick { display: flex; flex-direction: column; gap: 8px; margin: 0 0 20px; }
  .workspace-pick label { display: flex; align-items: center; gap: 8px; text-transform: none; font-weight: 500;
    font-size: 14px; color: #0a0a0a; margin: 0; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 10px; }
  .actions { display: flex; gap: 10px; margin-top: 24px; }
  button, .btn { flex: 1; padding: 12px 16px; border-radius: 999px; border: 1px solid #0a0a0a; font-size: 14px;
    font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; }
  button[type=submit], .btn.primary { background: #0a0a0a; color: #fff; }
  button.secondary, .btn.secondary { background: #fff; color: #0a0a0a; }
  .error { background: #fff4f4; border: 1px solid #f0c8c8; color: #8a1f1f; font-size: 13px; border-radius: 10px;
    padding: 10px 12px; margin: 0 0 16px; }
  .client-name { font-weight: 600; }
</style>
</head>
<body>
<div class="card">
  <p class="brand">facturee</p>
  ${body}
</div>
</body>
</html>`;
}

const authorizeQuery = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().max(2000).optional(),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal('S256'),
  scope: z.string().optional(),
});

const TOOLS_SUMMARY = [
  'Consultar clientes, proveedores, facturas, presupuestos y compras',
  'Crear y editar facturas, presupuestos, compras y contactos',
  'Registrar y revertir cobros y pagos',
  'Consultar cifras y el panel general del negocio',
];

function redirectWithError(redirectUri: string, error: string, state?: string) {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (state) url.searchParams.set('state', state);
  return url.toString();
}

export function oauthRoutes(app: FastifyInstance) {
  app.get('/.well-known/oauth-authorization-server', async (req) => {
    const iss = originOf(req);
    return {
      issuer: iss,
      authorization_endpoint: `${iss}/oauth/authorize`,
      token_endpoint: `${iss}/oauth/token`,
      registration_endpoint: `${iss}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mcp'],
    };
  });
  app.get('/.well-known/oauth-protected-resource', async (req) => {
    const iss = originOf(req);
    return { resource: `${iss}/api/mcp`, authorization_servers: [iss] };
  });

  app.post('/oauth/register', { config: { rateLimit: { max: 30, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const body = z
      .object({
        redirect_uris: z.array(z.string().url()).min(1).max(10),
        client_name: z.string().trim().max(200).optional(),
      })
      .parse(req.body);
    const clientId = randomBytes(16).toString('hex');
    const clientName = body.client_name?.trim() || 'Cliente MCP';
    await pool.query(
      'INSERT INTO public.oauth_clients(client_id,client_name,redirect_uris) VALUES($1,$2,$3)',
      [clientId, clientName, JSON.stringify(body.redirect_uris)],
    );
    reply.status(201);
    return {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: body.redirect_uris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    };
  });

  function hiddenFields(query: z.infer<typeof authorizeQuery>) {
    return `
      <input type="hidden" name="client_id" value="${escapeHtml(query.client_id)}">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(query.redirect_uri)}">
      <input type="hidden" name="code_challenge" value="${escapeHtml(query.code_challenge)}">
      <input type="hidden" name="state" value="${escapeHtml(query.state || '')}">`;
  }
  function renderLogin(
    query: z.infer<typeof authorizeQuery>,
    clientName: string,
    opts: { error?: string } = {},
  ) {
    return {
      status: 200 as const,
      body: page(
        'Inicia sesión',
        `<h1>Inicia sesión</h1>
         <p class="hint"><span class="client-name">${escapeHtml(clientName)}</span> quiere conectarse a tu cuenta de Facturee.</p>
         ${opts.error ? `<div class="error">${escapeHtml(opts.error)}</div>` : ''}
         <form method="post" action="/oauth/authorize">
           ${hiddenFields(query)}
           <input type="hidden" name="step" value="login">
           <label for="email">Correo</label>
           <input id="email" type="email" name="email" required autofocus>
           <label for="password">Contraseña</label>
           <input id="password" type="password" name="password" required>
           <div class="actions"><button type="submit">Continuar</button></div>
         </form>`,
      ),
    };
  }
  async function renderConsent(
    query: z.infer<typeof authorizeQuery>,
    clientName: string,
    user: { id: string; email: string },
  ) {
    const workspaces = await userWorkspaces(user.id);
    if (!workspaces.length)
      return { status: 403 as const, body: page('Sin acceso', '<p class="error">Tu cuenta no tiene acceso a ningún negocio.</p>') };
    const workspacePicker =
      workspaces.length === 1
        ? `<input type="hidden" name="workspace_id" value="${workspaces[0].id}">`
        : `<div class="workspace-pick">${workspaces
            .map(
              (w, i) =>
                `<label><input type="radio" name="workspace_id" value="${w.id}" ${i === 0 ? 'checked' : ''}> ${escapeHtml(w.name)}</label>`,
            )
            .join('')}</div>`;
    return {
      status: 200 as const,
      body: page(
        'Autorizar acceso',
        `<h1>Autorizar acceso</h1>
         <p class="hint"><span class="client-name">${escapeHtml(clientName)}</span> quiere conectarse a tu cuenta (<strong>${escapeHtml(user.email)}</strong>) para usar estas herramientas:</p>
         <ul class="tool-list">${TOOLS_SUMMARY.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
         ${workspaces.length > 1 ? '<p class="hint">Elige el negocio al que quieres dar acceso:</p>' + workspacePicker : workspacePicker}
         <form method="post" action="/oauth/authorize">
           ${hiddenFields(query)}
           <input type="hidden" name="step" value="consent">
           <div class="actions">
             <button type="submit" name="decision" value="deny" class="secondary">Cancelar</button>
             <button type="submit" name="decision" value="allow">Autorizar</button>
           </div>
         </form>`,
      ),
    };
  }
  async function renderAuthorize(
    req: FastifyRequest,
    query: z.infer<typeof authorizeQuery>,
    opts: { error?: string } = {},
  ) {
    const client = await findClient(query.client_id);
    if (!client) return { status: 400 as const, body: page('Cliente no válido', '<p class="error">Este cliente MCP no está registrado.</p>') };
    const redirectUris = client.redirect_uris as string[];
    if (!redirectUris.includes(query.redirect_uri))
      return {
        status: 400 as const,
        body: page('Redirección no válida', '<p class="error">La URL de retorno no coincide con la registrada por este cliente.</p>'),
      };
    const user = await findSessionUser(req);
    if (!user) return renderLogin(query, client.client_name, opts);
    return renderConsent(query, client.client_name, user);
  }

  app.get('/oauth/authorize', async (req, reply) => {
    const parsed = authorizeQuery.safeParse(req.query);
    if (!parsed.success)
      return reply.status(400).type('text/html').send(page('Solicitud no válida', '<p class="error">Faltan parámetros obligatorios de la autorización.</p>'));
    const result = await renderAuthorize(req, parsed.data);
    return reply.status(result.status).type('text/html').send(result.body);
  });

  app.post(
    '/oauth/authorize',
    { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } },
    async (req, reply) => {
      const form = z
        .object({
          step: z.enum(['login', 'consent']),
          client_id: z.string().min(1),
          redirect_uri: z.string().url(),
          code_challenge: z.string().min(43).max(128),
          state: z.string().optional(),
          email: z.string().optional(),
          password: z.string().optional(),
          workspace_id: z.string().optional(),
          decision: z.enum(['allow', 'deny']).optional(),
        })
        .parse(req.body);
      const query = authorizeQuery.parse({
        response_type: 'code',
        client_id: form.client_id,
        redirect_uri: form.redirect_uri,
        code_challenge: form.code_challenge,
        code_challenge_method: 'S256',
        state: form.state,
      });

      if (form.step === 'login') {
        const credentials = z.object({ email: z.email(), password: z.string().min(1) }).safeParse({
          email: form.email,
          password: form.password,
        });
        const fail = async (message: string) => {
          const result = await renderAuthorize(req, query, { error: message });
          return reply.status(200).type('text/html').send(result.body);
        };
        if (!credentials.success) return fail('Correo o contraseña incorrectos.');
        const userRow = (
          await pool.query('SELECT * FROM public.users WHERE email=$1 AND active=true', [
            credentials.data.email.toLowerCase(),
          ])
        ).rows[0];
        const fallback = '00000000000000000000000000000000:' + '0'.repeat(128);
        const valid = await verifyPassword(credentials.data.password, userRow?.password_hash || fallback);
        if (!userRow || !valid) return fail('Correo o contraseña incorrectos.');
        await createSession(reply, userRow.id, req.headers['user-agent'] as string);
        // La cookie recién creada solo llega al navegador en esta respuesta; no está en req.cookies
        // todavía, así que renderizamos el consentimiento directamente con el usuario ya conocido.
        const client = await findClient(query.client_id);
        if (!client)
          return reply.status(400).type('text/html').send(page('Cliente no válido', '<p class="error">Este cliente MCP no está registrado.</p>'));
        const result = await renderConsent(query, client.client_name, userRow);
        return reply.status(result.status).type('text/html').send(result.body);
      }

      const client = await findClient(query.client_id);
      if (!client) return reply.status(400).type('text/html').send(page('Cliente no válido', '<p class="error">Este cliente MCP no está registrado.</p>'));
      if (form.decision !== 'allow') return reply.redirect(redirectWithError(query.redirect_uri, 'access_denied', query.state));
      const user = await findSessionUser(req);
      if (!user) {
        const result = await renderAuthorize(req, query);
        return reply.status(result.status).type('text/html').send(result.body);
      }
      const workspaces = await userWorkspaces(user.id);
      const workspaceId = workspaces.find((w) => w.id === form.workspace_id)?.id || workspaces[0]?.id;
      if (!workspaceId) return reply.status(403).type('text/html').send(page('Sin acceso', '<p class="error">Tu cuenta no tiene acceso a ningún negocio.</p>'));
      const code = randomBytes(32).toString('hex');
      await pool.query(
        `INSERT INTO public.oauth_codes(code_hash,client_id,user_id,workspace_id,redirect_uri,code_challenge,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          hashToken(code),
          query.client_id,
          user.id,
          workspaceId,
          query.redirect_uri,
          query.code_challenge,
          new Date(Date.now() + CODE_TTL_MS),
        ],
      );
      const url = new URL(query.redirect_uri);
      url.searchParams.set('code', code);
      if (query.state) url.searchParams.set('state', query.state);
      return reply.redirect(url.toString());
    },
  );

  app.post('/oauth/token', { config: { rateLimit: { max: 60, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const body = z
      .object({
        grant_type: z.literal('authorization_code'),
        code: z.string().min(1),
        redirect_uri: z.string().url(),
        client_id: z.string().min(1),
        code_verifier: z.string().min(43).max(128),
      })
      .parse(req.body);
    const client = await findClient(body.client_id);
    if (!client) throw new AppError(400, 'invalid_client');
    const row = (
      await pool.query(
        `SELECT * FROM public.oauth_codes WHERE code_hash=$1 AND client_id=$2 AND used_at IS NULL AND expires_at>now()`,
        [hashToken(body.code), body.client_id],
      )
    ).rows[0];
    assert(row, 'invalid_grant', 400);
    assert(row.redirect_uri === body.redirect_uri, 'invalid_grant', 400);
    const expectedChallenge = b64url(sha256(body.code_verifier));
    assert(expectedChallenge === row.code_challenge, 'invalid_grant', 400);
    const marked = await pool.query('UPDATE public.oauth_codes SET used_at=now() WHERE id=$1 AND used_at IS NULL', [
      row.id,
    ]);
    assert(marked.rowCount, 'invalid_grant', 400);
    const issued = await issueMcpToken(row.user_id, row.workspace_id, `OAuth: ${client.client_name}`, client.client_id);
    reply.header('Cache-Control', 'no-store');
    return { access_token: issued.token, token_type: 'Bearer', scope: 'mcp' };
  });
}
