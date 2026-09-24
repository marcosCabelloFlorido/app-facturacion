import type { FinancialDocument } from '../shared/domain';
import { getDocumentStatus } from './document-status';

export function documentDeadlineLabel(doc: FinancialDocument, currentDate: string): string {
  const state = getDocumentStatus(doc);
  if (
    state.settled ||
    (doc.kind === 'quote' && ['accepted', 'rejected', 'converted'].includes(doc.status))
  )
    return state.text;
  if (!doc.due_date) return 'Sin vencimiento';
  const days = Math.round(
    (Date.parse(doc.due_date.slice(0, 10) + 'T00:00:00Z') -
      Date.parse(currentDate + 'T00:00:00Z')) /
      86400000,
  );
  if (!Number.isFinite(days)) return 'Sin vencimiento';
  const action =
    doc.kind === 'quote'
      ? 'para aceptar el presupuesto'
      : doc.kind === 'credit'
        ? 'para realizar la devolución'
        : 'para pagar';
  if (days === 0)
    return doc.kind === 'quote'
      ? 'El presupuesto caduca hoy'
      : doc.kind === 'credit'
        ? 'La devolución vence hoy'
        : 'El plazo para pagar vence hoy';
  if (days < 0) return 'El plazo venció hace ' + Math.abs(days) + (days === -1 ? ' día' : ' días');
  return (days === 1 ? 'Queda 1 día' : 'Quedan ' + days + ' días') + ' ' + action;
}
