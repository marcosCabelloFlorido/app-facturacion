import { pool, workspaceContext } from './db.ts';
import { processMail } from './mail.ts';
import type { FastifyBaseLogger } from 'fastify';
export function startMailWorker(log: FastifyBaseLogger) {
  let stopping = false;
  let running: Promise<void> | null = null;
  const tick = () => {
    if (stopping || running) return;
    running = (async () => {
      const workspaces = (
        await pool.query('SELECT id,schema_name FROM public.workspaces ORDER BY created_at')
      ).rows;
      for (const workspace of workspaces) {
        if (stopping) break;
        try {
          await workspaceContext.run(workspace.schema_name, async () => {
            for (let n = 0; n < 10 && !stopping; n++) if (!(await processMail(workspace.id))) break;
          });
        } catch {
          log.error('No se pudo procesar la cola de correo de un negocio. Se reintentará.');
        }
      }
    })()
      .catch(() => log.error('No se pudo consultar la cola de correo.'))
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(tick, 5000);
  timer.unref();
  tick();
  return async () => {
    stopping = true;
    clearInterval(timer);
    await running;
  };
}
