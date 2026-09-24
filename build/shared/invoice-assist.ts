import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { calculate, lineSchema, type DocumentInput, type LineInput } from './domain';
import type { CustomerHistory } from './sales-tools';

export function reuseInvoiceLines(current: LineInput[], source: LineInput[]): LineInput[] {
  const copied = z.array(lineSchema).min(1).max(100).parse(source);
  const blank = current.every(
    (l) =>
      !l.description.trim() &&
      l.quantity === '1' &&
      l.unitPrice === '0' &&
      l.discount === '0' &&
      l.taxRate === '21' &&
      !l.exemptionReason,
  );
  const lines = blank ? copied : [...current, ...copied];
  if (lines.length > 100)
    throw new Error(
      'La factura admite hasta 100 conceptos. Elimina algunos antes de reutilizar otros.',
    );
  return lines;
}
export function invoiceHints(data: DocumentInput, history: CustomerHistory, currentId?: string) {
  const free = data.lines.filter(
    (l) => l.description.trim() && /^0+(?:[.,]0+)?$/.test(l.unitPrice),
  ).length;
  let duplicate: CustomerHistory['recent'][number] | undefined;
  if (
    z.array(lineSchema).min(1).safeParse(data.lines).success &&
    z.enum(['0', '7', '15', '19']).safeParse(data.retentionRate).success
  ) {
    const total = calculate(data.lines, data.retentionRate).total;
    duplicate = history.recent.find(
      (d) => d.id !== currentId && d.date === data.date && new Decimal(d.total).eq(total),
    );
  }
  return { free, duplicate };
}
