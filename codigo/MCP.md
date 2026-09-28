# MCP (Model Context Protocol)

Hay dos servidores MCP distintos en este repo, con propósitos diferentes.

## 1. MCP de negocio (`/api/mcp`)

Expone la facturación a un asistente de IA (Claude, ChatGPT, etc.) para consultar y operar sobre
los datos reales de un espacio de trabajo. Va integrado en el mismo servidor Fastify
(`server/app.ts`, `server/mcp.ts`), usa transporte Streamable HTTP sin estado, y se autentica con
un token Bearer propio (no con la cookie de sesión del navegador). Hay dos formas de conseguir ese
token: conexión de un clic por OAuth (para cualquier persona, sin tocar la API a mano) o token
manual (para scripts o pruebas rápidas).

### Conexión de un clic (OAuth 2.1 + PKCE)

Cualquier cliente MCP compatible con el flujo de autorización remota (Claude.ai, Claude Desktop,
ChatGPT, etc.) puede añadir el servidor solo con su URL pública — sin que nadie tenga que crear ni
copiar un token a mano:

1. En el cliente de IA, "añadir conector/servidor MCP remoto" con la URL `https://<tu-dominio>/api/mcp`.
2. El cliente descubre solo la configuración en `/.well-known/oauth-protected-resource` y
   `/.well-known/oauth-authorization-server`, se registra por su cuenta (`POST /oauth/register`,
   RFC 7591) y abre `/oauth/authorize` en el navegador del usuario.
3. El usuario inicia sesión con su cuenta de Facturee (si no lo estaba ya) y ve una pantalla de
   consentimiento con el nombre del cliente, el negocio (si tiene varios) y qué puede hacer.
4. Al pulsar "Autorizar", el servidor redirige al cliente con un código; el cliente lo canjea en
   `POST /oauth/token` (con PKCE, sin secreto de cliente) y recibe un token de acceso.

Ese token se guarda igual que uno creado a mano (tabla `mcp_tokens`), así que se gestiona, se ve
el último uso y se revoca desde `GET`/`DELETE /api/mcp/tokens` exactamente igual. La sesión de
consentimiento nunca expone el token al navegador del usuario, solo al cliente MCP.

Implementación: `server/oauth.ts` (metadatos, registro dinámico, autorizar, token).

### Crear un token a mano (scripts, pruebas)

Solo una cuenta administradora puede crear o revocar tokens, desde la propia API autenticada:

```
POST /api/mcp/tokens
Cookie: session=...
X-Requested-With: kronjop
Content-Type: application/json

{ "name": "Claude Desktop" }
```

La respuesta incluye `token` en texto claro **una sola vez** (solo se guarda su hash). Guárdalo en
un sitio seguro. Para revocarlo: `DELETE /api/mcp/tokens/:id`. Para listarlos: `GET /api/mcp/tokens`.

### Conectar un cliente MCP

URL del endpoint: `http://<host>:<puerto>/api/mcp` (o la URL pública tras el proxy `acceso`).
Cabecera de autenticación: `Authorization: Bearer <token>` (obtenido por OAuth o a mano).

Herramientas disponibles: `search_contacts`, `get_contact`, `create_contact`, `create_invoice`,
`search_documents`, `get_document`, `get_stats`, `get_dashboard`, `list_products`.

`create_invoice` exige identificar al cliente: `contactId` de una ficha existente, o `taxId`. Si el
`taxId` no corresponde a ningún cliente/proveedor y no se aporta `newCustomer` con sus datos, la
herramienta **no crea la factura**: devuelve `status: "needs_customer_data"` con la lista de campos
que hacen falta, para que el modelo los pida y vuelva a intentarlo (o llame antes a `create_contact`).

## 2. MCP de desarrollo (`server/dev-mcp.ts`)

Herramientas de solo lectura sobre el propio repositorio (no sobre la app en marcha), pensadas para
que un asistente de IA que edita este código encuentre rutas, esquemas, tablas y componentes más
rápido: `search_code`, `read_file`, `list_routes`, `describe_table`, `list_shared_schemas`,
`list_components`, `typecheck`, `git_status`.

No forma parte de la imagen Docker ni requiere base de datos. Se ejecuta en local por stdio y ya
está registrado en `.mcp.json` (raíz del repo) como `facturacion-dev`; los clientes MCP que leen ese
archivo (p. ej. Claude Code) lo detectan automáticamente. Para ejecutarlo a mano:

```sh
pnpm mcp:dev
```
