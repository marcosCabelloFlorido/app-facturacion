import { useEffect, useState } from 'react';
import { api } from './api';
import { RecordNavigation } from './RecordNavigation';
import { useSelectedContact } from './useSelectedContact';
import { documentRecordHref } from './record-navigation';
import { contactActivityRoute } from './contact-activity';
import { contactActivityViews, type ContactActivity } from '../shared/contacts';
import { readContactActivityFilters } from '../shared/contact-activity-filters';

type Neighbours = { position: number | null; count: number; previous?: string; next?: string };

export function ContactDocumentNavigation({
  id,
  from,
  view,
  entry,
}: {
  id: string;
  from: string;
  view: string;
  entry: string | null;
}) {
  const [retry, setRetry] = useState(0);
  const reference = new URLSearchParams(from.split('?')[1]).get('contact') || '';
  const contact = useSelectedContact(reference, retry);
  const [state, setState] = useState<Neighbours & { loading: boolean; error: string }>({
    position: null,
    count: 0,
    loading: true,
    error: '',
  });
  const contactId = contact.contact?.id;
  useEffect(() => {
    if (!contactId) return;
    const controller = new AbortController();
    const params = new URLSearchParams(from.split('?')[1]);
    const activityView =
      contactActivityViews.find((value) => value === params.get('view')) || 'documents';
    const page = Math.max(1, Number(params.get('activityPage')) || 1);
    const search = params.get('activitySearch') || '';
    const filters = readContactActivityFilters(params);
    const request = (page: number) => {
      const query = new URLSearchParams({ view: activityView, page: String(page), search });
      for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
      return api<ContactActivity>('/contacts/' + contactId + '/activity?' + query, {
        signal: controller.signal,
      });
    };
    const rows = (data: ContactActivity) =>
      activityView === 'payments'
        ? data.payments.map((row) => ({ id: row.document_id, entry: row.id }))
        : data.documents.map((row) => ({ id: row.id, entry: undefined }));
    const href = (row: ReturnType<typeof rows>[number] | undefined, page: number) =>
      row
        ? documentRecordHref(
            row.id,
            contactActivityRoute(from, { view: activityView, page, search, filters }),
            view,
            row.entry,
          )
        : undefined;
    setState({ position: null, count: 0, loading: true, error: '' });
    (async () => {
      const data = await request(page);
      const current = rows(data);
      const index = current.findIndex((row) => row.id === id && (!entry || row.entry === entry));
      if (index < 0) return { position: null, count: data.count };
      const [before, after] = await Promise.all([
        index === 0 && page > 1 ? request(page - 1) : null,
        index === current.length - 1 && page * data.pageSize < data.count
          ? request(page + 1)
          : null,
      ]);
      return {
        position: (page - 1) * data.pageSize + index + 1,
        count: data.count,
        previous: before ? href(rows(before).at(-1), page - 1) : href(current[index - 1], page),
        next: after ? href(rows(after)[0], page + 1) : href(current[index + 1], page),
      };
    })()
      .then((data) => {
        if (!controller.signal.aborted) setState({ ...data, loading: false, error: '' });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setState({ position: null, count: 0, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [id, from, view, entry, contactId, retry]);
  const payments = new URLSearchParams(from.split('?')[1]).get('view') === 'payments';
  return (
    <RecordNavigation
      label={payments ? 'Movimiento' : 'Documento'}
      collection={payments ? 'movimientos' : 'documentos'}
      position={state.position}
      count={state.count}
      previous={state.previous}
      next={state.next}
      loading={contact.loading || (!contact.error && state.loading)}
      error={contact.error || state.error}
      onRetry={() => setRetry((v) => v + 1)}
    />
  );
}
