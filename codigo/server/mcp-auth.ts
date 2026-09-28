import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './db.ts';
import { resolveMcpToken } from './mcp-tokens.ts';
import { resourceMetadataUrl } from './oauth.ts';

// Autenticación de clientes MCP (asistentes de IA) por token, en vez de la cookie de sesión del navegador.
// El token puede venir de /api/mcp/tokens (creado a mano) o del flujo OAuth de un clic (/oauth/*);
// en ambos casos es el mismo tipo de credencial, guardada en mcp_tokens.
export async function requireMcpToken(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  // Cabecera estándar (RFC 9728) para que un cliente MCP sin token descubra solo cómo autorizarse.
  reply.header('WWW-Authenticate', `Bearer resource_metadata="${resourceMetadataUrl(request)}"`);
  if (!token) throw new AppError(401, 'Falta el token de acceso MCP (cabecera Authorization).');
  const row = await resolveMcpToken(token);
  if (!row) throw new AppError(401, 'Token de acceso MCP inválido o revocado.');
  request.user = {
    id: row.user_id,
    name: row.name,
    avatar: row.avatar,
    surname: row.surname,
    secondSurname: row.second_surname,
    email: row.email,
    role: row.role,
  };
  request.workspace = { id: row.workspace_id, schema: row.schema_name };
}
