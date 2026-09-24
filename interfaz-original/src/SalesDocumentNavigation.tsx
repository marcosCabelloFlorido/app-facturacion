import { useState } from 'react';
import { useRemote } from './components';
import type { DocumentList } from '../shared/document-list';
import { workingDraftRoute } from '../shared/document-list';
import { documentRecordHref } from './record-navigation';
import { RecordNavigation } from './RecordNavigation';

export function SalesDocumentNavigation({
  id,
  from,
  section = 'sales',
  returnTo = from,
  view = 'summary',
}: {
  id: string;
  from: string;
  returnTo?: string;
  view?: string;
  section?: 'sales' | 'purchases' | 'quotes';
}) {
  const [retry, setRetry] = useState(0);
  const query = new URLSearchParams(from.split('?')[1] || '');
  for (const key of ['view', 'highlight', 'phrase']) query.delete(key);
  const { data, loading, error } = useRemote<DocumentList>(
    '/' + section + '/document-neighbours/' + id + '?' + query,
    retry,
  );
  const index = data?.rows.findIndex((row) => row.id === id) ?? -1;
  const href = (offset: number) => {
    const row = index >= 0 ? data?.rows[index + offset] : undefined;
    if (!row) return undefined;
    return 'workingDraft' in row
      ? '#' + workingDraftRoute(row)
      : documentRecordHref(row.id, returnTo, view);
  };
  const label =
    section === 'quotes' ? 'Presupuesto' : section === 'purchases' ? 'Compra' : 'Factura';
  const collection =
    section === 'quotes' ? 'presupuestos' : section === 'purchases' ? 'compras' : 'facturas';
  return (
    <RecordNavigation
      variant="plain"
      label={label}
      collection={collection}
      position={data?.position}
      count={data?.count ?? 0}
      previous={href(-1)}
      next={href(1)}
      loading={loading}
      error={error}
      onRetry={() => setRetry((v) => v + 1)}
    />
  );
}
