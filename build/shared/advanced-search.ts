import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { interpretSalesSearch } from './sales-search';
import { dateSchema } from './domain';
export const searchScopes = [
  'contacts',
  'catalog',
  'pending',
  'payments',
  'funds',
  'journal',
  'activity',
  'audit',
  'imports',
] as const;
export type SearchScope = (typeof searchScopes)[number];
export type SearchFilters = Partial<
  Record<
    | 'text'
    | 'status'
    | 'type'
    | 'metric'
    | 'direction'
    | 'method'
    | 'from'
    | 'to'
    | 'minTotal'
    | 'maxTotal'
    | 'sort',
    string
  >
>;
export type SearchPlan = { version: 1; scope: SearchScope; phrase: string; filters: SearchFilters };
export const searchPrefix = '@buscar:';
const amount = z.string().regex(/^\d{1,18}(\.\d{1,2})?$/);
const planSchema = z
  .object({
    version: z.literal(1),
    scope: z.enum(searchScopes),
    phrase: z.string().max(150),
    filters: z
      .object({
        text: z.string().max(150).optional(),
        status: z.string().max(30).optional(),
        type: z.string().max(30).optional(),
        metric: z.string().max(30).optional(),
        direction: z.string().max(30).optional(),
        method: z.string().max(30).optional(),
        from: dateSchema.refine((value) => value >= '0001-01-01', 'Fecha inválida').optional(),
        to: dateSchema.refine((value) => value >= '0001-01-01', 'Fecha inválida').optional(),
        minTotal: amount.optional(),
        maxTotal: amount.optional(),
        sort: z.string().max(30).optional(),
      })
      .strict(),
  })
  .strict();
