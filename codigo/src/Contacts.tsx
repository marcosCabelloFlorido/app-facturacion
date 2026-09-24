import { DocumentStatusLabel } from './DocumentStatusLabel';
import { openTableRow } from './row-navigation';
import { countAppliedFilters } from '../shared/filter-count';
import {
  searchDisplay,
  decodeSearch,
  encodeSearch,
  literalSearch,
} from '../shared/advanced-search';
import { documentReturnRoute } from '../shared/due-dates';
import { useEffect, useRef, useState } from 'react';
import { Archive, ContactRound, Plus, RotateCcw } from 'lucide-react';
import { Select } from './Select';
import type { PageActions } from './ActionsMenu';
import { contactLabels, type Contact, type ContactPage } from '../shared/contacts';
import { ContactActions } from './ContactActions';
import { ContactRecordNavigation } from './ContactRecordNavigation';
import { contactSortOptions, contactSortSchema, type ContactSort } from '../shared/contact-tools';
import { api, navigate, shortDate } from './api';
import {
  Empty,
  ErrorBox,
  Field,
  Loading,
  Modal,
  PageHeading,
  useRemote,
  type Notify,
} from './components';
import { ContactForm, ContactPagination, ContactPicker } from './ContactPicker';
import { ContactActivityPanel } from './ContactActivity';
import { contactActivityFilterKeys } from '../shared/contact-activity-filters';
import { useSelectedContact } from './useSelectedContact';
import { ListToolbar } from './ListSearch';
import { HeaderListSearch } from './HeaderSearch';
import './contacts.css';
import { KpiFilter, RemoteModuleKpis, useListRoute } from './ModuleKpis';

