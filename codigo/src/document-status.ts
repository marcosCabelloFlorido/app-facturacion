import { labels, type FinancialDocument } from '../shared/domain';
import type { DocumentListItem } from '../shared/document-list';

export function getSalesWorkflowAction(doc: DocumentListItem) {
  if (doc.kind !== 'invoice' && doc.kind !== 'credit') return null;
  if ('workingDraft' in doc) return { type: 'edit', label: 'Continuar borrador' } as const;
  if (doc.status === 'draft')
    return {
      type: 'issue',
      label: doc.kind === 'credit' ? 'Emitir rectificativa' : 'Emitir factura',
    } as const;
  if (doc.status === 'issued' && Number(doc.balance) > 0)
    return {
      type: 'payment',
      label: doc.kind === 'credit' ? 'Registrar devolución' : 'Registrar cobro',
    } as const;
  return null;
}

export type StatusDocument = Pick<
  FinancialDocument,
  'status' | 'kind' | 'balance' | 'total' | 'due_date'
>;

export function getDocumentStatus(doc: StatusDocument) {
  const settled = ['issued', 'recorded'].includes(doc.status) && Number(doc.balance) === 0;
  let text = labels[doc.status] || doc.status;
  let type = '';
  if (['issued', 'recorded'].includes(doc.status)) {
    if (settled) {
      text = doc.kind === 'invoice' ? 'Cobrada' : doc.kind === 'credit' ? 'Devuelta' : 'Pagada';
      type = 'solid';
    } else if (doc.due_date < new Date().toLocaleDateString('en-CA')) {
      text = 'Vencida';
      type = 'overdue';
    } else if (Number(doc.balance) < Number(doc.total)) text = 'Parcial';
    else text = 'Pendiente';
  }
  if (
    doc.kind === 'quote' &&
    doc.status === 'sent' &&
    doc.due_date < new Date().toLocaleDateString('en-CA')
  ) {
    text = 'Caducado';
    type = 'overdue';
  }
  if (doc.status === 'accepted') type = 'solid';
  return { text, type, settled };
}

export function getDocumentListStatus(doc: StatusDocument): string {
  return getDocumentStatus(doc).text;
}

export function getPurchaseWorkflowAction(doc: DocumentListItem) {
  if (
    doc.kind !== 'purchase' &&
    !(doc.kind === 'credit' && 'credit_side' in doc && doc.credit_side === 'purchase')
  )
    return null;
  if ('workingDraft' in doc) return { type: 'edit', label: 'Continuar borrador' } as const;
  if (doc.status === 'draft')
    return {
      type: 'issue',
      label: doc.kind === 'credit' ? 'Contabilizar abono' : 'Contabilizar compra',
    } as const;
  if (['issued', 'recorded'].includes(doc.status) && Number(doc.balance) > 0)
    return {
      type: 'payment',
      label: doc.kind === 'credit' ? 'Registrar devolución' : 'Registrar pago',
    } as const;
  return null;
}
