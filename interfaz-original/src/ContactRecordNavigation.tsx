import { useState } from 'react';
import { useRemote } from './components';
import { RecordNavigation } from './RecordNavigation';
import type { ContactPage } from '../shared/contacts';

export function ContactRecordNavigation({
  id,
  query,
  revision,
}: {
  id: string;
  query: string;
  revision: number;
}) {
  const [retry, setRetry] = useState(0);
  const { data, loading, error } = useRemote<ContactPage & { position: number | null }>(
    '/contacts?' + query + '&around=' + encodeURIComponent(id),
    revision + retry,
  );
  const index = data?.rows.findIndex((row) => row.id === id) ?? -1;
  const href = (offset: number) => {
    const row = index >= 0 ? data?.rows[index + offset] : undefined;
    if (!row) return undefined;
    const params = new URLSearchParams(query);
    params.set('contact', row.id);
    params.set('kpis', 'hidden');
    return '#contacts?' + params;
  };
  return (
    <RecordNavigation
      label="Contacto"
      variant="plain"
      collection="clientes y proveedores"
      position={data?.position}
      count={data?.count ?? 0}
      previous={href(-1)}
      next={href(1)}
      loading={loading}
      error={error}
      onRetry={() => setRetry((value) => value + 1)}
    />
  );
}
