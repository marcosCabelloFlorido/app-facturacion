import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { dateSchema, type DocumentInput } from './domain';
import { contactTaxIdSchema } from './contacts';
import { documentDateRangeSchema, documentSortValues } from './document-list';

const filterDate = dateSchema.refine((value) => value >= '0001-01-01', 'Fecha inválida');
const amount = z
  .string()
  .trim()
  .transform((value) => value.replace(',', '.'))
  .pipe(
    z.string().regex(/^\d{1,18}(\.\d{1,2})?$/, 'Usa un importe desde 0, con hasta 2 decimales.'),
  );
export const advancedSalesSchema = z
  .object({
    dueFrom: filterDate.optional(),
    dueTo: filterDate.optional(),
    minTotal: amount.optional(),
    maxTotal: amount.optional(),
  })
  .refine((v) => !v.dueFrom || !v.dueTo || v.dueFrom <= v.dueTo, {
    path: ['dueTo'],
    message: 'El vencimiento final debe ser igual o posterior al inicial.',
  })
  .refine(
    (v) => {
      if (!v.minTotal || !v.maxTotal) return true;
      try {
        return new Decimal(v.minTotal).lte(v.maxTotal);
      } catch {
        return false;
      }
    },
    {
      path: ['maxTotal'],
      message: 'El importe máximo debe ser igual o mayor al mínimo.',
    },
  );
export type AdvancedSalesFilters = z.infer<typeof advancedSalesSchema>;
export const documentQuerySchema = z
  .object({
    kind: z.enum(['invoice', 'quote', 'purchase', 'credit', 'sales']).optional(),
    search: z.string().max(150).default(''),
    status: z.string().max(30).default('all'),
    customer: contactTaxIdSchema.optional(),
    includeWorkingDrafts: z.literal('1').optional(),
    sort: z.enum(documentSortValues).default('default'),
    metric: z
      .enum(['month', 'pending', 'overdue', 'draft', 'sent', 'accepted', 'expired'])
      .optional(),
    asOf: filterDate.optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .and(documentDateRangeSchema)
  .and(advancedSalesSchema);
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
export type SalesListSummary = {
  total: string;
  payable?: string;
  purchaseRefunds?: string;
  receivable: string;
  refunds: string;
  drafts: number;
  unknown: number;
};
export type CustomerHistory = {
  pending: string;
  overdue: string;
  invoiceCount: number;
  recent: {
    id: string;
    number: string | null;
    date: string;
    dueDate: string;
    total: string;
    lines: DocumentInput['lines'];
  }[];
};
export const salesSortOptions = [
  ['default', 'Más recientes'],
  ['date_asc', 'Emisión más antigua'],
  ['due_asc', 'Vencimiento más cercano'],
  ['due_desc', 'Vencimiento más lejano'],
  ['total_desc', 'Precio: de mayor a menor'],
  ['total_asc', 'Precio: de menor a mayor'],
  ['balance_desc', 'Mayor pendiente'],
  ['balance_asc', 'Menor pendiente'],
];
export function datePreset(preset: string, anchor: string) {
  const date = new Date(anchor + 'T12:00:00Z');
  if (Number.isNaN(date.getTime())) return {};
  const y = date.getUTCFullYear(),
    m = date.getUTCMonth();
  const iso = (year: number, month: number, day: number) =>
    new Date(Date.UTC(year, month, day, 12)).toISOString().slice(0, 10);
  if (preset === 'today') return { from: anchor, to: anchor };
  if (preset === 'month') return { from: iso(y, m, 1), to: iso(y, m + 1, 0) };
  if (preset === 'previous') return { from: iso(y, m - 1, 1), to: iso(y, m, 0) };
  if (preset === 'quarter')
    return { from: iso(y, Math.floor(m / 3) * 3, 1), to: iso(y, Math.floor(m / 3) * 3 + 3, 0) };
  if (preset === 'year') return { from: iso(y, 0, 1), to: iso(y, 11, 31) };
  return {};
}
export function salesQueryParams(query: Partial<DocumentQuery>) {
  return new URLSearchParams(
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)]),
  );
}
