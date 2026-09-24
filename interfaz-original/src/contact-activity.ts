import type {
  Contact,
  ContactActivity,
  ContactActivityView,
  ContactDocument,
} from '../shared/contacts';
import { labels } from '../shared/domain';
import {
  contactActivityFilterKeys,
  type ContactActivityFilters,
} from '../shared/contact-activity-filters';

export const contactActivityLabels: Record<ContactActivityView, string> = {
  sales_net: 'Facturado neto',
  purchases_net: 'Compras netas',
  receivable: 'Pendiente de cobro',
  payable: 'Pendiente de pago',
  documents: 'Todos los documentos',
  invoice: 'Facturas',
  quote: 'Presupuestos',
  quotes_pending: 'Presupuestos pendientes',
  purchase: 'Compras',
  credit: 'Rectificativas',
  payments: 'Cobros y pagos',
  funds: 'Anticipos',
};

export function contactActivityIndicators(
  type: Contact['type'],
  summary: ContactActivity['summary'],
) {
  const supplier = type === 'supplier';
  const items: { view: ContactActivityView; value: string | number; money: boolean }[] = [
    {
      view: supplier ? 'purchases_net' : 'sales_net',
      value: supplier ? summary.purchases : summary.sales,
      money: true,
    },
  ];
  // Keep an outstanding refund visible even when it is opposite to the contact's usual role.
  if (!supplier || Number(summary.receivable) > 0)
    items.push({ view: 'receivable', value: summary.receivable, money: true });
  if (type !== 'customer' || Number(summary.payable) > 0)
    items.push({ view: 'payable', value: summary.payable, money: true });
  if (!supplier || summary.pendingQuotes > 0)
    items.push({ view: 'quotes_pending', value: summary.pendingQuotes, money: false });
  return items;
}

export function contactDocumentTitle(
  doc: Pick<ContactDocument, 'number' | 'description' | 'reference' | 'kind'>,
) {
  return (
    doc.number ||
    doc.description.trim() ||
    doc.reference.trim() ||
    `${labels[doc.kind]} sin concepto`
  );
}

export function contactActivityRoute(
  returnTo: string,
  state: {
    view: ContactActivityView;
    page: number;
    search: string;
    filters?: ContactActivityFilters;
    entry?: string;
  },
) {
  const params = new URLSearchParams(returnTo.split('?')[1]);
  if (state.entry) params.set('activityEntry', state.entry);
  params.set('view', state.view);
  params.set('activityPage', String(state.page));
  if (state.search) params.set('activitySearch', state.search);
  else params.delete('activitySearch');
  for (const [key, routeKey] of Object.entries(contactActivityFilterKeys)) {
    const value = state.filters?.[key as keyof ContactActivityFilters];
    if (value && !(key === 'status' && value === 'all')) params.set(routeKey, value);
    else params.delete(routeKey);
  }
  return 'contacts?' + params.toString();
}
