import { documentRecordHref } from './record-navigation';
import { useState } from 'react';
import { useRemote } from './components';
import { RecordNavigation } from './RecordNavigation';
import { euros, shortDate } from './api';
import type { Payment } from '../shared/domain';
import type { DueDateList } from '../shared/due-dates';
import { dueInstallmentLabel } from '../shared/due-dates';

export function PaymentRecordNavigation({
  id,
  from,
  entry,
  view,
}: {
  id: string;
  from: string;
  entry: string | null;
  view: string;
}) {
  const params = new URLSearchParams(from.split('?')[1]);
  return params.get('tab') === 'history' ? (
    <MovementNavigation key={id + from + entry} id={id} from={from} entry={entry} view={view} />
  ) : (
    <DueNavigation key={id + from + entry} id={id} from={from} entry={entry} view={view} />
  );
}
function MovementNavigation({
  id,
  from,
  entry,
  view,
}: {
  id: string;
  from: string;
  entry: string | null;
  view: string;
}) {
  const [retry, setRetry] = useState(0);
  const params = new URLSearchParams(from.split('?')[1]);
  const { data, loading, error } = useRemote<Payment[]>(
    '/payments?search=' + encodeURIComponent(params.get('search') || ''),
    retry,
  );
  const index = data?.findIndex((row) => (entry ? row.id === entry : row.document_id === id)) ?? -1;
  const row = index >= 0 ? data?.[index] : undefined;
  const href = (offset: number) => {
    const item = index >= 0 ? data?.[index + offset] : undefined;
    return item ? documentRecordHref(item.document_id, from, view, item.id) : undefined;
  };
  return (
    <RecordNavigation
      variant="plain"
      label="Movimiento"
      collection="movimientos"
      position={index < 0 ? null : index + 1}
      count={data?.length ?? 0}
      previous={href(-1)}
      next={href(1)}
      loading={loading}
      error={error}
      onRetry={() => setRetry((v) => v + 1)}
      context={
        row
          ? shortDate(row.date) +
            ' · ' +
            euros(row.amount) +
            (row.reversed_at ? ' · Revertido' : '')
          : undefined
      }
    />
  );
}
function DueNavigation({
  id,
  from,
  entry,
  view,
}: {
  id: string;
  from: string;
  entry: string | null;
  view: string;
}) {
  const [retry, setRetry] = useState(0);
  const params = new URLSearchParams(from.split('?')[1]);
  params.set('around', entry || id);
  const { data, loading, error } = useRemote<DueDateList & { navigationPosition: number | null }>(
    '/due-dates?' + params,
    retry,
  );
  const index =
    data?.rows.findIndex((row) =>
      entry ? row.document_id + ':' + row.position === entry : row.document_id === id,
    ) ?? -1;
  const current = index >= 0 ? data?.rows[index] : undefined;
  const href = (offset: number) => {
    const row = index >= 0 ? data?.rows[index + offset] : undefined;
    return row
      ? documentRecordHref(row.document_id, from, view, row.document_id + ':' + row.position)
      : undefined;
  };
  return (
    <RecordNavigation
      variant="plain"
      label="Vencimiento"
      collection="vencimientos"
      position={data?.navigationPosition}
      count={data?.count ?? 0}
      previous={href(-1)}
      next={href(1)}
      loading={loading}
      error={error}
      onRetry={() => setRetry((v) => v + 1)}
      context={
        current
          ? [dueInstallmentLabel(current), shortDate(current.due_date), euros(current.balance)]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
    />
  );
}
