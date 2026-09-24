import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool, assert, audit } from './db.ts';
import { hashToken, requireAdmin } from './auth.ts';
import { runCommand, paramId } from './finance.ts';
export async function accessRoutes(api: FastifyInstance) {
  api.put('/users/:id/access', async (req) => {
    requireAdmin(req);
    const id = paramId(req),
      b = z
        .object({
          version: z.number().int().positive(),
          role: z.enum(['admin', 'operator', 'viewer']),
          active: z.boolean(),
        })
        .parse(req.body);
    return runCommand(req, async (c) => {
      await c.query('SELECT 1 FROM public.workspaces WHERE id=$1 FOR UPDATE', [req.workspace!.id]);
      const old = (
        await c.query(
          'SELECT * FROM public.workspace_members WHERE workspace_id=$1 AND user_id=$2 FOR UPDATE',
          [req.workspace!.id, id],
        )
      ).rows[0];
      assert(
        old && old.version === b.version,
        'Los permisos han cambiado. Recarga antes de guardar.',
      );
      if (old.active && old.role === 'admin' && (!b.active || b.role !== 'admin')) {
        const remaining = (
          await c.query(
            "SELECT count(*)::int AS n FROM public.workspace_members m JOIN public.users u ON u.id=m.user_id WHERE m.workspace_id=$1 AND m.role='admin' AND m.active AND u.active AND m.user_id<>$2",
            [req.workspace!.id, id],
          )
        ).rows[0].n;
        assert(remaining > 0, 'El negocio debe conservar al menos un administrador activo.');
      }
      const result = (
        await c.query(
          'UPDATE public.workspace_members SET role=$3,active=$4,version=version+1 WHERE workspace_id=$1 AND user_id=$2 RETURNING role,active,version',
          [req.workspace!.id, id, b.role, b.active],
        )
      ).rows[0];
      await audit(c, req.user!.id, id, 'Permisos del negocio actualizados', {
        role: b.role,
        active: b.active,
      });
      return result;
    });
  });
  api.get(
    '/auth/sessions',
    async (req) =>
      (
        await pool.query(
          'SELECT id,created_at,expires_at,user_agent,token_hash=$2 AS current FROM public.sessions WHERE user_id=$1 AND expires_at>now() ORDER BY created_at DESC',
          [req.user!.id, hashToken(req.cookies.session!)],
        )
      ).rows,
  );
  api.delete('/auth/sessions/:id', async (req, reply) => {
    const result = await pool.query(
      'DELETE FROM public.sessions WHERE id=$1 AND user_id=$2 RETURNING token_hash',
      [paramId(req), req.user!.id],
    );
    assert(result.rowCount, 'Sesión no encontrada.', 404);
    if (result.rows[0].token_hash === hashToken(req.cookies.session!))
      reply.clearCookie('session', { path: '/' });
    return { ok: true };
  });
}
