import { z } from 'zod';
import { dateSchema, type DocumentInput, type FinancialDocument } from './domain';

const filterDate = dateSchema.refine((value) => value >= '0001-01-01', 'Fecha inválida');
export const documentDateRangeSchema = z
  .object({ from: filterDate.optional(), to: filterDate.optional() })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: 'La fecha hasta debe ser igual o posterior a la fecha desde.',
    path: ['to'],
  });
export type DocumentDateRange = z.infer<typeof documentDateRangeSchema>;
export type DocumentCustomer = { taxId: string; name: string };

export const documentSortValues = [
  'default',
  'due_desc',
  'due_asc',
  'date_asc',
  'total_desc',
  'total_asc',
  'balance_desc',
  'balance_asc',
] as const;
export type DocumentSort = (typeof documentSortValues)[number];

export type WorkingDraftListItem = Pick<
  FinancialDocument,
  'id' | 'kind' | 'number' | 'party' | 'reference' | 'date' | 'due_date' | 'balance'
> & {
  status: 'draft';
  total: string | null;
  lines: Pick<DocumentInput['lines'][number], 'description'>[];
  workingDraft: { resourceKey: string; version: number; step: number };
};

export type DocumentListItem = FinancialDocument | WorkingDraftListItem;
export type DocumentList = {
  rows: DocumentListItem[];
  count: number;
  page: number;
  pageSize: number;
  position?: number | null;
  summary?: import('./sales-tools').SalesListSummary;
};

export function workingDraftRoute(draft: WorkingDraftListItem) {
  const key = draft.workingDraft.resourceKey;
  return (
    (key.startsWith('edit:') ? 'edit/' + key.split(':')[1] : 'new/' + draft.kind) +
    '?work=' +
    encodeURIComponent(key)
  );
}
