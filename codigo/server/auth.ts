import { scrypt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { pool, AppError } from './db.ts';
import type { User } from '../shared/domain.ts';
import { z } from 'zod';
const scryptAsync = promisify(scrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const actual = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function createSession(reply: FastifyReply, userId: string, userAgent = '') {
  const token = randomBytes(32).toString('hex');
  const session = await pool.query(
    "INSERT INTO public.sessions(token_hash,user_id,workspace_id,expires_at,user_agent) SELECT $1,$2,m.workspace_id,now()+interval '12 hours',$3 FROM public.workspace_members m JOIN public.workspaces w ON w.id=m.workspace_id WHERE m.user_id=$2 AND m.active ORDER BY w.created_at,w.id LIMIT 1",
    [hashToken(token), userId, userAgent.slice(0, 300)],
  );
  if (!session.rowCount)
    throw new AppError(403, 'Esta cuenta no tiene acceso activo a ningún negocio.');
  reply.setCookie('session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 43200,
  });
}
declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
    workspace: { id: string; schema: string } | null;
  }
}
export async function requireUser(request: FastifyRequest) {
  const token = request.cookies.session;
  if (!token) throw new AppError(401, 'Inicia sesión para continuar.');
  const { rows } = await pool.query(
    'SELECT u.id,u.name,u.surname,u.second_surname,u.email,u.avatar,s.workspace_id FROM public.sessions s JOIN public.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',
    [hashToken(token)],
  );
  if (!rows[0]) throw new AppError(401, 'La sesión ha caducado. Vuelve a iniciar sesión.');
  const query = request.query as { workspaceId?: unknown } | undefined;
  const selected = request.headers['x-workspace-id'] ?? query?.workspaceId ?? rows[0].workspace_id;
  const workspaceId = z.uuid().parse(selected);
  let membership = (
    await pool.query(
      'SELECT w.id,w.schema_name,m.role FROM public.workspace_members m JOIN public.workspaces w ON w.id=m.workspace_id WHERE m.user_id=$1 AND w.id=$2 AND m.active',
      [rows[0].id, workspaceId],
    )
  ).rows[0];
  if (!membership && !request.headers['x-workspace-id'] && !query?.workspaceId)
    membership = (
      await pool.query(
        'SELECT w.id,w.schema_name,m.role FROM public.workspace_members m JOIN public.workspaces w ON w.id=m.workspace_id WHERE m.user_id=$1 AND m.active ORDER BY w.created_at,w.id LIMIT 1',
        [rows[0].id],
      )
    ).rows[0];
  if (!membership) throw new AppError(403, 'No tienes acceso a este espacio de trabajo.');
  request.user = {
    id: rows[0].id,
    name: rows[0].name,
    avatar: rows[0].avatar,
    surname: rows[0].surname,
    secondSurname: rows[0].second_surname,
    email: rows[0].email,
    role: membership.role,
  };
  request.workspace = { id: membership.id, schema: membership.schema_name };
  if (
    !['GET', 'HEAD'].includes(request.method) &&
    request.user?.role === 'viewer' &&
    !['/api/auth/logout', '/api/auth/password', '/api/workspaces', '/api/profile'].includes(
      request.url.split('?')[0],
    ) &&
    !/^\/api\/auth\/sessions\/[a-f0-9-]+$/.test(request.url.split('?')[0]) &&
    !/^\/api\/workspaces\/[a-f0-9-]+\/select$/.test(request.url.split('?')[0])
  )
    throw new AppError(403, 'Tu cuenta solo tiene permisos de consulta.');
}
export function requireAdmin(request: FastifyRequest) {
  if (request.user?.role !== 'admin')
    throw new AppError(403, 'Esta acción requiere una cuenta administradora.');
}