const allowed: Record<SearchScope, Record<string, string[] | true>> = {
  contacts: {
    text: true,
    status: ['active', 'archived', 'all'],
    type: ['customer', 'supplier'],
    metric: ['receivable', 'payable'],
    sort: ['name_asc', 'name_desc', 'receivable_desc', 'payable_desc', 'due_asc', 'activity_desc'],
  },
  catalog: {
    text: true,
    status: ['active', 'archived'],
    minTotal: true,
    maxTotal: true,
    sort: ['total_asc', 'total_desc'],
  },
  pending: {
    text: true,
    status: ['overdue', 'upcoming'],
    direction: ['receivable', 'payable'],
    from: true,
    to: true,
    minTotal: true,
    maxTotal: true,
    sort: ['due_asc', 'due_desc', 'total_asc', 'total_desc'],
  },
  payments: {
    text: true,
    status: ['active', 'reversed'],
    direction: ['receipt', 'payment'],
    method: ['bank', 'cash', 'card'],
    from: true,
    to: true,
    minTotal: true,
    maxTotal: true,
    sort: ['date_asc', 'total_asc', 'total_desc'],
  },
  funds: {
    text: true,
    direction: ['receipt', 'payment'],
    method: ['bank', 'cash', 'card'],
    from: true,
    to: true,
    minTotal: true,
    maxTotal: true,
    sort: ['date_asc', 'total_asc', 'total_desc'],
  },
  journal: {
    text: true,
    from: true,
    to: true,
    minTotal: true,
    maxTotal: true,
    sort: ['date_asc', 'total_asc', 'total_desc'],
  },
  audit: { text: true, from: true, to: true },
  imports: { text: true, from: true, to: true },
  activity: { text: true, from: true, to: true, minTotal: true, maxTotal: true },
};
export function validateSearchPlan(value: unknown, scope: SearchScope): SearchPlan {
  const plan = planSchema.parse(value);
  if (plan.scope !== scope) throw new Error('La búsqueda pertenece a otra sección.');
  for (const [key, value] of Object.entries(plan.filters)) {
    const values = allowed[scope][key];
    if (!values || (values !== true && !values.includes(value!)))
      throw new Error(
        'No se puede filtrar por ' +
          ({
            status: 'ese estado',
            type: 'ese tipo',
            metric: 'ese indicador',
            sort: 'esa ordenación',
            from: 'fecha',
            to: 'fecha',
            minTotal: 'importe',
            maxTotal: 'importe',
            direction: 'ese sentido',
            method: 'ese medio',
          }[key] || key) +
          ' en esta vista.',
      );
  }
  if (plan.filters.from && plan.filters.to && plan.filters.from > plan.filters.to)
    throw new Error('La fecha final debe ser igual o posterior a la inicial.');
  if (
    plan.filters.minTotal &&
    plan.filters.maxTotal &&
    new Decimal(plan.filters.minTotal).gt(plan.filters.maxTotal)
  )
    throw new Error('El importe máximo debe ser igual o mayor al mínimo.');
  return plan;
}
export function decodeSearch(value: string, scope: SearchScope): SearchPlan | null {
  if (!value.startsWith(searchPrefix)) {
    if (value.length > 150) throw new Error('La búsqueda admite hasta 150 caracteres.');
    return null;
  }
  if (value.length > 4096) throw new Error('La búsqueda es demasiado larga.');
  try {
    return validateSearchPlan(JSON.parse(value.slice(searchPrefix.length)), scope);
  } catch (error) {
    throw new Error(
      error instanceof SyntaxError
        ? 'La búsqueda guardada no es válida. Vuelve a escribirla.'
        : error instanceof z.ZodError
          ? 'La búsqueda guardada contiene filtros no válidos. Vuelve a escribirla.'
          : (error as Error).message,
    );
  }
}
export function encodeSearch(plan: SearchPlan) {
  return searchPrefix + JSON.stringify(validateSearchPlan(plan, plan.scope));
}
export function searchDisplay(value: string) {
  if (!value.startsWith(searchPrefix)) return value;
  try {
    const phrase = JSON.parse(value.slice(searchPrefix.length)).phrase;
    return typeof phrase === 'string' ? phrase.slice(0, 150) : '';
  } catch {
    return '';
  }
}
export const searchExamples: Record<SearchScope, string> = {
  contacts: 'clientes activos de Ana',
  catalog: 'artículos activos de más de 50 €',
  pending: 'cobros vencidos de Ana',
  payments: 'cobros por transferencia de este mes',
  funds: 'anticipos de Ana de más de 100 €',
  journal: 'asientos de septiembre de más de 500 €',
  activity: 'documentos de septiembre de más de 500 €',
  audit: 'operaciones de hoy',
  imports: 'importaciones de este mes',
};
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[“”«»]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
export type SearchPreview = {
  kind: 'literal' | 'filters' | 'error';
  plan: SearchPlan;
  labels: string[];
  error?: string;
};
export function interpretListSearch(
  input: string,
  scope: SearchScope,
  anchor: string,
): SearchPreview {
  const filters: SearchFilters = {};
  const plan: SearchPlan = { version: 1, scope, phrase: input, filters };
  const labels: string[] = [];
  const result: SearchPreview = { kind: 'literal', plan, labels };
  try {
    if (input.length > 150) throw new Error('La búsqueda admite hasta 150 caracteres.');
    let text = normalize(input);
    if ((text.match(/"/g) || []).length % 2)
      throw new Error('Cierra las comillas o busca la frase como texto.');
    const quotes: string[] = [];
    text = text.replace(/"([^"]*)"/g, (_, name) => {
      quotes.push(name);
      return 'quotedname' + (quotes.length - 1);
    });
    let recognized = false;
    const take = (regex: RegExp, key: keyof SearchFilters, value: string, label: string) => {
      if (!regex.test(text)) return;
      recognized = true;
      if (filters[key] && filters[key] !== value)
        throw new Error(
          'La petición contiene filtros incompatibles. Indica una sola opción para ' +
            label.toLowerCase() +
            '.',
        );
      filters[key] = value;
      labels.push(label);
      text = text.replace(regex, ' ').replace(/\s+/g, ' ').trim();
    };
    if (scope === 'contacts' || scope === 'catalog') {
      take(
        /\b(?:archivados?|archivadas?|inactivos?|inactivas?)\b/g,
        'status',
        'archived',
        'Archivados',
      );
      take(/\b(?:activos?|activas?)\b/g, 'status', 'active', 'Activos');
      if (scope === 'contacts') {
        take(/\bclientes?\b/g, 'type', 'customer', 'Clientes');
        take(/\bproveedores?\b/g, 'type', 'supplier', 'Proveedores');
        take(
          /\b(?:con saldo por cobrar|con deuda|por cobrar)\b/g,
          'metric',
          'receivable',
          'Con saldo por cobrar',
        );
        take(/\b(?:con saldo por pagar|por pagar)\b/g, 'metric', 'payable', 'Con saldo por pagar');
        take(
          /\b(?:ordenados? por nombre|nombre de a a z|alfabeticamente)\b/g,
          'sort',
          'name_asc',
          'Nombre A–Z',
        );
        take(/\bnombre de z a a\b/g, 'sort', 'name_desc', 'Nombre Z–A');
        take(
          /\bmayor (?:saldo por cobrar|pendiente de cobro)(?: primero)?\b/g,
          'sort',
          'receivable_desc',
          'Mayor pendiente de cobro',
        );
        take(
          /\bmayor (?:saldo por pagar|pendiente de pago)(?: primero)?\b/g,
          'sort',
          'payable_desc',
          'Mayor pendiente de pago',
        );
      }
      if (scope === 'catalog' && /\bsin precio\b/.test(text)) {
        recognized = true;
        filters.maxTotal = '0.00';
        labels.push('Sin precio');
        text = text.replace(/\bsin precio\b/g, '');
      }
    }
    if (['pending', 'payments', 'funds'].includes(scope)) {
      take(
        /\b(?:cobros?|por cobrar|a cobrar)\b/g,
        'direction',
        scope === 'pending' ? 'receivable' : 'receipt',
        'Cobros',
      );
      take(
        /\b(?:pagos?|por pagar|a pagar)\b/g,
        'direction',
        scope === 'pending' ? 'payable' : 'payment',
        'Pagos',
      );
      if (scope === 'pending') {
        take(/\b(?:vencidos?|vencidas?|atrasados?|atrasadas?)\b/g, 'status', 'overdue', 'Vencidos');
        take(/\b(?:proximos?|proximas?|sin vencer)\b/g, 'status', 'upcoming', 'Sin vencer');
        text = text.replace(/\bpendientes?\b/g, () => {
          recognized = true;
          return '';
        });
      }
      if (scope === 'payments') {
        take(/\b(?:revertidos?|anulados?)\b/g, 'status', 'reversed', 'Revertidos');
        take(/\b(?:sin revertir|vigentes?)\b/g, 'status', 'active', 'Sin revertir');
      }
      if (scope !== 'pending') {
        take(
          /\b(?:(?:por|en|con) )?(?:transferencia|banco|bancaria)\b/g,
          'method',
          'bank',
          'Transferencia',
        );
        take(/\b(?:(?:por|en|con) )?(?:efectivo|caja)\b/g, 'method', 'cash', 'Efectivo');
        take(/\b(?:(?:por|en|con) )?tarjeta\b/g, 'method', 'card', 'Tarjeta');
      }
    }
    const nouns: Record<SearchScope, RegExp> = {
      contacts: /\bcontactos?\b/g,
      catalog: /\b(?:articulos?|productos?|servicios?|catalogo)\b/g,
      pending: /\bvencimientos?\b/g,
      payments: /\bmovimientos?\b/g,
      funds: /\banticipos?\b/g,
      journal: /\b(?:asientos?|apuntes?)\b/g,
      activity: /\b(?:documentos?|movimientos?|anticipos?)\b/g,
      audit: /\b(?:operaciones?|eventos?|registros?)\b/g,
      imports: /\b(?:importaciones?|importacion|lotes?)\b/g,
    };
    text = text.replace(nouns[scope], () => {
      recognized = true;
      return '';
    });
    text = text
      .replace(
        /^(?:(?:muestrame|muestra|mostrar|busca|buscar|ver|necesito ver|necesito|quiero ver|quiero|los|las|todos|todas|el|la)\s*)+/,
        '',
      )
      .trim();
    text = text.replace(
      /\b(?:(?:de la |de el |del |de )?(?:cliente|proveedor|concepto|referencia|cuenta|codigo))\s+/g,
      'de ',
    );
    text = text
      .replace(
        /\bde (?=(?:mas de|menos de|mayor que|menor que|al menos|como minimo|como maximo))/g,
        '',
      )
      .replace(/\bque (?=vencen)/g, '');
    text = text.replace(
      /\b(?:fecha de pago|fecha de cobro|fecha de registro|fecha)\s+/g,
      'emision ',
    );
    text = text
      .replace(/\b(precio|importe)\s*(>=|<=|>|<|=)\s*/g, '$2 ')
      .replace(/(^|\s)>=\s*/g, ' al menos ')
      .replace(/(^|\s)<=\s*/g, ' como maximo ')
      .replace(/(^|\s)>\s*/g, ' mas de ')
      .replace(/(^|\s)<\s*/g, ' menos de ');
    text = text
      .replace(/quotedname(\d+)/g, (original, i) =>
        quotes[Number(i)] === undefined ? original : '"' + quotes[Number(i)] + '"',
      )
      .trim();
    const grammar =
      /\b(?:entre|desde|hasta|mas de|menos de|mayor|menor|como minimo|como maximo|al menos|hoy|ayer|manana|este mes|esta semana|ultimos|proximos|emision|vencen|vencimiento)\b/.test(
        text,
      ) || /^(?:de |en |para )/.test(text);
    if (!recognized && !grammar) {
      const quotedOnly = /^"([^"]+)"$/.exec(text);
      if (quotedOnly) {
        filters.text = quotedOnly[1];
        result.kind = 'filters';
        result.labels = searchPlanLabels(plan);
      }
      return result;
    }
    result.kind = 'filters';
    if (text) {
      const interpreted = interpretSalesSearch('facturas ' + text, anchor);
      if (interpreted.kind === 'error') throw new Error(interpreted.error);
      if (interpreted.filters.status !== 'all')
        throw new Error(
          'Ese estado no está disponible en esta vista. Cambia de vista o busca la frase como texto.',
        );
      const f = interpreted.filters;
      if (f.dueFrom || f.dueTo) {
        if (scope !== 'pending')
          throw new Error('Esta vista filtra por fecha, no por vencimiento.');
        if (f.from || f.to) throw new Error('Indica un único intervalo de vencimientos.');
        f.from = f.dueFrom;
        f.to = f.dueTo;
      }
      if (interpreted.customerText) {
        filters.text = interpreted.customerText;
        labels.push('Texto: ' + filters.text);
      }
      for (const key of ['from', 'to', 'minTotal', 'maxTotal'] as const)
        if (f[key] !== undefined) {
          if (filters[key] !== undefined && filters[key] !== f[key])
            throw new Error('El importe indicado contradice el filtro sin precio.');
          filters[key] = f[key];
        }
      if (f.sort !== 'default') filters.sort = f.sort;
      labels.push(...interpreted.labels);
    }
    validateSearchPlan(plan, scope);
    result.labels = searchPlanLabels(plan);
    return result;
  } catch (error) {
    return { ...result, kind: 'error', error: (error as Error).message };
  }
}
export function normalizedSearchText(value: string) {
  return normalize(value);
}
export function matchesSearchRow(
  row: { text: string; date?: string; amount?: string; active?: boolean },
  value: string,
  scope: SearchScope,
) {
  const plan = decodeSearch(value, scope);
  const f = plan?.filters || { text: value };
  const words = normalize(f.text || '')
    .split(' ')
    .filter(Boolean);
  if (!words.every((word) => normalize(row.text).includes(word))) return false;
  if (f.status && row.active !== undefined && row.active !== (f.status === 'active')) return false;
  if (f.from && (!row.date || row.date < f.from)) return false;
  if (f.to && (!row.date || row.date > f.to)) return false;
  if (f.minTotal && (!row.amount || new Decimal(row.amount).lt(f.minTotal))) return false;
  if (f.maxTotal && (!row.amount || new Decimal(row.amount).gt(f.maxTotal))) return false;
  return true;
}
export function filterSearchRows<T>(
  rows: T[],
  value: string,
  scope: SearchScope,
  describe: (row: T) => { text: string; date?: string; amount?: string; active?: boolean },
) {
  let plan: SearchPlan | null;
  try {
    plan = decodeSearch(value, scope);
  } catch {
    return [];
  }
  const result = rows.filter((row) => matchesSearchRow(describe(row), value, scope));
  const sort = plan?.filters.sort;
  if (sort === 'total_asc' || sort === 'total_desc')
    result.sort(
      (a, b) =>
        new Decimal(describe(a).amount || 0).cmp(describe(b).amount || 0) *
        (sort === 'total_desc' ? -1 : 1),
    );
  if (sort === 'date_asc')
    result.sort((a, b) => (describe(a).date || '').localeCompare(describe(b).date || ''));
  return result;
}

