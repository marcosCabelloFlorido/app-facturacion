export const dueSortValues = [
  'default',
  'due_desc',
  'due_asc',
  'balance_desc',
  'balance_asc',
] as const;
export type DueSort = (typeof dueSortValues)[number];
export function parseDueSort(value: string | null): DueSort {
  return dueSortValues.includes(value as DueSort) ? (value as DueSort) : 'default';
}

export type DueDirection = 'receivable' | 'payable';
export type DueStatus = 'all' | 'overdue' | 'upcoming';
export type DueDate = {
  document_id: string;
  number: string;
  party_name: string;
  party_tax_id?: string;
  position: number;
  installment_count: number;
  due_date: string;
  balance: string;
  direction: DueDirection;
};
export type DueSummary = { count: number; amount: string; receivable: string; payable: string };
export type DashboardDues = { as_of: string; overdue: DueSummary; upcoming: DueDate[] };
export type DueDateList = DueSummary & {
  as_of: string;
  rows: DueDate[];
  page: number;
  pageSize: number;
};
export function dueDateLabel(date: string, asOf: string) {
  if (date === asOf) return 'Hoy';
  const next = new Date(asOf + 'T12:00:00Z');
  next.setUTCDate(next.getUTCDate() + 1);
  if (date === next.toISOString().slice(0, 10)) return 'Mañana';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    ...(date.slice(0, 4) !== asOf.slice(0, 4) ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));
}
export const dueDirectionLabel = (direction: DueDirection) =>
  direction === 'receivable' ? 'Por cobrar' : 'Por pagar';
export const dueInstallmentLabel = (due: Pick<DueDate, 'position' | 'installment_count'>) =>
  due.installment_count > 1 ? `Plazo ${due.position + 1} de ${due.installment_count}` : '';
export function paymentReturnRoute(from: string | null | undefined) {
  return from && /^(overview(?:\/analysis)?|payments|contacts(?:\?[^#]*)?)$/.test(from)
    ? from
    : undefined;
}
export function dueDateRoute(
  status: DueStatus = 'all',
  direction: DueDirection | 'all' = 'all',
  page = 1,
  search = '',
  sort: DueSort = 'default',
  from?: string,
) {
  return `payments?tab=pending&status=${status}&direction=${direction}&page=${page}${search ? '&search=' + encodeURIComponent(search) : ''}${sort !== 'default' ? '&sort=' + sort : ''}${paymentReturnRoute(from) ? '&from=' + encodeURIComponent(from!) : ''}`;
}
export function documentReturnRoute(from: string | null, fallback: string) {
  return from &&
    /^(overview(?:\/(?:revenue|expenses|quotes|payable|analysis))?|payments|sales|purchases|quotes|contacts|catalog|accounting|document\/[0-9a-f-]{36})(\?[^#]*)?$/.test(
      from,
    )
    ? from
    : fallback;
}