export function Contacts({ notify, readonly }: { notify: Notify; readonly: boolean }) {
  const [initial] = useState(() => new URLSearchParams(window.location.hash.split('?')[1]));
  const [showKpis, setShowKpis] = useState(
    !initial.get('contact') &&
      initial.get('kpis') !== 'hidden' &&
      !initial.get('metric') &&
      initial.get('directory') !== '1',
  );
  const origin = documentReturnRoute(initial.get('from'), '');
  const [search, setSearch] = useState(initial.get('search') || '');
  const [type, setType] = useState(initial.get('type') || 'all');
  const [status, setStatus] = useState(initial.get('status') || 'active');
  const [metric, setMetric] = useState(initial.get('metric') || '');
  const [sort, setSort] = useState<ContactSort>(() =>
    contactSortSchema.catch('name_asc').parse(initial.get('sort') || undefined),
  );
  const metricLabels: Record<string, string> = {
    customers: 'Clientes activos',
    suppliers: 'Proveedores activos',
    receivable: 'Contactos con saldo por cobrar',
    payable: 'Contactos con saldo por pagar',
  };
  const [page, setPage] = useState(Number(initial.get('page')) || 1);
  const [selectedId, setSelectedId] = useState(initial.get('contact') || '');
  const directoryTriggerRef = useRef<HTMLButtonElement>(null);
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  const lastSelectedIdRef = useRef(selectedId);
  const [activitySearchHost, setActivitySearchHost] = useState<HTMLDivElement | null>(null);
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState({ type, status, metric, search, sort });
  const draftHasFilters =
    filterDraft.sort !== 'name_asc' ||
    !!filterDraft.metric ||
    !!filterDraft.search ||
    filterDraft.type !== 'all' ||
    filterDraft.status !== 'all';
  const filterLabel = [
    metricLabels[filterDraft.metric] ||
      (filterDraft.type === 'customer'
        ? 'Clientes'
        : filterDraft.type === 'supplier'
          ? 'Proveedores'
          : 'Contactos'),
    filterDraft.search && `Búsqueda: ${searchDisplay(filterDraft.search)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newParty, setNewParty] = useState({ name: '', taxId: '', address: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const {
    data,
    loading,
    error: loadError,
  } = useRemote<ContactPage>(
    `/contacts?status=${status}&type=${type}&page=${page}&sort=${sort}&search=${encodeURIComponent(search)}${metric ? '&metric=' + metric : ''}`,
    revision,
  );
  const {
    contact: selected,
    loading: selectionLoading,
    error: selectionError,
  } = useSelectedContact(selectedId, revision);
  const showContact = !!selectedId;
  const currentFilters = { search, type, status, metric, sort, page };
  const routeFilters = currentFilters;
  const { metric: routeMetric, ...routeListFilters } = routeFilters;
  const routeParams = {
    ...routeListFilters,
    page: String(routeFilters.page),
    ...(routeMetric ? { metric: routeMetric } : {}),
  };
  const openDirectory = (kind?: 'customer' | 'supplier' | 'all') => {
    navigate(
      'contacts?' +
        new URLSearchParams({
          ...routeParams,
          kpis: 'hidden',
          directory: '1',
          ...(kind ? { type: kind, metric: '', search: '', page: '1' } : {}),
        }),
    );
  };
  const directoryActions: PageActions = [
    !readonly && {
      label: 'Añadir cliente o proveedor',
      group: 'Contacto',
      icon: Plus,
      onAction: () => create(),
    },
  ];
  useEffect(() => {
    if (!selectionLoading && selected?.id) {
      detailTitleRef.current?.focus({ preventScroll: true });
    }
  }, [selectionLoading, selected?.id]);
  const returnToDirectory = () => {
    setError('');
    openDirectory();
  };
  const hasFilters = !!metric || !!search || type !== 'all' || status !== 'all';
  const refresh = () => setRevision((value) => value + 1);
  const create = () => {
    setNewParty({ name: '', taxId: '', address: '', email: '' });
    setEditing('new');
  };
  const toggle = async (contact: Contact) => {
    setBusy(true);
    setError('');
    try {
      await api(`/contacts/${contact.id}/status`, {
        method: 'PUT',
        body: { active: !contact.active, version: contact.version },
      });
      setShowDetails(false);
      if (data?.rows.length === 1 && page > 1) setPage(page - 1);
      refresh();
      notify(
        contact.active
          ? 'Ficha archivada. Puedes recuperarla en Archivados.'
          : 'Ficha recuperada y disponible en los formularios.',
      );
    } catch (e) {
      setError((e as Error).message);
      refresh();
    } finally {
      setBusy(false);
    }
  };
  const returnTo =
    'contacts?' +
    new URLSearchParams({
      contact: selected?.id || '',
      ...(origin ? { from: origin } : {}),
      ...routeParams,
      kpis: 'hidden',
    }).toString();
  useListRoute(
    'contacts',
    {
      ...(origin ? { from: origin } : {}),
      ...routeParams,
      kpis: 'hidden',

      ...(selectedId ? { contact: selected?.id || selectedId } : {}),
      ...Object.fromEntries(
        Object.values(contactActivityFilterKeys).flatMap((key) => {
          const value = selectedId
            ? new URLSearchParams(location.hash.split('?')[1]).get(key)
            : null;
          return value ? [[key, value]] : [];
        }),
      ),
      ...(selectedId && new URLSearchParams(location.hash.split('?')[1]).get('view')
        ? { view: new URLSearchParams(location.hash.split('?')[1]).get('view')! }
        : {}),
      ...(selectedId && new URLSearchParams(location.hash.split('?')[1]).get('activitySearch')
        ? {
            activitySearch: new URLSearchParams(location.hash.split('?')[1]).get('activitySearch')!,
          }
        : {}),
      ...(selectedId && new URLSearchParams(location.hash.split('?')[1]).get('activityEntry')
        ? { activityEntry: new URLSearchParams(location.hash.split('?')[1]).get('activityEntry')! }
        : {}),
      ...(selectedId && new URLSearchParams(location.hash.split('?')[1]).get('activityPage')
        ? { activityPage: new URLSearchParams(location.hash.split('?')[1]).get('activityPage')! }
        : {}),
    },
    !showKpis,
  );
  const renderHeading = (menu: PageActions) => (
    <PageHeading
      title={selected?.name || 'Clientes y proveedores'}
      status={
        selected ? (
          <DocumentStatusLabel status={selected.active ? 'Activo' : 'Archivado'} />
        ) : undefined
      }
      backLink={
        showContact && origin
          ? {
              href: '#' + origin,
              label: origin.startsWith('document/')
                ? 'Documento'
                : origin.startsWith('payments')
                  ? 'Cobro'
                  : origin.startsWith('purchases')
                    ? 'Compra / gasto'
                    : origin.startsWith('quotes')
                      ? 'Presupuesto'
                      : 'Factura',
            }
          : showContact
            ? {
                href:
                  '#contacts?' +
                  new URLSearchParams({ ...routeParams, kpis: 'hidden', directory: '1' }),
                label: 'Clientes y proveedores',
              }
            : !showKpis
              ? { href: '#contacts', label: 'Clientes y proveedores' }
              : undefined
      }
      tools={showContact ? <div ref={setActivitySearchHost} /> : null}
      menu={menu}
    />
  );
  return (
    <>
      {/* FUENTE: 18-add-button.md, TeamModule.tsx:1679–1689; botón común de ventas y catálogo. */}
      {selected ? (
        <ContactActions
          key={selected.id}
          contact={selected}
          readonly={readonly}
          extraActions={directoryActions}
          onDetails={() => {
            setError('');
            setShowDetails(true);
          }}
          onSaved={() => {
            refresh();
            notify('Movimiento registrado.');
          }}
        >
          {renderHeading}
        </ContactActions>
      ) : (
        renderHeading(directoryActions)
      )}
      {/* FUENTE: kit 04-section-layout.md, AdminModule.tsx:4256–4495.
          Ficha inicial con datos laterales y selector de contactos bajo demanda. */}
      <div className="page-content contacts-page">
        {showKpis ? (
          <RemoteModuleKpis
            path="/module-kpis/contacts"
            revision={revision}
            href={(id) =>
              'contacts?' +
              new URLSearchParams({
                metric: id,
                status: id === 'customers' || id === 'suppliers' ? 'active' : 'all',
                type: 'all',
                sort: 'name_asc',
                page: '1',
                kpis: 'hidden',
                directory: '1',
              })
            }
          />
        ) : (
          <div className={`contacts-workspace${showContact ? '' : ' without-selection'}`}>
            {showContact && (
              <section
                className="contact-workspace-detail"
                aria-label="Información del cliente o proveedor"
              >
                {selected && (
                  <div className="contact-record-navigation">
                    <ContactRecordNavigation
                      key={selected.id + revision}
                      id={selected.id}
                      revision={revision}
                      query={new URLSearchParams({
                        ...(origin ? { from: origin } : {}),
                        ...routeParams,
                      }).toString()}
                    />
                  </div>
                )}
                {error && <ErrorBox>{error}</ErrorBox>}
                {selectionLoading ? (
                  <Loading />
                ) : selectionError ? (
                  <>
                    <ErrorBox>{selectionError}</ErrorBox>
                    <div className="modal-actions">
                      <button className="button" onClick={returnToDirectory}>
                        Volver al listado
                      </button>
                      <button className="button" onClick={refresh}>
                        Reintentar
                      </button>
                    </div>
                  </>
                ) : (
                  selected && (
                    <>
                      <h2 className="sr-only" ref={detailTitleRef} tabIndex={-1}>
                        {selected.name}
                      </h2>
                      <div className="contact-detail-layout">
                        <aside className="contact-details-sidebar" aria-label="Datos del contacto">
                          <div className="contact-details-title">
                            <h2>
                              {selected.type === 'supplier'
                                ? 'Datos del proveedor'
                                : selected.type === 'both'
                                  ? 'Datos del contacto'
                                  : 'Datos del cliente'}
                            </h2>
                            {
                              <button
                                type="button"
                                className="icon-button icon-button-plain"
                                ref={directoryTriggerRef}
                                onClick={() => openDirectory()}
                                aria-label="Abrir clientes y proveedores"
                                title="Abrir clientes y proveedores"
                              >
                                <ContactRound size={18} strokeWidth={1.6} aria-hidden="true" />
                              </button>
                            }
                          </div>
                          <dl className="contact-data-grid">
                            <div>
                              <dt>NIF / identificador fiscal</dt>
                              <dd>{selected.taxId}</dd>
                            </div>
                            {selected.address && (
                              <div>
                                <dt>Dirección fiscal</dt>
                                <dd>{selected.address}</dd>
                              </div>
                            )}
                            {selected.email && (
                              <div>
                                <dt>Correo electrónico</dt>
                                <dd>
                                  <a href={'mailto:' + selected.email}>{selected.email}</a>
                                </dd>
                              </div>
                            )}
                            {selected.phone && (
                              <div>
                                <dt>Teléfono</dt>
                                <dd>
                                  <a href={'tel:' + selected.phone}>{selected.phone}</a>
                                </dd>
                              </div>
                            )}
                            {selected.type === 'both' && (
                              <div>
                                <dt>Tipo de ficha</dt>
                                <dd>{contactLabels[selected.type]}</dd>
                              </div>
                            )}
                          </dl>
                        </aside>
                        <div className="contact-activity-content">
                          <ContactActivityPanel
                            searchHost={activitySearchHost}
                            key={selected.id}
                            contact={selected}
                            revision={revision}
                            returnTo={returnTo}
                          />
                        </div>
                      </div>
                    </>
                  )
                )}
              </section>
            )}
          </div>
        )}
      </div>
      {!showContact && (
        <div className="page-content contacts-list-page">
          <section className="panel table-panel" aria-label="Listado de clientes y proveedores">
            <div className="contact-directory-tools">
              <ListToolbar
                label="Herramientas de clientes y proveedores"
                filterLabel="Filtrar contactos"

                filterCount={countAppliedFilters(
                  { metric, type, status },
                  { search, scope: 'contacts' },
                )}
                filtersOpen={filtersOpen}
                onOpenFilters={() => {
                  setFilterDraft({
                    type,
                    status: metric === 'customers' || metric === 'suppliers' ? 'active' : status,
                    metric,
                    search,
                    sort,
                  });
                  setFiltersOpen(true);
                }}
              />
              <HeaderListSearch
                scope="contacts"
                label="Buscar clientes y proveedores"
                placeholder="Nombre, NIF o petición…"
                value={search}
                onApply={(value) => {
                  const plan = decodeSearch(value, 'contacts');
                  const inheritedType =
                    metric === 'customers'
                      ? 'customer'
                      : metric === 'suppliers'
                        ? 'supplier'
                        : type;
                  const f = {
                    status: metric === 'customers' || metric === 'suppliers' ? 'active' : status,
                    ...(inheritedType !== 'all' ? { type: inheritedType } : {}),
                    ...(metric === 'receivable' || metric === 'payable' ? { metric } : {}),
                    sort,
                    ...plan?.filters,
                  };
                  setStatus(f.status);
                  setType(f.type || 'all');
                  setMetric(f.metric || '');
                  setSort(f.sort as ContactSort);
                  changeSearch(plan ? encodeSearch({ ...plan, filters: f }) : value);
                }}
                onClear={() => {
                  changeSearch('');
                }}
              />
            </div>
            {loadError ? (
              <>
                <ErrorBox>{loadError}</ErrorBox>
                <button className="button" onClick={refresh}>
                  Reintentar
                </button>
              </>
            ) : loading ? (
              <Loading />
            ) : (
              data &&
              (data.rows.length ? (
                <>
                  <div className="table-scroll">
                    <table className="contacts-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>NIF / identificador fiscal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((contact) => (
                          <tr key={contact.id} className="record-row" onClick={openTableRow}>
                            <td>
                              <a
                                className="document-link table-record-link"
                                href={
                                  '#contacts?' +
                                  new URLSearchParams({
                                    ...routeParams,
                                    kpis: 'hidden',
                                    contact: contact.id,
                                  })
                                }
                              >
                                {contact.name}
                              </a>
                            </td>
                            <td>{contact.taxId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ContactPagination
                    data={data}
                    onPage={(value) => {
                      setPage(value);
                    }}
                    disabled={busy}
                  />
                </>
              ) : (
                <Empty
                  showMessage={hasFilters}
                  title={hasFilters ? 'No hay coincidencias' : 'Tu lista de clientes empieza aquí'}
                  description={
                    hasFilters
                      ? 'Prueba otra búsqueda o cambia los filtros.'
                      : 'Añade tu primer cliente o proveedor con su NIF.'
                  }
                  action={
                    !readonly &&
                    !hasFilters && (
                      <button className="button primary" onClick={create}>
                        <Plus size={16} />
                        Añadir cliente
                      </button>
                    )
                  }
                />
              ))
            )}
          </section>
        </div>
      )}
      {filtersOpen && (
        <Modal
          title="Filtrar contactos"
          onClose={() => setFiltersOpen(false)}
          className="filter-dialog"
        >
          <KpiFilter
            persistent
            label={draftHasFilters ? filterLabel : undefined}
            onClear={() =>
              setFilterDraft({
                type: 'all',
                status: 'all',
                metric: '',
                search: '',
                sort: 'name_asc',
              })
            }
          />
          <div className="form-grid">
            <Field label="Ordenar por" className="span-2">
              <Select
                value={filterDraft.sort}
                onChange={(event) =>
                  setFilterDraft({ ...filterDraft, sort: event.target.value as ContactSort })
                }
              >
                {contactSortOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado" className="span-2">
              <Select
                value={filterDraft.status}
                onChange={(event) =>
                  setFilterDraft({
                    ...filterDraft,
                    status: event.target.value,
                    ...(filterDraft.metric === 'customers' || filterDraft.metric === 'suppliers'
                      ? {
                          type: filterDraft.metric === 'customers' ? 'customer' : 'supplier',
                          metric: '',
                        }
                      : {}),
                  })
                }
              >
                <option value="active">Activos</option>
                <option value="archived">Archivados</option>
                <option value="all">Todos</option>
              </Select>
            </Field>
          </div>
          <div className="modal-actions">
            <button
              className="button primary"
              onClick={() => {
                setType(filterDraft.type);
                setSort(filterDraft.sort);
                setMetric(filterDraft.metric);
                setStatus(filterDraft.status);
                setSearch(literalSearch(filterDraft.search));
                setPage(1);

                setError('');
                setFiltersOpen(false);
              }}
            >
              Aplicar filtros
            </button>
          </div>
        </Modal>
      )}
      {showDetails && selected && (
        <ContactDataModal
          contact={selected}
          readonly={readonly}
          busy={busy}
          error={error}
          onClose={() => setShowDetails(false)}
          onEdit={() => {
            setShowDetails(false);
            setEditing(selected);
          }}
          onToggle={() => void toggle(selected)}
        />
      )}
      {editing === 'new' && (
        <Modal
          title="Añadir cliente o proveedor"
          className="contact-creation-dialog"
          onClose={() => setEditing(null)}
        >
          <ContactPicker
            party={newParty}
            onSelect={setNewParty}
            type={type === 'supplier' ? 'supplier' : 'customer'}
            allowContactType
            onResolved={(contact) => {
              setEditing(null);
              setSearch(contact.taxId);
              setType('all');
              setStatus('active');
              setMetric('');
              setPage(1);
              setSelectedId(contact.id);
              setShowKpis(false);
              lastSelectedIdRef.current = contact.id;
              refresh();
              notify('Ficha disponible. Puedes recuperarla por su NIF en los formularios.');
            }}
          />
        </Modal>
      )}
      {editing && editing !== 'new' && (
        <ContactForm
          readonly={readonly}
          contact={editing}
          onClose={() => {
            setEditing(null);
            refresh();
          }}
          onSaved={() => {
            setEditing(null);
            refresh();
            notify('Ficha guardada. Ya puedes recuperarla por su NIF en los formularios.');
          }}
        />
      )}
    </>
  );
}

// FUENTE: kit 16-modal.md; datos bajo demanda y cierre izquierdo solicitado.
function ContactDataModal({
  contact,
  readonly,
  busy,
  error,
  onClose,
  onEdit,
  onToggle,
}: {
  contact: Contact;
  readonly: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const fields = [
    ['Nombre o razón social', contact.name],
    ['NIF / identificador fiscal', contact.taxId],
    ['Dirección fiscal', contact.address],
    ['Correo electrónico', contact.email || 'Sin correo electrónico'],
    ['Teléfono', contact.phone || 'Sin teléfono'],
    ['Tipo de ficha', contactLabels[contact.type]],
    ['Estado', contact.active ? 'Activo' : 'Archivado'],
    ['Notas internas', contact.notes || 'Sin notas'],
    ['Fecha de alta', shortDate(contact.created_at)],
    ['Última actualización', shortDate(contact.updated_at)],
  ];
  return (
    <Modal title="Datos del cliente o proveedor" onClose={onClose} wide>
      {error && <ErrorBox>{error}</ErrorBox>}
      <dl className="contact-data-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {!readonly && (
        <div className="modal-actions">
          <button className="button" onClick={onToggle} disabled={busy}>
            {contact.active ? <Archive size={16} /> : <RotateCcw size={16} />}
            {busy ? 'Guardando…' : contact.active ? 'Archivar ficha' : 'Recuperar ficha'}
          </button>
          <button className="button" onClick={onEdit} disabled={busy}>
            Editar ficha
          </button>
        </div>
      )}
    </Modal>
  );
}
