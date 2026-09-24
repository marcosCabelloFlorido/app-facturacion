import { dateSchema, type DocumentInput } from '../shared/domain';
import { plusDays, today } from './api';

export const invoicePaymentTerms = [0, 15, 30, 60] as const;

/** Refresh an editable invoice without moving a custom due date. */
export function invoiceWithSystemDate(input: DocumentInput, systemDate = today()): DocumentInput {
  if (input.kind !== 'invoice' || input.date === systemDate) return input;
  const term = dateSchema.safeParse(input.date).success
    ? invoicePaymentTerms.find((days) => input.dueDate === plusDays(input.date, days))
    : undefined;
  return {
    ...input,
    date: systemDate,
    ...(term === undefined ? {} : { dueDate: plusDays(systemDate, term) }),
  };
}
