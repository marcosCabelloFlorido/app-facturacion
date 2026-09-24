import { ContactHistoryExplorer } from './ContactHistoryExplorer';
import { DocumentStatusLabel } from './DocumentStatusLabel';
import { countAppliedFilters } from '../shared/filter-count';
import { MovementReference } from './MovementReference';
import { literalSearch } from '../shared/advanced-search';
import { openTableRow } from './row-navigation';
import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRight } from 'lucide-react';
import {
  contactActivityViews,
  type Contact,
  type ContactActivity,
  type ContactActivityView,
} from '../shared/contacts';
import { labels } from '../shared/domain';
import { euros, tableDate } from './api';
import { Badge, Empty, ErrorBox, Loading, PanelHeading, useRemote } from './components';
import { ContactPagination } from './ContactPicker';
import { ContactActivityFilters } from './ContactActivityFilters';
import {
  readContactActivityFilters,
  hasContactActivityFilters,
} from '../shared/contact-activity-filters';

import { ListToolbar } from './ListSearch';
import { HeaderListSearch } from './HeaderSearch';
import { createPortal } from 'react-dom';
import { contactDocumentTitle, contactActivityRoute } from './contact-activity';

export function ContactActivityPanel({
  contact,
  revision,
  returnTo,
  searchHost,
}: {
  contact: Contact;
  revision: number;
  returnTo: string;
  searchHost?: HTMLElement | null;
}) {
  const [view, setView] = useState<ContactActivityView>(() => {
    const initial = new URLSearchParams(window.location.hash.split('?')[1]).get('view');
    return contactActivityViews.find((value) => value === initial) || 'documents';
  });
  const [page, setPage] = useState(
    Number(new URLSearchParams(location.hash.split('?')[1]).get('activityPage')) || 1,
  );
  const [search, setSearch] = useState(
    () => new URLSearchParams(location.hash.split('?')[1]).get('activitySearch') || '',
  );
  const [query, setQuery] = useState(search);
  const [retry, setRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(() =>
    readContactActivityFilters(new URLSearchParams(location.hash.split('?')[1])),
  );
  const filterQuery = new URLSearchParams(Object.entries(filters).filter(([, value]) => !!value));
  const { data, loading, error } = useRemote<ContactActivity>(
    `/contacts/${contact.id}/activity?view=${view}&page=${page}&search=${encodeURIComponent(query)}&${filterQuery}`,
    revision + retry,
  );
  const [historyEntry] = useState(
    () => new URLSearchParams(location.hash.split('?')[1]).get('activityEntry') || '',
  );
  const route = contactActivityRoute(returnTo, {
    view,
    page,
    search: query,
    filters,
    entry: historyEntry,
  });
  useEffect(() => {
    history.replaceState(null, '', '#' + route);
  }, [route]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== query) {
        setQuery(search);
        setPage(1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, query]);
  const clearSearch = () => {
    setSearch('');
    setQuery('');
    setPage(1);
  };
  const changeView = (value: ContactActivityView) => {
    setView(value);
    setPage(1);
  };
  const documentHref = (id: string, entry?: string) =>
    '#document/' +
    id +
    '?from=' +
    encodeURIComponent(route) +
    (entry ? '&entry=' + encodeURIComponent(entry) : '');
  return (
    <>
      {searchHost &&
        createPortal(
          <HeaderListSearch
            key={view}
            scope="activity"
            label="Buscar en actividad"
            placeholder="Documento, referencia o petición…"
            value={query}
            onApply={(value) => {
              setFilters({ status: 'all' });
              setSearch(value);
              setQuery(value);
              setPage(1);
            }}
            onClear={clearSearch}
          />,
          searchHost,
        )}
      <section className="panel table-panel contact-activity-panel">
        <PanelHeading
          title="Actividad"
          action={
            <div className="contact-activity-tools">
              {!!data?.count && (
                <ContactHistoryExplorer
                  initialId={historyEntry}
                  data={data}
                  view={view}
                  route={route}
                  loading={loading || (!error && data.page !== page)}
                  error={error}
                  onPage={setPage}
                  onRetry={() => setRetry((value) => value + 1)}
                />
              )}
              <ListToolbar
                label="Herramientas de actividad"
                filterLabel="Filtrar actividad"

                filterCount={countAppliedFilters(
                  { view, ...filters },
                  { defaults: { view: 'documents' }, search: query, scope: 'activity' },
                )}
                filtersOpen={filtersOpen}
                onOpenFilters={() => {
                  setFiltersOpen(true);
                }}
              />
            </div>
          }
        />
        <p className="sr-only" role="status">
          {!loading && !error && data ? `${data.count} resultados` : ''}
        </p>
        {error ? (
          <div className="list-error">
            <ErrorBox>{error}</ErrorBox>
            <button className="button" onClick={() => setRetry((value) => value + 1)}>
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <Loading />
        ) : (
          data && (
            <>
              {!data.count ? (
                <Empty
                  showMessage={Boolean(query || hasContactActivityFilters(filters))}
                  title={
                    query || hasContactActivityFilters(filters)
                      ? 'No hay coincidencias'
                      : view === 'quotes_pending'
                        ? 'Sin presupuestos pendientes'
                        : view === 'payments'
                          ? 'Sin cobros ni pagos'
                          : view === 'funds'
                            ? 'Sin anticipos'
                            : 'Sin documentos'
                  }
                />
              ) : (
                <div className="table-scroll">
                  {view === 'payments' ? (
                    <table className="contact-activity-table">
                      <thead>
                        <tr>
                          <th>Movimiento</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                          <th className="numeric">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((payment) => {
                          const receipt =
                            payment.kind === 'invoice' ||
                            (payment.kind === 'credit' && payment.credit_side === 'purchase');
                          return (
                            <tr
                              key={payment.id}
                              className={`record-row${payment.reversed_at ? ' muted-row' : ''}`}
                              onClick={openTableRow}
                            >
                              <td>
                                <a
                                  className="document-link"
                                  href={documentHref(payment.document_id, payment.id)}
                                >
                                  {receipt ? (
                                    <ArrowDownLeft size={16} />
                                  ) : (
                                    <ArrowUpRight size={16} />
                                  )}
                                  <strong>{payment.number}</strong>
                                </a>
                                <small>
                                  {labels[payment.method]}
                                  <MovementReference
                                    value={payment.reference}
                                    as="span"
                                    prefix=" · "
                                  />
                                </small>
                              </td>
                              <td>{tableDate(payment.date)}</td>
                              <td>
                                <DocumentStatusLabel
                                  status={
                                    payment.reversed_at ? 'Revertido' : receipt ? 'Cobro' : 'Pago'
                                  }
                                />
                              </td>
                              <td className="numeric total-cell">
                                {receipt ? '+' : '−'}
                                {euros(payment.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : view === 'funds' ? (
                    <table className="contact-activity-table">
                      <thead>
                        <tr>
                          <th>Anticipo</th>
                          <th>Fecha</th>
                          <th className="numeric">Importe</th>
                          <th className="numeric">Disponible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.funds.map((fund) => (
                          <tr key={fund.id} id={'contact-activity-' + fund.id} tabIndex={-1}>
                            <td>
                              <strong>
                                {fund.direction === 'receipt' ? 'Recibido' : 'Entregado'}
                              </strong>
                              <small>
                                {labels[fund.method]}
                                <MovementReference value={fund.reference} as="span" prefix=" · " />
                              </small>
                            </td>
                            <td>{tableDate(fund.date)}</td>
                            <td className="numeric" data-label="Importe">
                              {euros(fund.amount)}
                            </td>
                            <td className="numeric total-cell" data-label="Disponible">
                              {euros(fund.available)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="contact-activity-table">
                      <thead>
                        <tr>
                          <th>Documento</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                          <th className="numeric">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.documents.map((doc) => (
                          <tr key={doc.id} className="record-row" onClick={openTableRow}>
                            <td>
                              <a className="document-link" href={documentHref(doc.id)}>
                                <strong>{contactDocumentTitle(doc)}</strong>
                              </a>
                              <small>
                                {doc.kind === 'credit' && doc.credit_side === 'purchase'
                                  ? labels.purchase_credit
                                  : labels[doc.kind]}
                              </small>
                            </td>
                            <td>{tableDate(doc.date)}</td>
                            <td>
                              {doc.status === 'converted' && doc.convertedInvoice ? (
                                <details className="contact-document-relation">
                                  <summary
                                    aria-label={`Ver factura generada desde ${doc.number || 'este presupuesto'}`}
                                  >
                                    <Badge doc={doc} />
                                  </summary>
                                  <a
                                    className="contact-converted-link"
                                    href={documentHref(doc.convertedInvoice.id)}
                                  >
                                    <ArrowRight size={14} aria-hidden="true" />
                                    {doc.convertedInvoice.number || 'Abrir factura en borrador'}
                                  </a>
                                </details>
                              ) : (
                                <Badge doc={doc} />
                              )}
                            </td>
                            <td className="numeric total-cell">
                              {euros(doc.total)}
                              {['issued', 'recorded'].includes(doc.status) &&
                                Number(doc.balance) > 0 && (
                                  <small>Pendiente: {euros(doc.balance)}</small>
                                )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              <ContactPagination
                iconControls
                data={data}
                onPage={(value) => {
                  setPage(value);
                }}
              />
            </>
          )
        )}
      </section>
      {filtersOpen && (
        <ContactActivityFilters
          view={view}
          contactId={contact.id}
          filters={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(nextView, nextFilters) => {
            changeView(nextView);
            setSearch(literalSearch(query));
            setQuery(literalSearch(query));
            setFilters(nextFilters);
            setFiltersOpen(false);
          }}
        />
      )}
    </>
  );
}
