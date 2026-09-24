import type { ModuleSummary } from '../shared/module-kpis';
import { DocumentStatusLabel } from './DocumentStatusLabel';
import { MonthlyChart } from './MonthlyChart';
import { countAppliedFilters } from '../shared/filter-count';
import { MovementReference } from './MovementReference';
import {
  decodeSearch,
  filterSearchRows,
  searchDisplay,
  literalSearch,
} from '../shared/advanced-search';
import { openTableRow } from './row-navigation';
import { PaymentFilters } from './PaymentFilters';
import { Select } from './Select';
import { TableSortButton } from './TableSortButton';
import { RecordNavigation } from './RecordNavigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  History,
  Settings2,
  Plus,
  Search,
  Send,
  Wallet,
  SlidersHorizontal,
  Undo2,
  Trash2,
  X,
} from 'lucide-react';
import { api, downloadUrl, euros, navigate, tableDate, today } from './api';
import {
  Empty,
  ErrorBox,
  Field,
  Loading,
  Modal,
  PageHeading,
  PanelHeading,
  Submit,
  TextLink,
  useRemote,
  type Notify,
} from './components';
import { labels, type FinancialDocument, type Payment, type Product } from '../shared/domain';
export { Accounting, Settings, Audit } from './settings';
import { ModuleKpis, RemoteModuleKpis, KpiFilter, useListRoute } from './ModuleKpis';
import { ActionsMenu } from './ActionsMenu';
import { SalesFilters } from './SalesFilters';
import { SalesTools } from './SalesTools';
import { QuoteRowActions } from './QuoteRowActions';
import {
  salesQueryParams,
  type AdvancedSalesFilters,
  type DocumentQuery,
} from '../shared/sales-tools';
import { ListFilters } from './ListFilters';
import './sales.css';
import {
  documentSortValues,
  workingDraftRoute,
  type DocumentSort,
  type DocumentList,
  type DocumentListItem,
} from '../shared/document-list';
import { Funds } from './Funds';
import { BatchPayment } from './BatchPayment';
import { DueDatesCard, PendingDueDates, useDueReturnPosition } from './DueDates';
import { paymentReturnRoute, type DashboardDues } from '../shared/due-dates';
import {
  getDocumentListStatus,
  getSalesWorkflowAction,
  getPurchaseWorkflowAction,
} from './document-status';
import { DocumentWorkflow } from './DocumentWorkflow';
import { DeleteProduct } from './DeleteProduct';
import { ProductForm } from './ProductForm';
import { ProductDetailModal } from './ProductDetail';
import { ListSearch, ListToolbar, useListSearch } from './ListSearch';
import { contactDetailHref } from './contact-route';
import { useSalesSearch } from './useSalesSearch';
import { DocumentSearch } from './DocumentSearch';
import { HeaderListSearch } from './HeaderSearch';
import { salesSearchKey, type SalesSearchFilters } from '../shared/sales-search';
type Props = { notify: Notify; readonly: boolean; userId?: string; workspaceId?: string };
type DashboardData = {
  revenue: string;
  expenses: string;
  quotes: string;
  payable: string;
  monthly: { month: string; revenue: string; expenses: string }[];
  dueDates: DashboardDues;
  recent: {
    action: string;
    created_at: string;
    actor: string;
    number: string | null;
    party: { name: string } | null;
  }[];
};
export function OverviewAnalysis({ name, readonly }: Props & { name: string }) {
  const { data, error, loading } = useRemote<DashboardData>('/dashboard');
  useDueReturnPosition(!loading && !!data, 'overview/analysis');
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return null;

  return (
    <>
      <PageHeading title="Evolución y actividad" />
      <div className="page-content dashboard-content">
        <div className="overview-grid">
          <DueDatesCard data={data.dueDates} returnTo="overview/analysis" />
          <MonthlyChart
            monthly={data.monthly}
            result={Number(data.revenue) - Number(data.expenses)}
          />
        </div>
        <section className="panel">
          <PanelHeading title="Actividad reciente" />
          <div className="activity-grid">
            {data.recent.slice(0, 4).map((r, i) => (
              <div className="activity-item" key={i}>
                <span className="activity-icon">
                  <FileText size={17} />
                </span>
                <div>
                  <strong>{r.number || r.action}</strong>
                  <p>
                    {r.number
                      ? r.action === 'Documento emitido en desarrollo'
                        ? 'Documento emitido'
                        : r.action
                      : r.actor}
                  </p>
                  <small>
                    {new Date(r.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {r.actor}
                  </small>
                </div>
              </div>
            ))}
            {!data.recent.length && <p className="muted">Tu actividad aparecerá aquí.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
export function DocumentTable({
  rows,
  compact = false,
  highlight,
  returnTo,
  kind,
  dueSort,
  priceSort,
  sort = 'default',
  feedback,
  onDiscardDraft,
  onContinueDocument,
  quoteActions,
}: {
  rows: DocumentListItem[];
  compact?: boolean;
  highlight?: string;
  returnTo?: string;
  kind?: string;
  dueSort?: ReactNode;
  priceSort?: ReactNode;
  sort?: DocumentSort;
  feedback?: ReactNode;
  onDiscardDraft?: (draft: DocumentListItem) => void;
  onContinueDocument?: (doc: DocumentListItem) => void;
  quoteActions?: (doc: DocumentListItem) => ReactNode;
}) {
  const rowStatuses = rows.map((row) =>
    'workingDraft' in row ? 'Borrador' : getDocumentListStatus(row),
  );
  const contactLinks = rows.map((row) =>
    row.party.name.trim() ? contactDetailHref(row.party.taxId, returnTo) : undefined,
  );
  const workflowActions = rows.map((row) =>
    onContinueDocument
      ? kind === 'purchase'
        ? getPurchaseWorkflowAction(row)
        : kind === 'sales'
          ? getSalesWorkflowAction(row)
          : null
      : null,
  );
  const showPrice = (kind === 'sales' || kind === 'quote' || kind === 'purchase') && !compact;
  const showActions = false;
  return (
    <div className="table-scroll document-list-scroll">
      <table
        className={`document-list${!compact ? ' document-list-balanced' : ''}${showPrice ? ' document-list-priced' : ''}${dueSort || priceSort ? ' document-list-filtered' : ''}${showActions ? ' document-list-actions' : ''}`}
      >
        {!compact && (
          <colgroup>
            <col className="document-column-identity" />
            <col className="document-column-party" />
            <col className="document-column-due" />
            <col className="document-column-status" />
            {showPrice && <col className="document-column-price" />}
            {showActions && <col className="document-column-actions" />}
          </colgroup>
        )}
        <thead>
          <tr>
            <th>Documento</th>
            <th>
              {compact
                ? 'Cliente / proveedor'
                : kind === 'purchase' ||
                    (!kind && rows.length > 0 && rows.every((d) => d.kind === 'purchase'))
                  ? 'Proveedor'
                  : 'Cliente'}
            </th>
            <th
              className={dueSort ? 'document-sort-heading' : undefined}
              scope="col"
              aria-sort={
                dueSort
                  ? sort === 'due_asc'
                    ? 'ascending'
                    : sort === 'due_desc'
                      ? 'descending'
                      : 'none'
                  : undefined
              }
            >
              {dueSort || (kind === 'quote' ? 'Válido hasta' : 'Vencimiento')}
            </th>
            <th scope="col">Estado</th>
            {compact && <th className="numeric">Pendiente</th>}
            {showPrice && (
              <th
                className={`numeric${priceSort ? ' document-sort-heading' : ''}`}
                scope="col"
                aria-sort={
                  priceSort
                    ? sort === 'total_asc'
                      ? 'ascending'
                      : sort === 'total_desc'
                        ? 'descending'
                        : 'none'
                    : undefined
                }
              >
                {priceSort || 'Total'}
              </th>
            )}
            {showActions && (
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {feedback ? (
            <tr className="document-table-feedback">
              <td colSpan={4 + Number(compact) + Number(showPrice) + Number(showActions)}>
                {feedback}
              </td>
            </tr>
          ) : (
            rows.map((d, index) => (
              <tr
                key={d.id}
                data-document-id={d.id}
                className={`record-row${highlight === d.id ? ' saved-row' : ''}`}
                onClick={openTableRow}
              >
                <td className="doc-identity">
                  <div className="doc-identity-content">
                    <a
                      className="document-link"
                      href={
                        'workingDraft' in d
                          ? '#' + workingDraftRoute(d)
                          : '#document/' +
                            d.id +
                            (returnTo ? '?from=' + encodeURIComponent(returnTo) : '')
                      }
                      aria-label={`${'workingDraft' in d ? 'Continuar borrador' : 'Abrir ' + (d.number || 'borrador')} de ${d.party.name || 'destinatario pendiente'}`}
                    >
                      <span>
                        <strong>{d.number || 'Borrador'}</strong>
                        {compact && <small>{labels[d.kind]}</small>}
                      </span>
                    </a>
                  </div>
                </td>
                <td className="doc-party">
                  {contactLinks[index] ? (
                    <a
                      className="text-link table-name"
                      href={contactLinks[index]}
                      title={'Ver ficha de ' + d.party.name}
                    >
                      {d.party.name}
                    </a>
                  ) : (
                    <span className="table-name">
                      {d.party.name ||
                        (d.kind === 'purchase' ? 'Sin proveedor todavía' : 'Sin cliente todavía')}
                    </span>
                  )}
                </td>
                <td
                  className={compact ? 'doc-date' : 'doc-due'}
                  data-label={kind === 'quote' ? 'Válido hasta' : compact ? 'Vence' : 'Vencimiento'}
                >
                  {d.due_date ? tableDate(d.due_date) : '—'}
                </td>
                <td className="doc-status">
                  <DocumentStatusLabel status={rowStatuses[index]} />
                </td>
                {showPrice && (
                  <td className="numeric total-cell doc-price" data-label="Total">
                    <span>{d.total === null ? '—' : euros(d.total)}</span>
                    {!('workingDraft' in d) &&
                      d.kind !== 'quote' &&
                      d.status !== 'draft' &&
                      Number(d.settled) > 0 &&
                      Number(d.balance) > 0 && (
                        <small className="document-list-balance">
                          Pendiente <strong>{euros(d.balance)}</strong>
                        </small>
                      )}
                  </td>
                )}
                {compact && (
                  <td className="numeric total-cell doc-total">
                    {d.total === null ? '—' : euros(d.balance)}
                  </td>
                )}
                {showActions && (
                  <td className="table-actions-cell doc-actions">
                    {workflowActions[index] && (
                      <ActionsMenu
                        label={`Acciones de ${d.number || 'borrador'} de ${d.party.name || 'destinatario pendiente'}`}
                        items={[
                          kind === 'purchase' &&
                            !('workingDraft' in d) &&
                            d.kind === 'purchase' &&
                            d.status === 'draft' && {
                              label: 'Editar borrador',
                              icon: FileText,
                              href: '#edit/' + d.id,
                            },
                          {
                            label: workflowActions[index]!.label,
                            icon:
                              workflowActions[index]!.type === 'edit'
                                ? FileText
                                : workflowActions[index]!.type === 'issue'
                                  ? Send
                                  : Wallet,
                            onAction: () => onContinueDocument?.(d),
                          },
                          d.status === 'draft' &&
                            !!onDiscardDraft && {
                              label: 'Descartar borrador',
                              icon: Trash2,
                              onAction: () => onDiscardDraft(d),
                            },
                        ]}
                      />
                    )}
                    {kind === 'quote' && quoteActions?.(d)}
                    {kind !== 'sales' &&
                      kind !== 'purchase' &&
                      kind !== 'quote' &&
                      d.status === 'draft' &&
                      onDiscardDraft && (
                        <ActionsMenu
                          label={`Acciones del borrador de ${d.party.name || 'destinatario pendiente'}`}
                          items={[
                            {
                              label: 'Descartar borrador',
                              icon: Trash2,
                              onAction: () => onDiscardDraft(d),
                            },
                          ]}
                        />
                      )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
export function Documents(props: Props & { section: string }) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const quote = props.section === 'quotes';
  const purchase = props.section === 'purchases';
  const showSalesSummary =
    (props.section === 'sales' || quote || purchase) &&
    ![
      'view',
      'metric',
      'status',
      'search',
      'page',
      'highlight',
      'from',
      'to',
      'customer',
      'dueFrom',
      'dueTo',
      'minTotal',
      'maxTotal',
      'sort',
    ].some((key) => params.has(key));
  if (!showSalesSummary) return <DocumentListPage {...props} />;
  return <DocumentSummary {...props} />;
}

function DocumentSummary(props: Props & { section: string }) {
  const quote = props.section === 'quotes';
  const purchase = props.section === 'purchases';
  const [retry, setRetry] = useState(0);
  const { data, error, loading } = useRemote<ModuleSummary>(
    '/module-kpis/documents?kind=' + (quote ? 'quote' : purchase ? 'purchase' : 'sales'),
    retry,
  );
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="list-error">
        <ErrorBox>No se ha podido cargar la sección. {error}</ErrorBox>
        <button className="button" onClick={() => setRetry((value) => value + 1)}>
          Reintentar
        </button>
      </div>
    );
  if (!data) return null;
  return (
    <>
      {/* FUENTE: 03-module-header.md y 18-add-button.md, TeamModule.tsx:1679–1689. */}
      <PageHeading
        title={quote ? 'Presupuestos' : purchase ? 'Compras y gastos' : 'Facturas de venta'}
        subtitleLink={{
          href: '#' + props.section + '?view=list',
          label: quote
            ? 'Ver todos los presupuestos'
            : purchase
              ? 'Ver todas las compras'
              : 'Ver todas las facturas',
        }}
        tools={
          <DocumentSearch
            kind={quote ? 'quote' : purchase ? 'purchase' : 'sales'}
            workspaceId={props.workspaceId}
          />
        }
        primaryAction={
          !props.readonly && {
            label: quote ? 'Nuevo presupuesto' : purchase ? 'Nueva compra' : 'Nueva factura',
            icon: Plus,
            onAction: () =>
              navigate(quote ? 'new/quote' : purchase ? 'new/purchase' : 'new/invoice'),
          }
        }
      />
      <div className="page-content documents-page sales-summary-page">
        <ModuleKpis
          items={data.items}
          href={(id) => props.section + '?view=list&metric=' + id + '&asOf=' + data.asOf}
        />
      </div>
    </>
  );
}

function DocumentListPage({
  section,
  readonly,
  userId,
  workspaceId,
  notify,
}: Props & { section: string }) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const [search, setSearch] = useState(params.get('phrase') || params.get('search') || '');
  const [naturalSearch, setNaturalSearch] = useState<{ text: string; key: string } | null>(() =>
    params.get('phrase')
      ? {
          text: params.get('phrase')!,
          key: salesSearchKey(Object.fromEntries(params) as Partial<DocumentQuery>),
        }
      : null,
  );
  const [query, setQuery] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [from, setFrom] = useState(params.get('from') || '');
  const [to, setTo] = useState(params.get('to') || '');
  const [customer, setCustomer] = useState(params.get('customer') || '');
  const [advanced, setAdvanced] = useState<AdvancedSalesFilters>(() =>
    Object.fromEntries(
      ['dueFrom', 'dueTo', 'minTotal', 'maxTotal']
        .filter((key) => params.get(key))
        .map((key) => [key, params.get(key)!]),
    ),
  );

  const [sort, setSort] = useState<DocumentSort>(
    documentSortValues.includes(params.get('sort') as DocumentSort)
      ? (params.get('sort') as DocumentSort)
      : 'default',
  );
  const [page, setPage] = useState(Math.max(1, Number(params.get('page')) || 1));
  const [retry, setRetry] = useState(0);
  const [draftError, setDraftError] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const tablePanel = useRef<HTMLElement>(null);
  const restoreWorkflowFocus = useRef<string | null>(null);
  const [discardingDraftId, setDiscardingDraftId] = useState('');
  const [metric, setMetric] = useState(params.get('metric') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [asOf, setAsOf] = useState(params.get('asOf') || '');
  const listSearch = useListSearch(false, undefined, false);
  const kind = section === 'quotes' ? 'quote' : section === 'purchases' ? 'purchase' : 'sales';
  const commercial = ['sales', 'quote', 'purchase'].includes(kind);
  const title =
    kind === 'quote'
      ? 'Presupuestos'
      : kind === 'purchase'
        ? 'Compras y gastos'
        : 'Facturas de venta';
  const createLabel =
    kind === 'quote' ? 'Nuevo presupuesto' : kind === 'purchase' ? 'Nueva compra' : 'Nueva factura';
  const searchLabel =
    kind === 'quote'
      ? 'Buscar presupuestos'
      : kind === 'purchase'
        ? 'Buscar compras'
        : 'Buscar facturas';
  const create = () => navigate('new/' + (kind === 'sales' ? 'invoice' : kind));
  function clearSearch() {
    if (naturalSearch) {
      setAdvanced({});
      setSort('default');
      setCustomer('');
      setFrom('');
      setTo('');
      setMetric('');
      setAsOf('');
      setStatus('all');
      setNaturalSearch(null);
    }
    setSearch('');
    setQuery('');
    setPage(1);
  }
  useEffect(() => {
    if (commercial) return;
    const timer = setTimeout(() => {
      if (search !== query) {
        setQuery(search);
        setPage(1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, query, kind]);
  const listQuery: Partial<DocumentQuery> = {
    kind,
    ...advanced,
    from: from || undefined,
    to: to || undefined,
    customer: customer || undefined,
    search: query,
    status,
    page,
    sort,
    metric: (metric || undefined) as DocumentQuery['metric'],
    asOf: asOf || undefined,
    includeWorkingDrafts: status === 'draft' && !readonly ? '1' : undefined,
  };
  const criteriaKey = salesSearchKey(listQuery);
  const activePhrase = naturalSearch?.key === criteriaKey ? naturalSearch.text : '';
  function applySalesSearch(filters: SalesSearchFilters, text: string, literal = false) {
    setStatus(filters.status);
    setSort(filters.sort);
    setCustomer(filters.customer || '');
    setFrom(filters.from || '');
    setTo(filters.to || '');
    const { dueFrom, dueTo, minTotal, maxTotal } = filters;
    setAdvanced(
      Object.fromEntries(
        Object.entries({ dueFrom, dueTo, minTotal, maxTotal }).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    );
    setMetric('');
    setAsOf('');
    setPage(1);
    setQuery(literal ? text : '');
    setSearch(text);
    setNaturalSearch(literal ? null : { text, key: salesSearchKey(filters) });
  }
  useEffect(() => {
    if (naturalSearch && naturalSearch.key !== criteriaKey) {
      setNaturalSearch(null);
      setSearch(query);
    }
  }, [criteriaKey, naturalSearch, query]);
  const salesSearch = useSalesSearch({
    enabled: commercial,
    kind,
    open: listSearch.open,
    text: search,
    workspaceId,
    applied: activePhrase && activePhrase === search ? listQuery : undefined,
    literalApplied: !!query && query === search && !activePhrase,
    onApply: applySalesSearch,
    onLiteral: (text) => applySalesSearch({ status: 'all', sort: 'default' }, text, true),
  });
  const { data, error, loading } = useRemote<DocumentList>(
    '/documents?' + salesQueryParams(listQuery),
    retry,
  );
  useEffect(() => {
    if (loading || !restoreWorkflowFocus.current) return;
    const row = Array.from(
      tablePanel.current?.querySelectorAll<HTMLElement>('[data-document-id]') || [],
    ).find((row) => row.dataset.documentId === restoreWorkflowFocus.current);
    const target =
      row?.querySelector<HTMLElement>('.actions-trigger, .document-link') ||
      tablePanel.current?.querySelector<HTMLElement>('.document-link') ||
      tablePanel.current;
    target?.focus({ preventScroll: true });
    restoreWorkflowFocus.current = null;
  }, [data, loading, error]);
  useEffect(() => {
    if (
      !loading &&
      !error &&
      data &&
      page > 1 &&
      page > Math.max(1, Math.ceil(data.count / data.pageSize))
    ) {
      setPage(Math.max(1, Math.ceil(data.count / data.pageSize)));
    }
  }, [data, loading, error, page]);
  const statusOptions =
    kind === 'quote'
      ? [
          ['all', 'Todos'],
          ['draft', 'Borradores'],
          ['sent', 'Confirmados'],
          ['expired', 'Caducados'],
          ['accepted', 'Aceptados'],
          ['converted', 'Convertidos'],
          ['rejected', 'Rechazados'],
        ]
      : [
          ['all', 'Todas'],
          [
            kind === 'purchase' ? 'recorded' : 'issued',
            kind === 'purchase' ? 'Contabilizadas' : 'Emitidas',
          ],
          ['draft', 'Borradores'],
          ['unpaid', 'Pendientes'],
          ['paid', kind === 'purchase' ? 'Pagadas' : 'Cobradas'],
          ['overdue', 'Vencidas'],
        ];
  const returnParams = salesQueryParams(listQuery);
  if (activePhrase) returnParams.set('phrase', activePhrase);
  const returnTo = `${section}?${commercial ? 'view=list&' : ''}${returnParams}`;
  useListRoute(section, {
    ...advanced,
    ...(activePhrase ? { phrase: activePhrase } : {}),
    ...(commercial ? { view: 'list' } : {}),
    ...(customer ? { customer } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    status,
    search: query,
    page: String(page),
    ...(sort !== 'default' ? { sort } : {}),
    ...(metric ? { metric } : {}),
    ...(asOf ? { asOf } : {}),
  });
  const hasAdvanced = Object.values(advanced).some(Boolean);
  const filtered =
    !!query || status !== 'all' || !!metric || !!from || !!to || !!customer || hasAdvanced;
  const metricLabels: Record<string, string> = {
    month:
      kind === 'purchase'
        ? 'Compras del mes · base imponible'
        : 'Facturado este mes · base imponible',
    pending: kind === 'purchase' ? 'Pendiente de pago' : 'Pendiente de cobro',
    overdue: 'Facturas con vencimientos pendientes atrasados',
    draft: 'Borradores guardados',
    sent: 'Presupuestos vigentes pendientes de respuesta',
    accepted: 'Presupuestos aceptados pendientes de facturar',
    expired: 'Presupuestos caducados pendientes de respuesta',
  };
  const clearFilters = () => {
    setNaturalSearch(null);
    setAsOf('');
    setAdvanced({});
    setSort('default');
    setCustomer('');
    setFrom('');
    setTo('');
    setMetric('');
    setStatus('all');
    setSearch('');
    setQuery('');
    setPage(1);
  };
  useEffect(() => {
    const changed = () => setRetry((value) => value + 1);
    window.addEventListener('working-draft-saved', changed);
    return () => window.removeEventListener('working-draft-saved', changed);
  }, []);
  async function discardDraft(draft: DocumentListItem) {
    if (readonly || discardingDraftId || draft.status !== 'draft') return;
    const work = 'workingDraft' in draft ? draft.workingDraft : undefined;
    const editingSavedDraft = !!work?.resourceKey.startsWith('edit:');
    if (
      !confirm(
        editingSavedDraft
          ? '¿Descartar los cambios de edición? El borrador guardado se conservará.'
          : '¿Descartar este borrador?',
      )
    )
      return;
    setDraftError('');
    setDiscardingDraftId(draft.id);
    try {
      if (work) {
        await api('/working-drafts/' + encodeURIComponent(work.resourceKey), {
          method: 'DELETE',
          body: { version: work.version },
        });
        try {
          localStorage.removeItem(
            `kronjop.working:${userId}:${workspaceId || 'legacy'}:${work.resourceKey}`,
          );
        } catch {}
      } else {
        await api('/documents/' + draft.id, { method: 'DELETE' });
      }
      notify(
        editingSavedDraft
          ? 'Cambios descartados. Se conserva el borrador guardado.'
          : 'Borrador descartado.',
      );
      if (!editingSavedDraft && page > 1 && data?.rows.length === 1) setPage(page - 1);
      else setRetry((value) => value + 1);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('.module-list-toolbar button[aria-haspopup="dialog"]')
          ?.focus(),
      );
    } catch (error) {
      setDraftError((error as Error).message);
      setRetry((value) => value + 1);
    } finally {
      setDiscardingDraftId('');
    }
  }
  return (
    <>
      <PageHeading
        title={title}
        backLink={
          commercial
            ? {
                href: '#' + section,
                label: 'Atrás',
              }
            : undefined
        }
        tools={
          <DocumentSearch
            kind={kind}
            value={activePhrase || query}
            applied={activePhrase ? listQuery : undefined}
            workspaceId={workspaceId}
          />
        }
        primaryAction={!readonly && { label: createLabel, icon: Plus, onAction: create }}
        menu={
          commercial
            ? [
                {
                  label: 'Exportar listado filtrado',
                  group: 'Consultar y exportar',
                  icon: Download,
                  href:
                    !loading && !error && data
                      ? downloadUrl('/documents/export.csv?' + salesQueryParams(listQuery))
                      : undefined,
                  disabled: loading || !!error || !data,
                },
              ]
            : [
                {
                  label: searchLabel,
                  icon: Search,
                  onAction: listSearch.openSearch,
                },
                {
                  label: 'Exportar todas las ' + (kind === 'purchase' ? 'compras' : 'ventas'),
                  icon: Download,
                  href: downloadUrl('/export/' + (kind === 'purchase' ? 'purchases' : 'sales')),
                },
              ]
        }
      />
      <div className={`page-content documents-page${commercial ? ' sales-documents-page' : ''}`}>
        {!commercial && (
          <RemoteModuleKpis
            path={`/module-kpis/documents?kind=${kind}${asOf ? '&asOf=' + asOf : ''}`}
            revision={retry}
            active={metric}
            href={(id, summary) => `${section}?metric=${id}&asOf=${summary.asOf}`}
          />
        )}
        {!commercial && <KpiFilter label={metricLabels[metric]} onClear={clearFilters} />}
        <section className="panel table-panel" ref={tablePanel} tabIndex={-1} aria-label={title}>
          {/* FUENTE: 08-toolbar.md, AbsencesModule.tsx:2910–2911; 05-button.md, TeamModule.tsx:1731–1770. */}
          {commercial && (
            <ListToolbar
              label={
                kind === 'quote'
                  ? 'Herramientas de presupuestos'
                  : kind === 'purchase'
                    ? 'Herramientas de compras'
                    : 'Herramientas de facturas'
              }
              filterLabel={
                kind === 'quote'
                  ? 'Filtros de presupuestos'
                  : kind === 'purchase'
                    ? 'Filtros de compras'
                    : 'Filtros de facturas'
              }

              filterCount={countAppliedFilters(listQuery)}
              filtersOpen={filtersOpen}
              onOpenFilters={() => setFiltersOpen(true)}
            />
          )}
          {!commercial && (
            <ListSearch
              disclosure={listSearch}
              label={searchLabel}
              placeholder={
                kind === 'purchase' ? 'Número, proveedor o NIF…' : 'Número, cliente o NIF…'
              }
              value={search}
              onChange={setSearch}
              onClear={clearSearch}
              onSubmit={(value) => {
                setQuery(value);
                setPage(1);
              }}
            />
          )}
          {(listSearch.open || !!query) && (
            <p className="sr-only" role="status">
              {!loading && !error && search === query && data ? `${data.count} resultados` : ''}
            </p>
          )}
          {draftError && <ErrorBox>{draftError}</ErrorBox>}
          <DocumentTable
            rows={loading || error ? [] : data?.rows || []}
            kind={kind}
            returnTo={returnTo}
            highlight={params.get('highlight') || undefined}
            onDiscardDraft={
              readonly || kind === 'sales' ? undefined : (draft) => void discardDraft(draft)
            }
            quoteActions={
              readonly
                ? undefined
                : (doc) => (
                    <QuoteRowActions
                      doc={doc}
                      onDiscard={() => void discardDraft(doc)}
                      onError={(message) => {
                        setDraftError(message);
                        if (message) {
                          restoreWorkflowFocus.current = doc.id;
                          setRetry((value) => value + 1);
                        }
                      }}
                      onSaved={(message, invoiceId) => {
                        restoreWorkflowFocus.current = doc.id;
                        setDraftError('');
                        notify(
                          message,
                          invoiceId
                            ? { label: 'Abrir borrador', to: 'document/' + invoiceId }
                            : undefined,
                        );
                        setRetry((value) => value + 1);
                      }}
                    />
                  )
            }
            onContinueDocument={
              kind === 'purchase' && !readonly
                ? (doc) => {
                    if ('workingDraft' in doc) navigate(workingDraftRoute(doc));
                    else setWorkflowId(doc.id);
                  }
                : undefined
            }
            sort={sort}
            priceSort={
              commercial && (
                <TableSortButton
                  label="Total"
                  direction={
                    sort === 'total_desc'
                      ? 'descending'
                      : sort === 'total_asc'
                        ? 'ascending'
                        : undefined
                  }
                  onToggle={() => {
                    setSort(sort === 'total_desc' ? 'total_asc' : 'total_desc');
                    setPage(1);
                  }}
                />
              )
            }
            dueSort={
              commercial && (
                <TableSortButton
                  label={kind === 'quote' ? 'Válido hasta' : 'Vencimiento'}
                  direction={
                    sort === 'due_desc'
                      ? 'descending'
                      : sort === 'due_asc'
                        ? 'ascending'
                        : undefined
                  }
                  onToggle={() => {
                    setSort(sort === 'due_desc' ? 'due_asc' : 'due_desc');
                    setPage(1);
                  }}
                />
              )
            }
            feedback={
              error ? (
                <div className="list-error">
                  <ErrorBox>{error}</ErrorBox>
                  <button className="button" onClick={() => setRetry((v) => v + 1)}>
                    Reintentar
                  </button>
                </div>
              ) : loading ? (
                <Loading />
              ) : data?.rows.length ? undefined : (
                <Empty
                  showMessage={Boolean(filtered)}
                  title={
                    filtered
                      ? 'No hay resultados'
                      : kind === 'quote'
                        ? 'Todavía no hay presupuestos'
                        : kind === 'purchase'
                          ? 'Todavía no hay compras'
                          : 'Todavía no hay facturas'
                  }
                  description={
                    filtered && !commercial
                      ? 'Prueba con otra búsqueda o cambia los filtros.'
                      : undefined
                  }
                  action={
                    filtered && commercial ? (
                      <div className="sales-empty-actions">
                        {query && (
                          <button className="button" onClick={clearSearch}>
                            Borrar búsqueda
                          </button>
                        )}
                        {(from || to) && (
                          <button
                            className="button"
                            onClick={() => {
                              setFrom('');
                              setTo('');
                              setPage(1);
                            }}
                          >
                            Quitar fecha de emisión
                          </button>
                        )}
                        {(advanced.dueFrom || advanced.dueTo) && (
                          <button
                            className="button"
                            onClick={() => {
                              setAdvanced(({ dueFrom, dueTo, ...rest }) => rest);
                              setPage(1);
                            }}
                          >
                            {kind === 'quote' ? 'Quitar validez' : 'Quitar vencimiento'}
                          </button>
                        )}
                        {(advanced.minTotal || advanced.maxTotal) && (
                          <button
                            className="button"
                            onClick={() => {
                              setAdvanced(({ minTotal, maxTotal, ...rest }) => rest);
                              setPage(1);
                            }}
                          >
                            Quitar precio
                          </button>
                        )}
                        {customer && (
                          <button
                            className="button"
                            onClick={() => {
                              setCustomer('');
                              setPage(1);
                            }}
                          >
                            {kind === 'purchase' ? 'Quitar proveedor' : 'Quitar cliente'}
                          </button>
                        )}
                        {status !== 'all' && (
                          <button
                            className="button"
                            onClick={() => {
                              setStatus('all');
                              setPage(1);
                            }}
                          >
                            Quitar estado
                          </button>
                        )}
                        {metric && (
                          <button
                            className="button"
                            onClick={() => {
                              setMetric('');
                              setPage(1);
                            }}
                          >
                            Quitar filtro del indicador
                          </button>
                        )}
                      </div>
                    ) : filtered ? (
                      <button
                        className="button"
                        onClick={() => {
                          clearFilters();
                        }}
                      >
                        Limpiar filtros
                      </button>
                    ) : (
                      !readonly && (
                        <button className="button primary" onClick={create}>
                          <Plus size={16} />
                          {createLabel}
                        </button>
                      )
                    )
                  }
                />
              )
            }
          />
          {!loading && !error && data && (data.count > data.pageSize || page > 1) && (
            <div className="table-footer">
              <span>
                {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.count)} de{' '}
                {data.count} {data.count === 1 ? 'documento' : 'documentos'}
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Página anterior"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  Página {page} de {Math.max(1, Math.ceil(data.count / data.pageSize))}
                </span>
                <button
                  className="icon-button"
                  aria-label="Página siguiente"
                  disabled={page * data.pageSize >= data.count}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      {workflowId && !readonly && (
        <DocumentWorkflow
          key={workflowId}
          id={workflowId}
          onClose={() => setWorkflowId('')}
          onSaved={(message) => {
            restoreWorkflowFocus.current = workflowId;
            setWorkflowId('');
            if (message) notify(message);
            setRetry((value) => value + 1);
          }}
        />
      )}
      {commercial && filtersOpen && (
        <SalesFilters
          tools={
            <SalesTools
              quote={kind === 'quote'}
              purchase={kind === 'purchase'}
              result={!loading && !error ? data || undefined : undefined}
            />
          }
          kind={kind}
          customer={customer}
          advanced={{ filters: advanced, sort }}
          dateRange={{ from, to }}
          status={status}
          metric={metric}
          statusOptions={statusOptions}
          onClose={() => setFiltersOpen(false)}
          onApply={(nextStatus, nextMetric, nextDates, nextCustomer, nextAdvanced, nextSort) => {
            setAdvanced(nextAdvanced);
            setSort(nextSort);
            setCustomer(nextCustomer);
            setFrom(nextDates.from || '');
            setTo(nextDates.to || '');
            setStatus(nextStatus);
            setMetric(nextMetric);
            setPage(1);
            setDraftError('');
            setFiltersOpen(false);
          }}
        />
      )}
    </>
  );
}
export function Payments(props: Props) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const summary = !['tab', 'view', 'status', 'direction', 'search', 'page'].some((key) =>
    params.has(key),
  );
  return <PaymentsWorkspace {...props} summary={summary} />;
}
function PaymentsWorkspace({ notify, readonly, summary }: Props & { summary: boolean }) {
  const [creatingFund, setCreatingFund] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [batch, setBatch] = useState(false);
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const from = paymentReturnRoute(params.get('from'));
  const originParams: Record<string, string> = from ? { from } : {};
  const initialTab = params.get('tab');
  const tab = initialTab === 'history' || initialTab === 'funds' ? initialTab : 'pending';
  const [search, setSearch] = useState(params.get('search') || '');
  const [query, setQuery] = useState(search);
  const [page, setPage] = useState(Math.max(1, Number(params.get('page')) || 1));
  useListRoute(
    'payments',
    {
      ...Object.fromEntries(params),
      tab,
      search: query,
      page: String(page),
    },
    !summary,
  );
  const [revision, setRevision] = useState(0);
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
  const {
    data: payments,
    error,
    loading,
  } = useRemote<Payment[]>(
    '/payments?search=' + encodeURIComponent(tab === 'history' ? query : ''),
    revision,
  );
  const paymentParams = new URLSearchParams(location.hash.split('?')[1]);
  const paymentMetric =
    tab === 'pending'
      ? (paymentParams.get('status') !== 'all' && paymentParams.get('status')) ||
        (paymentParams.get('direction') !== 'all' && paymentParams.get('direction')) ||
        ''
      : '';
  return (
    <>
      <PageHeading
        title="Cobros y pagos"
        subtitleLink={
          summary
            ? { href: '#payments?tab=pending&from=payments', label: 'Ver todos los vencimientos' }
            : undefined
        }
        backLink={from ? { href: '#' + from, label: 'Atrás' } : undefined}
        tools={
          <HeaderListSearch
            key={tab}
            scope={tab === 'pending' ? 'pending' : tab === 'funds' ? 'funds' : 'payments'}
            label={
              tab === 'history'
                ? 'Buscar movimientos'
                : tab === 'funds'
                  ? 'Buscar anticipos y fondos'
                  : 'Buscar cobros y pagos'
            }
            placeholder="Documento, nombre o petición…"
            value={query}
            onApply={(value) =>
              navigate(
                'payments?' +
                  new URLSearchParams({ tab, search: value, page: '1', ...originParams }),
              )
            }
            onClear={() =>
              navigate('payments?' + new URLSearchParams({ tab, page: '1', ...originParams }))
            }
          />
        }
        menu={[
          !readonly &&
            tab === 'funds' && {
              label: 'Registrar anticipo',
              group: 'Registrar movimientos',
              icon: Wallet,
              onAction: () => setCreatingFund(true),
            },
          !readonly && {
            label: 'Registrar cobro o pago',
            group: 'Registrar movimientos',
            icon: Plus,
            onAction: () => setBatch(true),
          },
          {
            label: 'Movimientos registrados',
            group: 'Consultar y exportar',
            icon: History,
            href: '#payments?' + new URLSearchParams({ tab: 'history', ...originParams }),
          },
          {
            label: 'Anticipos y fondos',
            group: 'Consultar y exportar',
            icon: Wallet,
            href: '#payments?' + new URLSearchParams({ tab: 'funds', ...originParams }),
          },
          {
            label: 'Exportar movimientos',
            group: 'Consultar y exportar',
            icon: Download,
            href: downloadUrl('/export/payments'),
          },
        ]}
      />
      <div className="page-content payments-page">
        {summary ? (
          <RemoteModuleKpis
            path="/module-kpis/payments"
            revision={revision}
            active={paymentMetric}
            href={(id) =>
              'payments?tab=pending&' +
              (['receivable', 'payable'].includes(id) ? 'direction' : 'status') +
              '=' +
              id +
              '&from=payments'
            }
          />
        ) : (
          <section className="panel table-panel">
            <ListToolbar
              label="Herramientas de cobros y pagos"
              filterLabel="Filtrar cobros y pagos"

              filterCount={countAppliedFilters(
                tab === 'pending'
                  ? {
                      status: paymentParams.get('status'),
                      direction: paymentParams.get('direction'),
                    }
                  : {},
                {
                  search: query,
                  scope: tab === 'pending' ? 'pending' : tab === 'funds' ? 'funds' : 'payments',
                },
              )}
              filtersOpen={filtersOpen}
              onOpenFilters={() => setFiltersOpen(true)}
            />
            {tab === 'history' && (
              <p className="list-scope muted small">
                {query ? 'Hasta 250 coincidencias' : 'Últimos 250 movimientos'}
              </p>
            )}
            {tab === 'funds' ? (
              <Funds
                filter={query}
                creating={creatingFund}
                onCloseCreate={() => setCreatingFund(false)}
                readonly={readonly}
                notify={notify}
                onChange={() => setRevision((v) => v + 1)}
              />
            ) : tab === 'pending' ? (
              <PendingDueDates revision={revision} search={query} page={page} />
            ) : error ? (
              <ErrorBox>{error}</ErrorBox>
            ) : loading ? (
              <Loading />
            ) : payments?.length ? (
              <div className="table-scroll document-list-scroll">
                <table
                  className="document-list document-list-balanced document-list-priced"
                  aria-label="Movimientos registrados"
                >
                  <colgroup>
                    <col className="document-column-identity" />
                    <col className="document-column-party" />
                    <col className="document-column-due" />
                    <col className="document-column-status" />
                    <col className="document-column-price" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Razón social</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th className="numeric">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className={`record-row${p.reversed_at ? ' muted-row' : ''}`}
                        onClick={openTableRow}
                      >
                        <td className="doc-identity">
                          <a
                            href={
                              '#document/' +
                              p.document_id +
                              '?from=' +
                              encodeURIComponent(
                                'payments?' +
                                  new URLSearchParams({ tab: 'history', ...originParams }) +
                                  (query ? '&search=' + encodeURIComponent(query) : ''),
                              ) +
                              '&entry=' +
                              p.id
                            }
                            className="document-link"
                          >
                            <strong>{p.number}</strong>
                          </a>
                        </td>
                        <td className="doc-party">
                          {contactDetailHref(p.party_tax_id || '') ? (
                            <a
                              className="text-link table-name"
                              href={contactDetailHref(
                                p.party_tax_id!,
                                'payments?' +
                                  new URLSearchParams({ tab: 'history', ...originParams }) +
                                  (query ? '&search=' + encodeURIComponent(query) : ''),
                              )}
                            >
                              {p.party_name}
                            </a>
                          ) : (
                            p.party_name
                          )}
                          <MovementReference value={p.reference} />
                        </td>
                        <td className="doc-due" data-label="Fecha">
                          <time dateTime={p.date}>{tableDate(p.date)}</time>
                          <small>{labels[p.method]}</small>
                        </td>
                        <td className="doc-status">
                          <DocumentStatusLabel
                            status={
                              p.reversed_at
                                ? 'Revertido'
                                : p.kind === 'invoice' ||
                                    (p.kind === 'credit' && p.credit_side === 'purchase')
                                  ? 'Cobro'
                                  : 'Pago'
                            }
                          />
                        </td>
                        <td className="numeric total-cell doc-price" data-label="Importe">
                          {p.kind === 'invoice' ||
                          (p.kind === 'credit' && p.credit_side === 'purchase')
                            ? '+'
                            : '−'}
                          {euros(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                showMessage={Boolean(query)}
                title={query ? 'No hay resultados' : 'Todavía no hay movimientos'}
                description={
                  query
                    ? 'Prueba con otro documento, nombre, NIF o referencia.'
                    : readonly
                      ? undefined
                      : 'Registra el primer cobro o pago desde el detalle de una factura.'
                }
              />
            )}
          </section>
        )}
      </div>
      {filtersOpen && (
        <PaymentFilters
          tab={tab}
          status={params.get('status') || 'all'}
          direction={params.get('direction') || 'all'}
          search={query}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {batch && (
        <BatchPayment
          onClose={() => setBatch(false)}
          onSaved={() => {
            setBatch(false);
            setRevision((v) => v + 1);
            notify('Movimiento repartido y saldos actualizados.');
          }}
        />
      )}
    </>
  );
}
export function Catalog({ notify, readonly }: Props) {
  const [revision, setRevision] = useState(0);
  const { data, error, loading } = useRemote<Product[]>('/products', revision);
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const selectedProductId = params.get('product') || '';
  const showList = ['view', 'metric', 'status', 'search', 'product'].some((key) => params.has(key));
  const [search, setSearch] = useState(params.get('search') || '');
  const [metric, setMetric] = useState(
    ['active', 'unpriced', 'archived'].includes(params.get('metric') || '')
      ? params.get('metric')!
      : '',
  );
  const [status, setStatus] = useState(
    ['active', 'archived'].includes(params.get('status') || '') ? params.get('status')! : 'all',
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const matchesMetric = (p: Product, id: string) =>
    id === 'active'
      ? p.active
      : id === 'archived'
        ? !p.active
        : id === 'unpriced'
          ? p.active && Number(p.unitPrice) === 0
          : true;
  const catalogMetrics = [
    { id: 'all', label: 'Artículos en catálogo' },
    { id: 'active', label: 'Artículos activos' },
    { id: 'unpriced', label: 'Sin precio' },
    { id: 'archived', label: 'Archivados' },
  ];
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  useListRoute(
    'catalog',
    {
      view: 'list',
      ...(search ? { search } : {}),
      ...(metric ? { metric } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(selectedProductId ? { product: selectedProductId } : {}),
    },
    showList,
  );
  const deleteTrigger = useRef<HTMLButtonElement>(null);
  let catalogPlan = null;
  try {
    catalogPlan = decodeSearch(search, 'catalog');
  } catch {}
  const filtered = filterSearchRows(
    (data || []).filter(
      (p) => catalogPlan || (matchesMetric(p, metric) && matchesMetric(p, status)),
    ),
    search,
    'catalog',
    (p) => ({
      text: p.name + ' ' + p.sku + ' ' + p.description,
      amount: p.unitPrice,
      active: p.active,
    }),
  );
  const selectedProduct = data?.find((product) => product.id === selectedProductId);
  const productIndex = filtered?.findIndex((product) => product.id === selectedProductId) ?? -1;
  const catalogRoute =
    'catalog?' +
    new URLSearchParams({
      view: 'list',
      ...(search ? { search } : {}),
      ...(metric ? { metric } : {}),
      ...(status !== 'all' ? { status } : {}),
    });
  const productHref = (offset: number) => {
    const product = productIndex >= 0 ? filtered?.[productIndex + offset] : undefined;
    return product ? '#' + catalogRoute + '&product=' + product.id : undefined;
  };
  const showStatus = filtered?.some((product) => !product.active) ?? false;
  const filtersActive = !!metric || status !== 'all';
  const clearFilters = () => {
    setMetric('');
    setStatus('all');
    setSearch('');
  };
  const loadError = error && (
    <div className="list-error">
      <ErrorBox>{error}</ErrorBox>
      <button className="button" onClick={() => setRevision((value) => value + 1)}>
        Reintentar
      </button>
    </div>
  );
  return (
    <>
      {/* FUENTE: 03-module-header.md y 18-add-button.md, TeamModule.tsx:1679–1689; mismo regreso que ventas.
          El detalle de un artículo ya no sustituye esta cabecera: se muestra en la
          ventana modal ProductDetailModal, con la lista siempre visible detrás. */}
      <PageHeading
        title="Catálogo"
        backLink={showList ? { href: '#catalog', label: 'Catálogo' } : undefined}
        subtitleLink={
          !showList ? { href: '#catalog?view=list', label: 'Ver todo el catálogo' } : undefined
        }
        tools={
          <HeaderListSearch
            scope="catalog"
            label="Buscar catálogo"
            placeholder="Artículo, código o petición…"
            value={search}
            onApply={(value) =>
              navigate('catalog?' + new URLSearchParams({ view: 'list', search: value }))
            }
            onClear={() =>
              navigate(
                'catalog?' +
                  new URLSearchParams({
                    view: 'list',
                    ...(metric ? { metric } : {}),
                    ...(status !== 'all' ? { status } : {}),
                  }),
              )
            }
          />
        }
        primaryAction={
          !readonly && {
            label: 'Nuevo artículo',
            icon: Plus,
            onAction: () => setEditing('new'),
          }
        }
      />
      <div className={`page-content${showList ? ' catalog-list-page' : ' catalog-summary-page'}`}>
        {selectedProductId && !loading && !error && !selectedProduct && (
          <Empty
            showMessage
            title="No se encuentra el artículo"
            action={
              <a className="button" href={'#' + catalogRoute}>
                Volver al catálogo
              </a>
            }
          />
        )}
        {!selectedProductId &&
          !showList &&
          (loadError ||
            (loading ? (
              <Loading compact />
            ) : (
              data && (
                <ModuleKpis
                  href={(id) => 'catalog?view=list&metric=' + id}
                  items={catalogMetrics.map((item) => ({
                    ...item,
                    context: '',
                    value: String(data.filter((p) => matchesMetric(p, item.id)).length),
                    format: 'count',
                  }))}
                />
              )
            )))}
        {showList && (
          <section className="panel table-panel">
            <ListToolbar
              label="Herramientas del catálogo"
              filterLabel="Filtros del catálogo"

              filterCount={countAppliedFilters(catalogPlan?.filters || { metric, status })}
              filtersOpen={filtersOpen}
              onOpenFilters={() => setFiltersOpen(true)}
            />
            {error ? (
              loadError
            ) : loading ? (
              <Loading />
            ) : filtered?.length ? (
              <div className="table-scroll">
                <table className="catalog-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Artículo</th>
                      <th>Unidad</th>
                      <th className="numeric">Precio</th>
                      <th className="numeric">IVA</th>
                      {showStatus && <th>Estado</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="record-row" onClick={openTableRow}>
                        <td className="catalog-code">{p.sku}</td>
                        <td className="catalog-name">
                          <a
                            className="table-name document-link"
                            href={'#' + catalogRoute + '&product=' + p.id}
                          >
                            {p.name}
                          </a>
                        </td>
                        <td className="catalog-unit">{p.unit}</td>
                        <td className="numeric total-cell catalog-price">{euros(p.unitPrice)}</td>
                        <td className="numeric catalog-tax">{p.taxRate} %</td>
                        {showStatus && (
                          <td className="catalog-status">
                            {p.active ? null : <DocumentStatusLabel status="Archivado" />}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                showMessage={Boolean(search || filtersActive)}
                title={search || filtersActive ? 'No hay resultados' : 'Todavía no hay artículos'}
                description={search ? 'Prueba con otro nombre o código.' : undefined}
                action={
                  search || filtersActive ? (
                    <button className="button" onClick={clearFilters}>
                      Limpiar filtros
                    </button>
                  ) : (
                    !readonly && (
                      <button className="button primary" onClick={() => setEditing('new')}>
                        Nuevo artículo
                      </button>
                    )
                  )
                }
              />
            )}
          </section>
        )}
      </div>
      {showList && filtersOpen && (
        <ListFilters
          title="Filtros del catálogo"
          status={status}
          metric={metric}
          metricOptions={catalogMetrics.filter((item) => item.id !== 'all')}
          statusOptions={[
            ['all', 'Todos'],
            ['active', 'Activos'],
            ['archived', 'Archivados'],
          ]}
          onClose={() => setFiltersOpen(false)}
          onApply={(nextStatus, nextMetric) => {
            setStatus(nextStatus);
            setMetric(nextMetric);
            setSearch(literalSearch(search));
            setFiltersOpen(false);
          }}
        />
      )}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          readonly={readonly}
          position={productIndex < 0 ? null : productIndex + 1}
          count={filtered?.length ?? 0}
          previous={productHref(-1)}
          next={productHref(1)}
          loading={loading}
          error={error}
          onRetry={() => setRevision((v) => v + 1)}
          onClose={() => navigate(catalogRoute)}
          onEdit={() => setEditing(selectedProduct)}
          onDelete={() => {
            deleteTrigger.current =
              document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
            setDeleting(selectedProduct);
          }}
        />
      )}
      {editing && (
        <ProductForm
          product={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setRevision((v) => v + 1);
            notify('Artículo guardado.');
          }}
        />
      )}
      {deleting && (
        <DeleteProduct
          product={deleting}
          onClose={() => {
            setDeleting(null);
            requestAnimationFrame(() => deleteTrigger.current?.focus());
          }}
          onDeleted={() => {
            setDeleting(null);
            setRevision((value) => value + 1);
            notify('Artículo eliminado.');
            navigate(catalogRoute);
            requestAnimationFrame(() =>
              document.querySelector<HTMLElement>('.page-heading .command-trigger')?.focus(),
            );
          }}
        />
      )}
    </>
  );
}
