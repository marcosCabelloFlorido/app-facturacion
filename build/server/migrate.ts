import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';
import { pool, transaction, workspaceSearchPath } from './db.ts';
const businessMigrations = [
  [1, '001_core.sql'],
  [2, '002_integrity.sql'],
  [3, '003_workspaces_archive.sql'],
  [5, '005_financial_cycle.sql'],
  [6, '006_accounting.sql'],
  [8, '008_document_operations.sql'],
  [9, '009_contacts.sql'],
  [10, '010_templates.sql'],
  [11, '011_communications.sql'],
  [12, '012_editor_date_step.sql'],
  [13, '013_file_removals.sql'],
  [14, '014_draft_attachment_retention.sql'],
  [15, '015_sales_views.sql'],
  [16, '016_document_communications.sql'],
  [17, '017_template_archiving.sql'],
  [18, '018_message_removals.sql'],
] as const;

export async function migrateWorkspace(client: PoolClient, schema: string) {
  await client.query("SELECT set_config('search_path',$1,true)", [workspaceSearchPath(schema)]);
  await client.query(
    'CREATE TABLE IF NOT EXISTS migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  for (const [version, file] of businessMigrations) {
    if ((await client.query('SELECT 1 FROM migrations WHERE version=$1', [version])).rowCount)
      continue;
    let sql = await readFile(new URL('../db/' + file, import.meta.url), 'utf8');
    // Identity and sessions are shared; all business tables, sequences, views and triggers are local.
    sql = sql
      .split('\n')
      .filter((line) => !/^CREATE (TABLE (users|sessions) |INDEX sessions_expiry )/.test(line))
      .join('\n');
    sql = sql.replaceAll('REFERENCES users(id)', 'REFERENCES public.users(id)');
    await client.query(sql);
    await client.query('INSERT INTO migrations(version) VALUES($1)', [version]);
  }
}
export async function migrate() {
  await transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(9102026)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const [version, file] of [
      [1, '001_core.sql'],
      [2, '002_integrity.sql'],
      [3, '003_workspaces_archive.sql'],
      [4, '004_workspaces.sql'],
      [5, '005_financial_cycle.sql'],
      [6, '006_accounting.sql'],
      [7, '007_access.sql'],
      [8, '008_document_operations.sql'],
      [9, '009_contacts.sql'],
      [10, '010_templates.sql'],
      [11, '011_communications.sql'],
      [12, '012_editor_date_step.sql'],
      [13, '013_file_removals.sql'],
      [14, '014_draft_attachment_retention.sql'],
      [15, '015_sales_views.sql'],
      [16, '016_document_communications.sql'],
      [17, '017_template_archiving.sql'],
      [18, '018_message_removals.sql'],
      [19, '019_profile.sql'],
      [20, '020_profile_surname.sql'],
      [21, '021_profile_second_surname.sql'],
    ] as const) {
      if ((await client.query('SELECT 1 FROM migrations WHERE version=$1', [version])).rowCount)
        continue;
      await client.query(await readFile(new URL('../db/' + file, import.meta.url), 'utf8'));
      await client.query('INSERT INTO migrations(version) VALUES($1)', [version]);
    }
    const workspaces = (
      await client.query("SELECT schema_name FROM public.workspaces WHERE schema_name<>'public'")
    ).rows;
    for (const workspace of workspaces) await migrateWorkspace(client, workspace.schema_name);
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await migrate();
  await pool.end();
  console.log('Migraciones aplicadas.');
}
