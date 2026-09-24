import type { ContactActivityView } from '../shared/contacts.ts';
import { documentMetricCondition } from './module-kpis.ts';

/** Shared by the activity list and its unfiltered amount scale. */
export function contactDocumentScope(view: ContactActivityView) {
  const scopes: Partial<Record<ContactActivityView, string>> = {
    quotes_pending: `d.kind='quote' AND ${documentMetricCondition('quote', 'sent', 'CURRENT_DATE')}`,
    sales_net:
      "d.status IN ('issued','recorded') AND (d.kind='invoice' OR (d.kind='credit' AND d.credit_side='sale'))",
    purchases_net:
      "d.status IN ('issued','recorded') AND (d.kind='purchase' OR (d.kind='credit' AND d.credit_side='purchase'))",
    receivable:
      "d.status IN ('issued','recorded') AND d.balance>0 AND (d.kind='invoice' OR (d.kind='credit' AND d.credit_side='purchase'))",
    payable:
      "d.status IN ('issued','recorded') AND d.balance>0 AND (d.kind='purchase' OR (d.kind='credit' AND d.credit_side='sale'))",
  };
  return view === 'documents' ? 'TRUE' : scopes[view] || `d.kind='${view}'`;
}
