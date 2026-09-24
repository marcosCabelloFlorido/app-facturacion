import type { KpiComparison } from '../shared/kpi-comparisons';
const money = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
const date = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
export function formatKpiComparison(c: KpiComparison) {
  const label = c.period === 'month' ? 'Mes anterior' : 'Año anterior';
  const change =
    c.percent === null
      ? 'Sin base porcentual'
      : Number(c.percent) === 0
        ? 'Sin cambios'
        : Math.abs(Number(c.percent)) < 0.05
          ? (Number(c.percent) > 0 ? 'Sube' : 'Baja') + ' <0,1 %'
          : percent.format(Number(c.percent)) + ' %';
  const end = date.format(new Date(c.to + 'T12:00:00Z'));
  const range = c.from
    ? c.from === c.to
      ? end
      : Number(c.from.slice(8)) + '–' + end
    : 'Al ' + end;
  return { change: label + ': ' + change, detail: range + ' · ' + money.format(Number(c.value)) };
}