export function literalSearch(value: string) {
  if (!value.startsWith(searchPrefix)) return value;
  try {
    const text = JSON.parse(value.slice(searchPrefix.length)).filters?.text;
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

/** Labels describe the stored effective filters, so relative dates never drift after applying. */
export function searchPlanLabels(plan: SearchPlan): string[] {
  const f = plan.filters,
    labels: string[] = [];
  const names: Record<string, string> = {
    active: plan.scope === 'payments' ? 'Sin revertir' : 'Activos',
    archived: 'Archivados',
    all: 'Todos',
    customer: 'Clientes',
    supplier: 'Proveedores',
    receivable: 'Por cobrar',
    payable: 'Por pagar',
    receipt: 'Cobros',
    payment: 'Pagos',
    bank: 'Transferencia',
    cash: 'Efectivo',
    card: 'Tarjeta',
    overdue: 'Vencidos',
    upcoming: 'Sin vencer',
    reversed: 'Revertidos',
  };
  if (f.text) labels.push('Texto: ' + f.text);
  for (const key of ['type', 'status', 'direction', 'method', 'metric'] as const)
    if (f[key]) labels.push(names[f[key]] || f[key]);
  const date = (s?: string) => (s ? s.split('-').reverse().join('/') : '…');
  if (f.from || f.to)
    labels.push(
      (plan.scope === 'pending' ? 'Vencimiento' : 'Fecha') + ': ' + date(f.from) + '–' + date(f.to),
    );
  const money = (s: string) => {
    const [whole, cents] = new Decimal(s).toFixed(2).split('.');
    return new Intl.NumberFormat('es-ES').format(BigInt(whole)) + ',' + cents + ' €';
  };
  const amount =
    plan.scope === 'catalog' ? 'Precio' : plan.scope === 'pending' ? 'Saldo pendiente' : 'Importe';
  if (f.minTotal) labels.push(amount + ' mínimo: ' + money(f.minTotal));
  if (f.maxTotal) labels.push(amount + ' máximo: ' + money(f.maxTotal));
  if (f.sort)
    labels.push(
      'Orden: ' +
        ({
          name_asc: 'nombre A–Z',
          name_desc: 'nombre Z–A',
          receivable_desc: 'mayor saldo por cobrar',
          payable_desc: 'mayor saldo por pagar',
          due_asc: 'vencimiento más cercano',
          due_desc: 'vencimiento más lejano',
          date_asc: 'fecha más antigua',
          activity_desc: 'actividad más reciente',
          total_asc: 'menor importe',
          total_desc: 'mayor importe',
        }[f.sort] || f.sort),
    );
  return labels.length ? labels : ['Todos los registros de esta vista'];
}
export function textSearchPlan(text: string, scope: SearchScope) {
  return encodeSearch({ version: 1, scope, phrase: text, filters: { text } });
}
