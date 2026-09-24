import type { DocumentListItem } from '../shared/document-list';
export type QuoteAction = 'edit' | 'issue' | 'accept' | 'reject' | 'convert' | 'invoice';
export function quoteActions(doc: DocumentListItem, asOf: string): QuoteAction[] {
  if (doc.kind !== 'quote') return [];
  if ('workingDraft' in doc) return ['edit'];
  if (doc.status === 'draft') return ['edit', 'issue'];
  if (doc.status === 'sent') return doc.due_date < asOf ? ['reject'] : ['accept', 'reject'];
  if (doc.status === 'accepted') return ['convert'];
  if (doc.status === 'converted' && doc.converted_id) return ['invoice'];
  return [];
}
