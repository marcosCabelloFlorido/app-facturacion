import 'dotenv/config';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { PoolClient } from 'pg';
pg.types.setTypeParser(1082, (value) => value);
if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env');
const connections = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  options: '-c timezone=Europe/Madrid',
});
// Every business query uses the workspace captured when the request was authenticated.
// SET LOCAL is reset by COMMIT/ROLLBACK before a connection returns to the pool.
export const workspaceContext = new AsyncLocalStorage<string>();
export function workspaceSearchPath(schema: string) {
  if (schema !== 'public' && !/^workspace_[a-f0-9]{32}$/.test(schema))
    throw new Error('Invalid workspace schema');
  return `${schema}, pg_catalog`;
}
export const pool = {
  async query<T extends pg.QueryResultRow = any>(
    sql: string,
    values?: unknown[],
  ): Promise<pg.QueryResult<T>> {
    if (!workspaceContext.getStore()) return connections.query<T>(sql, values);
    return transaction((client) => client.query<T>(sql, values));
  },
  connect() {
    if (workspaceContext.getStore()) throw new Error('Use transaction for workspace connections');
    return connections.connect();
  },
  end: () => connections.end(),
};
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  snapshot = false,
): Promise<T> {
  const client = await connections.connect();
  try {
    await client.query(snapshot ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
    await client.query("SELECT set_config('search_path',$1,true)", [
      workspaceSearchPath(workspaceContext.getStore() || 'public'),
    ]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(condition: unknown, message: string, status = 409): asserts condition {
  if (!condition) throw new AppError(status, message);
}
export async function audit(
  client: PoolClient,
  userId: string,
  entityId: string,
  action: string,
  details: object = {},
) {
  await client.query(
    'INSERT INTO audit_events(actor_id,entity_id,action,details) VALUES($1,$2,$3,$4)',
    [userId, entityId, action, details],
  );
}
