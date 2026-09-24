export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
// Preserve the command key after an uncertain network result so a user retry cannot duplicate it.
const pendingCommands = new Map<string, string>();
let apiActor = '';
let activeWorkspace: string | null = null;
export const getActiveWorkspace = () => activeWorkspace;
try {
  activeWorkspace = sessionStorage.getItem('kronjop.workspace');
} catch {
  /* Device preference is optional. */
}
export function setActiveWorkspace(id: string | null) {
  activeWorkspace = id;
  try {
    if (id) sessionStorage.setItem('kronjop.workspace', id);
    else sessionStorage.removeItem('kronjop.workspace');
  } catch {
    /* The selection still works for this tab. */
  }
}
export function downloadUrl(path: string) {
  return (
    '/api' +
    path +
    (activeWorkspace
      ? `${path.includes('?') ? '&' : '?'}workspaceId=${encodeURIComponent(activeWorkspace)}`
      : '')
  );
}
let navigationGuard: (() => boolean) | null = null;
export const setNavigationGuard = (guard: (() => boolean) | null) => {
  navigationGuard = guard;
};
export const canNavigate = () => !navigationGuard || navigationGuard();
export async function api<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    key?: string;
    signal?: AbortSignal;
    workspaceId?: string;
  } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const workspaceId = options.workspaceId ?? activeWorkspace;
  const signature = JSON.stringify([workspaceId, method, path, options.body]);
  const isCommand = method !== 'GET' && !path.startsWith('/auth/');
  const actor = apiActor;
  const digest = isCommand
    ? Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature))),
      )
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')
    : '';
  const storageKey = `kronjop.command:${actor}:${digest}`;
  let persisted: string | null = null;
  if (isCommand && actor)
    try {
      persisted = localStorage.getItem(storageKey);
    } catch {}
  const key =
    options.key || persisted || pendingCommands.get(actor + signature) || crypto.randomUUID();
  if (isCommand) {
    pendingCommands.set(actor + signature, key);
    if (actor)
      try {
        localStorage.setItem(storageKey, key);
      } catch {}
  }
  const request: RequestInit = {
    method,
    credentials: 'same-origin',
    signal: options.signal,
    headers: {
      ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-Requested-With': 'kronjop', 'Idempotency-Key': key } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  };
  let response: Response;
  try {
    response = await fetch('/api' + path, request);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (!isCommand && method !== 'GET')
      throw new ApiError(0, 'No se ha podido conectar con el servidor.');
    try {
      response = await fetch('/api' + path, request);
    } catch {
      throw new ApiError(
        0,
        'No se ha podido confirmar la operación. Puedes reintentar; se conservará la misma clave para evitar duplicados.',
      );
    }
  }
  const data = await response.json();
  if (response.ok || (response.status < 500 && response.status !== 429)) {
    pendingCommands.delete(actor + signature);
    if (isCommand && actor)
      try {
        localStorage.removeItem(storageKey);
      } catch {}
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(response.status, data.message || 'No se ha podido completar la operación.');
  }
  if (['/me', '/auth/login', '/auth/setup'].includes(path) && data.user?.id)
    apiActor = data.user.id;
  if (path === '/auth/logout') {
    apiActor = '';
    pendingCommands.clear();
  }
  return data;
}
export const navigate = (path: string) => {
  window.location.hash = path;
};
export const today = () => new Date().toLocaleDateString('en-CA');
export function plusDays(date: string, days: number) {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
}
export const euros = (value: string | number = 0) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value));
const formatDate = (value: string, omitCurrentYear: boolean) => {
  const date = new Date(value.slice(0, 10) + 'T12:00:00');
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year:
      omitCurrentYear && date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date);
};
export const shortDate = (value: string) => formatDate(value, false);
// Only table cells omit the year for dates in the current year.
export const tableDate = (value: string) => formatDate(value, true);
export const accountNames: Record<string, string> = {
  '100': 'Capital social',
  '400': 'Proveedores',
  '430': 'Clientes',
  '472': 'IVA soportado',
  '473': 'Retenciones soportadas',
  '4751': 'Retenciones a pagar',
  '477': 'IVA repercutido',
  '555': 'Partidas pendientes de aplicación',
  '570': 'Caja',
  '572': 'Bancos',
  '600': 'Compras',
  '629': 'Otros servicios',
  '700': 'Ventas',
};
