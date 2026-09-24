import { Decimal } from 'decimal.js';
import { documentQuerySchema, type DocumentQuery } from './sales-tools';
import type { DocumentCustomer } from './document-list';

export type SalesSearchFilters = Pick<DocumentQuery, 'status' | 'sort'> &
  Partial<
    Pick<DocumentQuery, 'customer' | 'from' | 'to' | 'dueFrom' | 'dueTo' | 'minTotal' | 'maxTotal'>
  >;
export type SalesSearchInterpretation = {
  kind: 'literal' | 'filters' | 'error';
  filters: SalesSearchFilters;
  labels: string[];
  customerText?: string;
  assumedYear?: number;
  error?: string;
};
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
const months = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const money = (value: string) => {
  const [whole, cents] = new Decimal(value).toFixed(2).split('.');
  return new Intl.NumberFormat('es-ES').format(BigInt(whole)) + ',' + cents + ' €';
};
const dateLabel = (value: string) => value.split('-').reverse().join('/');
const iso = (year: number, month: number, day: number) => {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};
const numberPattern = '(?:[0-9]{1,3}(?:\\.[0-9]{3})+(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)';
const currency = '(?:\\s*(?:euros?|€))?';
function amount(value: string) {
  const grouped = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(value);
  const canonical = (grouped ? value.replace(/\./g, '') : value).replace(',', '.');
  return new Decimal(canonical);
}

