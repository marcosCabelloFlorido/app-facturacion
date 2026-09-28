#!/usr/bin/env -S tsx
// MCP de desarrollo: herramientas de solo lectura sobre el repositorio (no sobre la app en marcha)
// para que un asistente de IA encuentre rutas, esquemas, tablas y componentes más rápido.
// Se ejecuta por stdio, en local, y no forma parte de la imagen Docker.
import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const run = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url)); // codigo/
const IGNORED = new Set(['node_modules', 'dist', '.git', '.local']);

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}
const rel = (p: string) => path.relative(root, p).replaceAll('\\', '/');
const text = (value: unknown) => ({
  content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
});

const server = new McpServer({ name: 'kronjop-facturacion-dev', version: '1.0.0' });

server.registerTool(
  'search_code',
  {
    title: 'Buscar en el código fuente',
    description:
      'Busca una expresión regular en codigo/src, codigo/server y codigo/shared. Devuelve archivo, línea y el texto de la línea.',
    inputSchema: {
      pattern: z.string().min(1),
      dirs: z.array(z.enum(['src', 'server', 'shared', 'db', 'tests'])).default(['src', 'server', 'shared']),
      maxResults: z.number().int().min(1).max(500).default(100),
    },
  },
  async ({ pattern, dirs, maxResults }) => {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, 'i');
    } catch {
      return { content: [{ type: 'text', text: 'Expresión regular inválida.' }], isError: true };
    }
    const results: { file: string; line: number; text: string }[] = [];
    for (const dir of dirs) {
      const files = await walk(path.join(root, dir)).catch(() => []);
      for (const file of files) {
        if (results.length >= maxResults) break;
        if (!/\.(ts|tsx|css|sql)$/.test(file)) continue;
        const lines = (await readFile(file, 'utf8')).split('\n');
        lines.forEach((l, i) => {
          if (results.length < maxResults && regex.test(l))
            results.push({ file: rel(file), line: i + 1, text: l.trim().slice(0, 300) });
        });
      }
    }
    return text({ count: results.length, results });
  },
);

server.registerTool(
  'read_file',
  {
    title: 'Leer un archivo del repositorio',
    description: 'Lee un archivo por ruta relativa a codigo/ (por ejemplo "server/contacts.ts"), con rango de líneas opcional.',
    inputSchema: {
      path: z.string().min(1),
      from: z.number().int().min(1).optional(),
      to: z.number().int().min(1).optional(),
    },
  },
  async ({ path: relPath, from, to }) => {
    const full = path.resolve(root, relPath);
    if (!full.startsWith(root)) return { content: [{ type: 'text', text: 'Ruta fuera del repositorio.' }], isError: true };
    try {
      const lines = (await readFile(full, 'utf8')).split('\n');
      const start = Math.max(1, from ?? 1);
      const end = Math.min(lines.length, to ?? lines.length);
      return text(
        lines
          .slice(start - 1, end)
          .map((l, i) => `${start + i}\t${l}`)
          .join('\n'),
      );
    } catch {
      return { content: [{ type: 'text', text: 'No se encuentra el archivo.' }], isError: true };
    }
  },
);

server.registerTool(
  'list_routes',
  {
    title: 'Listar rutas de la API',
    description: 'Lista los endpoints Fastify definidos en server/*.ts (método, ruta y ubicación).',
    inputSchema: {},
  },
  async () => {
    const files = (await walk(path.join(root, 'server'))).filter((f) => f.endsWith('.ts'));
    const routeRe = /\b(?:api|app)\.(get|post|put|delete|patch)\(\s*(['"`])([^'"`]+)\2/g;
    const routes: { method: string; path: string; file: string; line: number }[] = [];
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        for (const m of l.matchAll(routeRe))
          routes.push({ method: m[1].toUpperCase(), path: m[3], file: rel(file), line: i + 1 });
      });
    }
    routes.sort((a, b) => a.path.localeCompare(b.path));
    return text(routes);
  },
);

server.registerTool(
  'describe_table',
  {
    title: 'Describir una tabla de la base de datos',
    description:
      'Busca la definición de una tabla (CREATE TABLE) y sus ALTER TABLE posteriores en codigo/db/*.sql, en orden de migración.',
    inputSchema: { table: z.string().min(1) },
  },
  async ({ table }) => {
    const files = (await walk(path.join(root, 'db'))).filter((f) => f.endsWith('.sql')).sort();
    const hits: { file: string; sql: string }[] = [];
    const nameRe = new RegExp(`\\b(?:public\\.)?${table}\\b`, 'i');
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      for (const statement of content.split(/;\s*\n/)) {
        if (nameRe.test(statement) && /CREATE TABLE|ALTER TABLE|CREATE INDEX/i.test(statement))
          hits.push({ file: rel(file), sql: statement.trim() + ';' });
      }
    }
    return hits.length ? text(hits) : { content: [{ type: 'text', text: `No se encontró la tabla "${table}".` }], isError: true };
  },
);

server.registerTool(
  'list_shared_schemas',
  {
    title: 'Listar esquemas Zod compartidos',
    description: 'Lista los `export const xSchema = z...` de codigo/shared, con archivo y línea, para conocer la forma de los datos de dominio.',
    inputSchema: {},
  },
  async () => {
    const files = (await walk(path.join(root, 'shared'))).filter((f) => f.endsWith('.ts'));
    const schemaRe = /export const (\w*[Ss]chema\w*)\s*[:=]/;
    const schemas: { name: string; file: string; line: number }[] = [];
    for (const file of files) {
      const lines = (await readFile(file, 'utf8')).split('\n');
      lines.forEach((l, i) => {
        const m = l.match(schemaRe);
        if (m) schemas.push({ name: m[1], file: rel(file), line: i + 1 });
      });
    }
    return text(schemas);
  },
);

server.registerTool(
  'list_components',
  {
    title: 'Listar componentes React',
    description: 'Lista los componentes de codigo/src (.tsx) e indica si tienen un .css propio con el mismo nombre.',
    inputSchema: {},
  },
  async () => {
    const files = await readdir(path.join(root, 'src'));
    const tsx = files.filter((f) => f.endsWith('.tsx'));
    const css = new Set(files.filter((f) => f.endsWith('.css')));
    return text(
      tsx.map((f) => ({
        component: f,
        css: css.has(f.replace(/\.tsx$/, '.css').toLowerCase()) || css.has(f.replace(/\.tsx$/, '.css')),
      })),
    );
  },
);

server.registerTool(
  'typecheck',
  {
    title: 'Comprobar tipos (tsc --noEmit)',
    description: 'Ejecuta la comprobación de tipos del proyecto y devuelve los errores, si los hay.',
    inputSchema: {},
  },
  async () => {
    try {
      const { stdout } = await run(process.platform === 'win32' ? 'node_modules\\.bin\\tsc.cmd' : 'node_modules/.bin/tsc', ['--noEmit'], {
        cwd: root,
      });
      return text(stdout.trim() || 'Sin errores de tipos.');
    } catch (e: any) {
      return text(String(e.stdout || e.message));
    }
  },
);

server.registerTool(
  'git_status',
  {
    title: 'Estado de git',
    description: 'Devuelve `git status --porcelain` del repositorio, para saber qué archivos están modificados.',
    inputSchema: {},
  },
  async () => {
    try {
      const { stdout } = await run('git', ['status', '--porcelain'], { cwd: root });
      return text(stdout.trim() || 'Sin cambios pendientes.');
    } catch (e: any) {
      return { content: [{ type: 'text', text: String(e.message) }], isError: true };
    }
  },
);

await server.connect(new StdioServerTransport());
