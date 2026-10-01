import { pool, workspaceContext } from './db.ts';
import { runRecurringForWorkspace } from './recurring.ts';
import type { FastifyBaseLogger } from 'fastify';
export function startRecurringWorker(log: FastifyBaseLogger) {
  let stopping = false;
  let running: Promise<void> | null = null;
  const minutes = Math.max(1, Number(process.env.RECURRING_INTERVAL_MINUTES) || 15);
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
            const result = await runRecurringForWorkspace();
            if (result.generated || result.blocked)
              log.info(
                `Facturación recurrente: ${result.generated} generadas, ${result.blocked} con error.`,
              );
          });
        } catch {
          log.error('No se pudo procesar la facturación recurrente de un negocio. Se reintentará.');
        }
      }
    })()
      .catch(() => log.error('No se pudo consultar la facturación recurrente.'))
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(tick, minutes * 60_000);
  timer.unref();
  setTimeout(tick, 10_000).unref();
  return async () => {
    stopping = true;
    clearInterval(timer);
    await running;
  };
}