/** Deliberately bounded grammar: unconsumed meaning blocks application instead of broadening a search. */
export function interpretSalesSearch(
  input: string,
  anchor: string,
  yearOverride?: number,
  scope: 'sales' | 'quote' | 'purchase' = 'sales',
): SalesSearchInterpretation {
  const filters: SalesSearchFilters = { status: 'all', sort: 'default' };
  const result: SalesSearchInterpretation = { kind: 'literal', filters, labels: [] };
  let rest = normalize(input).replace(/[“”«»]/g, '"');
  const errorResult = (error: string): SalesSearchInterpretation => ({
    ...result,
    kind: 'error',
    error,
  });
  if (input.length > 150) return errorResult('La búsqueda admite hasta 150 caracteres.');
  if ((rest.match(/"/g) || []).length % 2)
    return errorResult('Cierra las comillas del nombre o busca la frase como texto.');
  const quoted: string[] = [];
  rest = rest.replace(/"([^"]+)"/g, (_, name: string) => {
    quoted.push(name);
    return `clientename${quoted.length - 1}`;
  });
  // Read complete written dates before consuming standalone month names; quoted names stay protected.
  const monthNames = months.join('|') + '|setiembre';
  const writtenDate = (day: string, monthName: string, year: string) =>
    day.padStart(2, '0') +
    '/' +
    String(monthName === 'setiembre' ? 9 : months.indexOf(monthName) + 1).padStart(2, '0') +
    '/' +
    year;
  rest = rest.replace(
    new RegExp(
      '\\b(desde el|desde|del|de|entre el|entre) ([0-9]{1,2}) (hasta el|hasta|al|a|y el|y) ([0-9]{1,2}) de (' +
        monthNames +
        ') (?:de|del) ([0-9]{4})\\b',
      'g',
    ),
    (_, start, first, end, last, monthName, year) =>
      start +
      ' ' +
      writtenDate(first, monthName, year) +
      ' ' +
      end +
      ' ' +
      writtenDate(last, monthName, year),
  );
  rest = rest.replace(
    new RegExp('\\b([0-9]{1,2}) de (' + monthNames + ') (?:de|del) ([0-9]{4})\\b', 'g'),
    (_, day, monthName, year) => writtenDate(day, monthName, year),
  );
  rest = rest
    .replace(/\b(?:superior(?:es)? a|mayor(?:es)? (?:a|de|que))(?=\s+\d)/g, 'mas de')
    .replace(/\b(?:inferior(?:es)? a|menor(?:es)? (?:a|de|que))(?=\s+\d)/g, 'menos de');
  rest = rest
    .replace(
      /\bde (?=(?:mas de|menos de|mayor que|menor que|al menos|como minimo|como maximo))/g,
      '',
    )
    .replace(/\bque (?=vencen)/g, '');
  rest = rest
    .replace(/\b(?:precio|importe|total)\s*(>=|<=|>|<|=)\s*/g, '$1 ')
    .replace(/(^|\s)>=\s*/g, ' al menos ')
    .replace(/(^|\s)<=\s*/g, ' como maximo ')
    .replace(/(^|\s)>\s*/g, ' mas de ')
    .replace(/(^|\s)<\s*/g, ' menos de ')
    .replace(/(^|\s)=\s*/g, ' exactamente ')
    .trim();
  if (
    !rest ||
    (!/\b(?:facturas?|presupuestos?|compras?|gastos?|confirmados?|aceptados?|rechazados?|convertidos?|caducados?|pendientes?|vencidas?|cobradas?|pagadas?|borradores?|emitidas?|registradas?|contabilizadas?|emision|vencen|vencimiento|entre|mas de|menos de|mayor|menor|sin cobrar|como minimo|como maximo|al menos|superior a|inferior a|recientes|antiguas|ultimos|proximos|exactamente)\b/.test(
      rest,
    ) &&
      !/^(?:de |del cliente |cliente |para el cliente |desde |hasta |en |este |esta |el mes |la semana |hoy$|ayer$|manana$)/.test(
        rest,
      ))
  )
    return result;
  result.kind = 'filters';
  const fail = (message: string) => {
    result.kind = 'error';
    result.error ??= message;
  };
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(anchor) ||
    !documentQuerySchema.safeParse({ asOf: anchor }).success
  ) {
    fail('No se ha podido determinar la fecha de la búsqueda.');
    return result;
  }
  if (
    yearOverride !== undefined &&
    (!Number.isInteger(yearOverride) || yearOverride < 1 || yearOverride > 9999)
  ) {
    fail('Indica un año entre 1 y 9999.');
    return result;
  }
  if (input.length > 150) {
    fail('La búsqueda admite hasta 150 caracteres.');
    return result;
  }
  const consume = (pattern: RegExp, action: (match: RegExpExecArray) => void) => {
    const match = pattern.exec(rest);
    if (!match) return;
    action(match);
    rest = (rest.slice(0, match.index) + ' ' + rest.slice(match.index + match[0].length))
      .replace(/\s+/g, ' ')
      .trim();
  };
  let sortSet = false;
  const sort = (value: DocumentQuery['sort'], label: string) => {
    filters.sort = value;
    result.labels.push('Orden: ' + label);
    sortSet = true;
  };
  consume(
    /\b(?:ordenadas? por |ordenar por |por )?(?:precio|importe)(?::)? de (mayor a menor|menor a mayor)(?: primero)?\b/,
    (m) => sort(m[1] === 'mayor a menor' ? 'total_desc' : 'total_asc', m[1]),
  );
  if (!sortSet)
    consume(/\b(?:las? de |por )?(mayor|menor) (?:importe|precio)(?: primero)?\b/, (m) =>
      sort(m[1] === 'mayor' ? 'total_desc' : 'total_asc', m[1] + ' importe primero'),
    );
  if (!sortSet)
    consume(
      /\b(?:ordenadas? por |ordenar por )?(?:fecha de )?emision (?:mas )?(antigua|reciente)(?: primero)?\b|\b(?:las? )?mas (recientes|antiguas)(?: primero)?\b/,
      (m) =>
        sort(
          (m[1] || m[2]).startsWith('antigua') ? 'date_asc' : 'default',
          (m[1] || m[2]).startsWith('antigua') ? 'emisión más antigua' : 'emisión más reciente',
        ),
    );
  if (!sortSet)
    consume(
      /\b(?:ordenadas? por |ordenar por |por )?vencimiento (?:mas )?(cercano|lejano)(?: primero)?\b/,
      (m) => sort(m[1] === 'cercano' ? 'due_asc' : 'due_desc', 'vencimiento más ' + m[1]),
    );
  if (!sortSet)
    consume(
      /\b(?:ordenadas? por |ordenar por |por |las? de )?mayor (?:saldo pendiente|pendiente)(?: primero)?\b/,
      () => sort('balance_desc', 'mayor saldo pendiente'),
    );

  const confirmedWords =
    scope === 'sales'
      ? /\bemitidas?\b/g
      : scope === 'purchase'
        ? /\b(?:registradas?|contabilizadas?)\b/g
        : /$a/g;
  const confirmed = confirmedWords.test(rest);
  confirmedWords.lastIndex = 0;
  const states: [RegExp, string, string][] =
    scope === 'quote'
      ? [
          [
            /\b(?:pendientes? de respuesta|pendientes?|confirmados?|enviados?)\b/g,
            'sent',
            'Pendientes de respuesta',
          ],
          [/\baceptados?\b/g, 'accepted', 'Aceptados'],
          [/\brechazados?\b/g, 'rejected', 'Rechazados'],
          [/\b(?:convertidos?|facturados?)\b/g, 'converted', 'Convertidos'],
          [/\b(?:caducados?|vencidos?)\b/g, 'expired', 'Caducados'],
          [/\bborradores?\b/g, 'draft', 'Borradores'],
        ]
      : [
          [
            /\b(?:pendientes? de (?:cobro|pago)|sin (?:cobrar|pagar)|no (?:cobradas?|pagadas?)|pendientes?)\b/g,
            'unpaid',
            'Pendientes',
          ],
          [/\bvencidas?\b/g, 'overdue', 'Vencidas'],
          [/\b(?:cobradas?|pagadas?)\b/g, 'paid', scope === 'purchase' ? 'Pagadas' : 'Cobradas'],
          [/\bborradores?\b/g, 'draft', 'Borradores'],
        ];
  for (const [pattern, state, label] of states) {
    if (pattern.test(rest)) {
      if (filters.status !== 'all' && filters.status !== state)
        fail(
          scope === 'quote'
            ? 'Indica un único estado de presupuesto.'
            : 'Indica un único estado: pendientes, vencidas, cobradas o borradores.',
        );
      else {
        filters.status = state;
        result.labels.push('Estado: ' + label);
      }
      rest = rest.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  if (confirmed) {
    if (filters.status === 'draft')
      fail('Una factura no puede estar en borrador y confirmada a la vez.');
    else if (filters.status === 'all') {
      filters.status = scope === 'purchase' ? 'recorded' : 'issued';
      result.labels.push(scope === 'purchase' ? 'Estado: Contabilizadas' : 'Estado: Emitidas');
    }
    rest = rest.replace(confirmedWords, ' ').replace(/\s+/g, ' ').trim();
  }
  const year = Number(anchor.slice(0, 4)),
    month = Number(anchor.slice(5, 7)) - 1;
  const dateLead =
    '(?:(?:con )?(?:fecha de )?(?:emitidas?|emision|vencen|vencimiento)(?: en| el)?\\s+)?';
  const setDates = (match: string, from: string, to: string) => {
    const due = /vencen|vencimiento/.test(match);
    const first = due ? 'dueFrom' : 'from',
      last = due ? 'dueTo' : 'to';
    if (filters[first] || filters[last]) {
      fail('Indica un solo intervalo para cada tipo de fecha.');
      return;
    }
    filters[first] = from;
    filters[last] = to;
    result.labels.push(`${due ? 'Vencimiento' : 'Emisión'}: ${dateLabel(from)}–${dateLabel(to)}`);
  };
  const exactDate = '(?:[0-9]{1,2}\\/[0-9]{1,2}\\/[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})';
  const canonicalDate = (date: string) =>
    date.includes('/')
      ? date
          .split('/')
          .reverse()
          .map((v, i) => (i ? v.padStart(2, '0') : v))
          .join('-')
      : date;
  for (let i = 0; i < 2; i++)
    consume(
      new RegExp(
        '\\b' +
          dateLead +
          '(?:desde el|desde|del|de|entre el|entre)\\s+(' +
          exactDate +
          ')\\s+(?:hasta el|hasta|al|a|y el|y)\\s+(' +
          exactDate +
          ')\\b',
      ),
      (m) => setDates(m[0], canonicalDate(m[1]), canonicalDate(m[2])),
    );
  for (let i = 0; i < 2; i++)
    consume(
      new RegExp(
        '\\b' +
          dateLead +
          '(?:(?:en|de|del|el)\\s+)?(hoy|ayer|manana|este mes|el mes pasado|mes pasado|este trimestre|este ano|el ano pasado|ano pasado|el proximo ano|proximo ano|el proximo mes|proximo mes|esta semana|la semana pasada|semana pasada|la proxima semana|proxima semana)\\b',
      ),
      (m) => {
        const period = m[1];
        let from = anchor,
          to = anchor;
        if (period === 'ayer' || period === 'manana')
          from = to = iso(year, month, Number(anchor.slice(8)) + (period === 'ayer' ? -1 : 1));
        else if (period.includes('semana')) {
          const date = new Date(anchor + 'T12:00:00Z'),
            offset = (date.getUTCDay() + 6) % 7;
          const shift = period.includes('pasada') ? -7 : period.includes('proxima') ? 7 : 0;
          from = iso(year, month, date.getUTCDate() - offset + shift);
          to = iso(year, month, date.getUTCDate() - offset + shift + 6);
        } else if (/\bmes\b/.test(period)) {
          const m = month + (period.includes('pasado') ? -1 : period.includes('proximo') ? 1 : 0);
          from = iso(year, m, 1);
          to = iso(year, m + 1, 0);
        } else if (period.includes('trimestre')) {
          const m = Math.floor(month / 3) * 3;
          from = iso(year, m, 1);
          to = iso(year, m + 3, 0);
        } else if (period.includes('ano')) {
          const y = year + (period.includes('pasado') ? -1 : period.includes('proximo') ? 1 : 0);
          from = iso(y, 0, 1);
          to = iso(y, 12, 0);
        }
        setDates(m[0], from, to);
      },
    );
  for (let i = 0; i < 2; i++)
    consume(
      new RegExp(
        '\\b' +
          dateLead +
          '(?:(?:en|de|del|el)\\s+)?(' +
          months.join('|') +
          '|setiembre)(?:\\s+(?:de |del )?([0-9]{4}))?\\b',
      ),
      (m) => {
        const index = m[1] === 'setiembre' ? 8 : months.indexOf(m[1]);
        const y = m[2] ? Number(m[2]) : (yearOverride ?? year);
        if (y < 1 || y > 9999) {
          fail('Indica un año entre 1 y 9999.');
          return;
        }
        if (!m[2]) result.assumedYear = y;
        setDates(m[0], iso(y, index, 1), iso(y, index + 1, 0));
      },
    );
  for (let i = 0; i < 2; i++)
    consume(
      new RegExp('\\b' + dateLead + '(desde|hasta)(?: el)?\\s+(' + exactDate + ')\\b'),
      (m) => {
        const due = /vencen|vencimiento/.test(m[0]);
        const key = due
          ? m[1] === 'desde'
            ? 'dueFrom'
            : 'dueTo'
          : m[1] === 'desde'
            ? 'from'
            : 'to';
        if (filters[key]) {
          fail('Indica un único límite para cada fecha.');
          return;
        }
        filters[key] = canonicalDate(m[2]);
        result.labels.push(
          (due ? 'Vencimiento' : 'Fecha') + ' ' + m[1] + ': ' + dateLabel(filters[key]!),
        );
      },
    );
  for (let i = 0; i < 2; i++)
    consume(new RegExp('\\b' + dateLead + '(?:el\\s+)?(' + exactDate + ')\\b'), (m) =>
      setDates(m[0], canonicalDate(m[1]), canonicalDate(m[1])),
    );

  for (let i = 0; i < 2; i++)
    consume(
      new RegExp(
        '\\b' +
          dateLead +
          '(?:(?:en|de|del)\\s+)?(?:los\\s+)?(ultimos|proximos)\\s+([0-9]{1,4})\\s+dias\\b',
      ),
      (m) => {
        const count = Number(m[2]);
        if (count < 1 || count > 3660) {
          fail('Indica entre 1 y 3660 días.');
          return;
        }
        const day = Number(anchor.slice(8));
        setDates(
          m[0],
          m[1] === 'ultimos' ? iso(year, month, day - count + 1) : anchor,
          m[1] === 'proximos' ? iso(year, month, day + count - 1) : anchor,
        );
      },
    );
  for (let i = 0; i < 2; i++)
    consume(new RegExp('\\b' + dateLead + '(?:de|en|del) (?:el ano )?([0-9]{4})\\b'), (m) => {
      const y = Number(m[1]);
      if (y < 1 || y > 9999) {
        fail('Indica un año entre 1 y 9999.');
        return;
      }
      setDates(m[0], iso(y, 0, 1), iso(y, 12, 0));
    });

  // Totals use cents; strict comparisons become exact inclusive bounds understood by the existing API.
  if (
    /\b(?:saldo|pendiente de cobro)\s+(?:de |superior|inferior|mayor|menor|entre|mas|menos)/.test(
      rest,
    )
  )
    fail(
      'El intervalo de importe se aplica al total de la factura. Para el saldo, usa «mayor saldo pendiente primero».',
    );
  consume(
    new RegExp(
      '\\b(?:por |con (?:un )?(?:importe|precio|total)(?: de)? |(?:importe|precio|total)(?: de)? )?entre\\s+(' +
        numberPattern +
        ')' +
        currency +
        '\\s+y\\s+(' +
        numberPattern +
        ')' +
        currency +
        '(?![0-9.,])',
    ),
    (m) => {
      filters.minTotal = amount(m[1]).toFixed(2);
      filters.maxTotal = amount(m[2]).toFixed(2);
      result.labels.push(
        'Total: entre ' + money(filters.minTotal) + ' y ' + money(filters.maxTotal),
      );
    },
  );
  consume(
    new RegExp(
      '\\b(?:por |(?:importe|precio|total) )?exactamente\\s+(' +
        numberPattern +
        ')' +
        currency +
        '(?![0-9.,])',
    ),
    (m) => {
      if (filters.minTotal || filters.maxTotal) {
        fail('Indica un solo intervalo de importe.');
        return;
      }
      filters.minTotal = filters.maxTotal = amount(m[1]).toFixed(2);
      result.labels.push('Total: ' + money(filters.minTotal));
    },
  );
  for (let i = 0; i < 2; i++)
    consume(
      new RegExp(
        '(?:\\b(?:por |con (?:un )?(?:importe|precio|total)(?: de)? |(?:importe|precio|total)(?: de)? )?)(mas de|menos de|superior a|inferior a|mayor que|menor que|desde|hasta|al menos|como minimo|como maximo)\\s+(' +
          numberPattern +
          ')' +
          currency +
          '(?![0-9.,])',
      ),
      (m) => {
        const lower = [
          'mas de',
          'superior a',
          'mayor que',
          'desde',
          'al menos',
          'como minimo',
        ].includes(m[1]);
        const strict = [
          'mas de',
          'superior a',
          'mayor que',
          'menos de',
          'inferior a',
          'menor que',
        ].includes(m[1]);
        const key = lower ? 'minTotal' : 'maxTotal';
        if (filters[key]) {
          fail('Indica un solo límite mínimo y un solo máximo.');
          return;
        }
        const value = amount(m[2]);
        filters[key] = value.plus(strict ? (lower ? '0.01' : '-0.01') : '0').toFixed(2);
        result.labels.push(
          'Total: ' +
            (strict ? (lower ? 'más de ' : 'menos de ') : lower ? 'desde ' : 'hasta ') +
            money(value.toString()),
        );
      },
    );

  rest = rest
    .replace(
      /^(?:(?:muestrame|muestra|mostrar|busca|buscar|ver|necesito ver|necesito|quiero ver|quiero|las|los|todas las|todas|facturas|factura|presupuestos|presupuesto|compras|compra|gastos|gasto)\s*)+/g,
      '',
    )
    .trim();
  rest = rest
    .replace(/^(?:y|por|en|el)\s+/, '')
    .replace(/(?:\s+|^)(?:y|por|en|el)$/, '')
    .trim();
  const client =
    /^(?:de(?:l (?:cliente|proveedor))?|para(?: el (?:cliente|proveedor))?|cliente|proveedor)\s+(.+)$/.exec(
      rest,
    );
  if (client) {
    let name = client[1].trim();
    const candidate = /^clientename(\d+)$/.exec(name);
    const placeholder = candidate && quoted[Number(candidate[1])] !== undefined ? candidate : null;
    if (placeholder) name = quoted[Number(placeholder[1])];
    if (
      /\b(?:excepto|sin|con|entre|mas|menos|saldo|iva|aproximadamente|unos|o|y|no|de)\b/.test(
        name,
      ) &&
      !placeholder
    )
      fail(
        'No he reconocido «' +
          name +
          '». Pon el nombre del cliente entre comillas si contiene esas palabras.',
      );
    else result.customerText = name;
    rest = '';
  }
  if (rest)
    fail('No he reconocido «' + rest + '». Corrige la frase o busca ese texto literalmente.');
  if (!result.customerText && !result.labels.length)
    fail('Añade un cliente, estado, fecha o importe a la búsqueda.');
  const validation = documentQuerySchema.safeParse(filters);
  if (!validation.success) fail(validation.error.issues[0].message);
  return result;
}

export function salesSearchCustomers(text: string, customers: DocumentCustomer[]) {
  const term = normalize(text);
  const taxId = (value: string) => normalize(value).replace(/[\s.-]/g, '');
  const exactId = customers.filter((c) => taxId(c.taxId) === taxId(text));
  if (exactId.length) return exactId;
  const exactName = customers.filter((c) => normalize(c.name) === term);
  if (exactName.length) return exactName;
  const words = term.split(' ');
  return customers.filter(
    (c) =>
      words.every((word) => normalize(c.name).includes(word)) ||
      taxId(c.taxId).includes(taxId(text)),
  );
}

/** A phrase only stays attached while the actual filter values still match its applied interpretation. */
export function salesSearchKey(query: Partial<DocumentQuery>) {
  return JSON.stringify(
    [
      'search',
      'status',
      'sort',
      'customer',
      'from',
      'to',
      'dueFrom',
      'dueTo',
      'minTotal',
      'maxTotal',
      'metric',
      'asOf',
    ].map((key) => {
      const value = query[key as keyof DocumentQuery];
      return value === 'all' || value === 'default' ? '' : value || '';
    }),
  );
}
