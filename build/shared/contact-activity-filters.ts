import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { contactActivityViews, type ContactActivityView } from './contacts';
import { documentDateRangeSchema } from './document-list';
import { advancedSalesSchema } from './sales-tools';

export const contactActivityStatusOptions = (view: ContactActivityView): string[][] => {
  if (view === 'payments')
    return [
      ['all', 'Todos'],
      ['receipt', 'Cobros'],
      ['payment', 'Pagos'],
      ['reversed', 'Revertidos'],
    ];
  if (view === 'funds')
    return [
      ['all', 'Todos'],
      ['available', 'Con disponible'],
      ['partial', 'Parcialmente aplicados'],
      ['used', 'Sin disponible'],
    ];
  const quotes = [
    ['sent', 'Confirmados'],
    ['accepted', 'Aceptados'],
    ['rejected', 'Rechazados'],
    ['converted', 'Convertidos'],
    ['expired', 'Caducados'],
  ];
  if (view === 'quote' || view === 'quotes_pending')
    return [['all', 'Todos'], ['draft', 'Borradores'], ...quotes];
  return [
    ['all', 'Todos'],
    ['draft', 'Borradores'],
    ['pending', 'Pendientes'],
    ['partial', 'Parciales'],
    ['overdue', 'Vencidos'],
    [
      'paid',
      view === 'invoice'
        ? 'Cobradas'
        : view === 'purchase'
          ? 'Pagadas'
          : view === 'credit'
            ? 'Devueltas'
            : 'Cobrados, pagados o devueltos',
    ],
    ...(view === 'documents' ? quotes : []),
  ];
};
export const contactActivityFiltersSchema = z
  .object({
    status: z.string().max(30).default('all'),
    minTotal: advancedSalesSchema.shape.minTotal,
    maxTotal: advancedSalesSchema.shape.maxTotal,
  })
  .and(documentDateRangeSchema)
  .superRefine((value, ctx) => {
    if (
      !value.minTotal ||
      !value.maxTotal ||
      !/^\d+(\.\d{1,2})?$/.test(value.minTotal) ||
      !/^\d+(\.\d{1,2})?$/.test(value.maxTotal)
    )
      return;
    if (new Decimal(value.minTotal).gt(value.maxTotal))
      ctx.addIssue({
        code: 'custom',
        path: ['maxTotal'],
        message: 'El importe máximo debe ser igual o mayor al mínimo.',
      });
  });
export type ContactActivityFilters = z.infer<typeof contactActivityFiltersSchema>;
export const contactActivityQuerySchema = z
  .object({
    view: z.enum(contactActivityViews).default('documents'),
    search: z.string().trim().max(150).default(''),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .and(contactActivityFiltersSchema)
  .superRefine((value, ctx) => {
    if (!contactActivityStatusOptions(value.view).some(([status]) => status === value.status))
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: 'El estado no corresponde a los documentos o movimientos seleccionados.',
      });
  });
export const contactActivityFilterKeys = {
  status: 'activityStatus',
  minTotal: 'activityMinTotal',
  maxTotal: 'activityMaxTotal',
  from: 'activityFrom',
  to: 'activityTo',
} as const;
export function readContactActivityFilters(params: URLSearchParams): ContactActivityFilters {
  return {
    status: 'all',
    ...Object.fromEntries(
      Object.entries(contactActivityFilterKeys).flatMap(([key, routeKey]) =>
        params.get(routeKey) ? [[key, params.get(routeKey)!]] : [],
      ),
    ),
  };
}
export function hasContactActivityFilters(filters: ContactActivityFilters) {
  return Object.entries(filters).some(
    ([key, value]) => !!value && !(key === 'status' && value === 'all'),
  );
}
