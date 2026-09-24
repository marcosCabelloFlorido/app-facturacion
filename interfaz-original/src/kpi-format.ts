const integer = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const currency = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatKpiValue(value: string | number, money = false) {
  return (money ? currency : integer).format(Number(value));
}
