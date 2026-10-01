// Lógica pura de facturación recurrente: sin base de datos ni reloj implícito.
// Las fechas son cadenas AAAA-MM-DD en calendario civil, así no hay desfases de zona horaria.
export const frequencies = ['monthly', 'quarterly', 'yearly'] as const;
export type Frequency = (typeof frequencies)[number];
export const frequencyLabels: Record<Frequency, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};
export const runStatusLabels = {
  issued: 'Emitida',
  draft: 'Borrador',
  failed: 'Con error',
  skipped: 'Omitida',
} as const;
export const recurringStatusLabels = {
  active: 'Activa',
  paused: 'Pausada',
  finished: 'Finalizada',
} as const;
const monthsOf: Record<Frequency, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Fecha de hoy en Europe/Madrid. `now` es inyectable para tests. */
export function todayMadrid(now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Siguiente fecha de la serie. `anchorDay` es el día de inicio original: si el mes no lo tiene
 * se usa el último día de ese mes, y el mes siguiente vuelve al día original.
 */
export function nextOccurrence(
  date: string,
  frequency: Frequency,
  interval = 1,
  anchorDay = Number(date.slice(8, 10)),
) {
  const total = Number(date.slice(0, 4)) * 12 + (Number(date.slice(5, 7)) - 1);
  const next = total + monthsOf[frequency] * Math.max(1, interval);
  const year = Math.floor(next / 12);
  const month = (next % 12) + 1;
  return `${year}-${pad(month)}-${pad(Math.min(anchorDay, daysInMonth(year, month)))}`;
}

/** Las `n` primeras fechas a partir de `from` (incluida), respetando el día de inicio original. */
export function upcomingDates(
  from: string,
  n: number,
  frequency: Frequency,
  interval = 1,
  options: {
    anchorDay?: number;
    endDate?: string | null;
    maxOccurrences?: number | null;
    done?: number;
  } = {},
) {
  const anchor = options.anchorDay ?? Number(from.slice(8, 10));
  const result: string[] = [];
  let current = from;
  let done = options.done ?? 0;
  while (result.length < n) {
    if (options.endDate && current > options.endDate) break;
    if (options.maxOccurrences != null && done >= options.maxOccurrences) break;
    result.push(current);
    done++;
    current = nextOccurrence(current, frequency, interval, anchor);
  }
  return result;
}

/** La recurrencia termina cuando la siguiente fecha supera el fin o se alcanza el máximo. */
export function isFinished(
  nextDate: string,
  done: number,
  endDate?: string | null,
  maxOccurrences?: number | null,
) {
  return (maxOccurrences != null && done >= maxOccurrences) || (!!endDate && nextDate > endDate);
}

export const recurringVariables = [
  'cliente',
  'numero',
  'importe',
  'fecha',
  'vencimiento',
  'empresa',
] as const;
/** Sustituye {variable}. Las variables desconocidas se dejan tal cual. */
export function renderText(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (all, key: string) => (key in vars ? vars[key] : all));
}

export function addDays(date: string, days: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
