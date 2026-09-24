import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { companySchema } from '../shared/domain.ts';
import { hashToken } from './auth.ts';
import { assert, audit, pool, workspaceSearchPath } from './db.ts';
import { command } from './services.ts';
import { migrateWorkspace } from './migrate.ts';

export function workspaceRoutes(api: FastifyInstance) {
  api.get(
    '/workspaces',
    async (req) =>
      (
        await pool.query(
          'SELECT w.id,w.name,m.role FROM public.workspaces w JOIN public.workspace_members m ON m.workspace_id=w.id WHERE m.user_id=$1 AND m.active ORDER BY w.created_at,w.id',
          [req.user!.id],
        )
      ).rows,
  );
  api.post('/workspaces', async (req) => {
    const company = companySchema.parse(req.body);
    const key = z.uuid().parse(req.headers['idempotency-key']);
    return command(key, req.user!.id, req.url, company, async (client) => {
      const id = randomUUID();
      const schema = 'workspace_' + id.replaceAll('-', '');
      // Identifiers are generated here, validated, and never derived from the business name.
      workspaceSearchPath(schema);
      await client.query(`CREATE SCHEMA "${schema}"`);
      await migrateWorkspace(client, schema);
      await client.query('INSERT INTO company(id,data) VALUES(1,$1)', [company]);
      await client.query('INSERT INTO public.workspaces(id,schema_name,name) VALUES($1,$2,$3)', [
        id,
        schema,
        company.name,
      ]);
      await client.query(
        "INSERT INTO public.workspace_members(workspace_id,user_id,role) VALUES($1,$2,'admin')",
        [id, req.user!.id],
      );
      await audit(client, req.user!.id, 'company', 'Espacio de trabajo creado');
      await client.query("SELECT set_config('search_path',$1,true)", [
        workspaceSearchPath(req.workspace!.schema),
      ]);
      return { id, name: company.name, role: 'admin' };
    });
  });
  api.post('/workspaces/:id/select', async (req) => {
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const result = await pool.query(
      'UPDATE public.sessions s SET workspace_id=$1 WHERE s.token_hash=$2 AND EXISTS(SELECT 1 FROM public.workspace_members m WHERE m.workspace_id=$1 AND m.user_id=$3 AND m.active) RETURNING workspace_id',
      [id, hashToken(req.cookies.session!), req.user!.id],
    );
    assert(result.rowCount, 'No tienes acceso a este espacio de trabajo.', 403);
    return { id };
  });
}
