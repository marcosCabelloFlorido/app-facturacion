import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashToken } from './auth.ts';
import { assert, pool } from './db.ts';

const entityId = (params: unknown) => z.object({ id: z.uuid() }).parse(params).id;

// Emite un token de acceso MCP: lo usan tanto la creación manual (admin) como el flujo OAuth.
export async function issueMcpToken(
  userId: string,
  workspaceId: string,
  name: string,
  oauthClientId?: string,
) {
  const token = 'mcp_' + randomBytes(32).toString('hex');
  const row = (
    await pool.query(
      'INSERT INTO public.mcp_tokens(user_id,workspace_id,name,token_hash,oauth_client_id) VALUES($1,$2,$3,$4,$5) RETURNING id,name,created_at',
      [userId, workspaceId, name, hashToken(token), oauthClientId || null],
    )
  ).rows[0];
  return { ...row, token };
}

export async function resolveMcpToken(token: string) {
  const hash = hashToken(token);
  const row = (
    await pool.query(
      `SELECT t.id,t.user_id,u.name,u.email,u.avatar,u.surname,u.second_surname,
        w.id AS workspace_id,w.schema_name,m.role
       FROM public.mcp_tokens t
       JOIN public.users u ON u.id=t.user_id AND u.active=true
       JOIN public.workspaces w ON w.id=t.workspace_id
       JOIN public.workspace_members m ON m.workspace_id=w.id AND m.user_id=u.id AND m.active
       WHERE t.token_hash=$1 AND t.revoked_at IS NULL`,
      [hash],
    )
  ).rows[0];
  if (!row) return null;
  await pool.query('UPDATE public.mcp_tokens SET last_used_at=now() WHERE id=$1', [row.id]);
  return row;
}

// Gestión de credenciales para clientes MCP (asistentes de IA): solo el administrador las crea o revoca.
export function mcpTokenRoutes(api: FastifyInstance) {
  api.get('/mcp/tokens', async (req) => {
    assert(req.user!.role === 'admin', 'Esta acción requiere una cuenta administradora.', 403);
    return (
      await pool.query(
        'SELECT id,name,created_at,last_used_at,revoked_at FROM public.mcp_tokens WHERE workspace_id=$1 ORDER BY created_at DESC',
        [req.workspace!.id],
      )
    ).rows;
  });
  api.post('/mcp/tokens', async (req) => {
    assert(req.user!.role === 'admin', 'Esta acción requiere una cuenta administradora.', 403);
    const { name } = z.object({ name: z.string().trim().min(2).max(100) }).parse(req.body);
    // El valor en claro solo se muestra una vez; a partir de aquí solo se guarda su hash.
    return issueMcpToken(req.user!.id, req.workspace!.id, name);
  });
  api.delete('/mcp/tokens/:id', async (req) => {
    assert(req.user!.role === 'admin', 'Esta acción requiere una cuenta administradora.', 403);
    const result = await pool.query(
      'UPDATE public.mcp_tokens SET revoked_at=now() WHERE id=$1 AND workspace_id=$2 AND revoked_at IS NULL',
      [entityId(req.params), req.workspace!.id],
    );
    assert(result.rowCount, 'No se encuentra el token.', 404);
    return { ok: true };
  });
}
