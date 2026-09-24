import { openTableRow } from './row-navigation';
import { TableSortButton } from './TableSortButton';
import { useEffect } from 'react';

import { contactDetailHref } from './contact-route';
import { ChevronLeft, ChevronRight, FileText, Wallet } from 'lucide-react';
import { euros, getActiveWorkspace, navigate, tableDate } from './api';
import { ErrorBox, Loading, PanelHeading, useRemote } from './components';
import {
  dueDateLabel,
  paymentReturnRoute,
  parseDueSort,
  dueDateRoute,
  dueDirectionLabel,
  dueInstallmentLabel,
  type DashboardDues,
  type DueDate,
  type DueDateList,
  type DueDirection,
  type DueStatus,
} from '../shared/due-dates';

type ReturnPosition = { top: number; item: string };
const positions = new Map<string, ReturnPosition>();
const positionKey = (route: string) => `${getActiveWorkspace() || ''}:${route}`;
const dueKey = (due: DueDate) => `${due.document_id}:${due.position}`;
function rememberPosition(route: string, item: string) {
  positions.set(positionKey(route), { top: window.scrollY, item });
}
function restorePosition(route: string) {
  const key = positionKey(route);
  const position = positions.get(key);
  if (!position) return;
  const target = document.querySelector<HTMLElement>(`[data-due-key="${position.item}"]`);
  if (!target) return;
  target.focus({ preventScroll: true });
  window.scrollTo(0, position.top);
  positions.delete(key);
}
export function useDueReturnPosition(ready: boolean, route: string) {
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => restorePosition(route));
    return () => cancelAnimationFrame(frame);
  }, [ready, route]);
}
const documentHref = (due: DueDate, route: string) =>
  `#document/${due.document_id}?from=${encodeURIComponent(route)}&entry=${due.document_id}:${due.position}`;

export function DueDatesCard({
  data,
  returnTo = 'overview',
}: {
  data: DashboardDues;
  returnTo?: string;
}) {
  return (
    <section className="panel due-card" aria-label="Vencimientos">
      <PanelHeading
        title="Vencimientos"
        action={
          <a
            className="text-link"
            href={'#' + dueDateRoute('all', 'all', 1, '', 'default', returnTo)}
            data-due-key="all"
            onClick={() => rememberPosition(returnTo, 'all')}
          >
            Ver todos
          </a>
        }
      />
      {data.overdue.count > 0 && (
        <a
          className="due-overdue"
          href={'#' + dueDateRoute('overdue', 'all', 1, '', 'default', returnTo)}
          data-due-key="overdue"
          onClick={() => rememberPosition(returnTo, 'overdue')}
        >
          <span>
            <strong>
              {data.overdue.count}{' '}
              {data.overdue.count === 1 ? 'vencimiento atrasado' : 'vencimientos atrasados'}
            </strong>
            <span>
              Ver atrasados <ChevronRight size={13} />
            </span>
          </span>
          <strong className="numeric">
            {euros(data.overdue.amount)}
            <small>Pendiente</small>
          </strong>
        </a>
      )}
      {data.upcoming.length > 0 && (
        <ul className="due-card-list">
          {data.upcoming.map((due) => (
            <li key={dueKey(due)}>
              <a
                className="due-card-row"
                href={documentHref(due, returnTo)}
                data-due-key={dueKey(due)}
                onClick={() => rememberPosition(returnTo, dueKey(due))}
                aria-label={`Abrir ${due.number} de ${due.party_name}${dueInstallmentLabel(due) ? ', ' + dueInstallmentLabel(due) : ''}`}
              >
                <span className="due-party">
                  <strong>{due.party_name}</strong>
                  <small>
                    {due.number}
                    {dueInstallmentLabel(due) && <span> · {dueInstallmentLabel(due)}</span>}
                  </small>
                </span>
                <strong className="numeric due-amount">{euros(due.balance)}</strong>
                <span className="due-row-meta">
                  <span className="due-direction">{dueDirectionLabel(due.direction)}</span>
                  <time dateTime={due.due_date}>{dueDateLabel(due.due_date, data.as_of)}</time>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DueDateEntry({
  due,
  route,
  asOf,
  onPayment,
}: {
  due: DueDate;
  route: string;
  asOf: string;
  onPayment?: (due: DueDate) => void;
}) {
  return (
    <tr className="due-entry record-row" onClick={openTableRow}>
      <td className="doc-identity">
        <div className="doc-identity-content">
          <a
            className="document-link"
            href={documentHref(due, route)}
            data-due-key={dueKey(due)}
            onClick={() => rememberPosition(route, dueKey(due))}
            aria-label={`Abrir ${due.number} de ${due.party_name}${dueInstallmentLabel(due) ? ', ' + dueInstallmentLabel(due) : ''}`}
          >
            <span>
              <strong>{due.number}</strong>
              {dueInstallmentLabel(due) && <small>{dueInstallmentLabel(due)}</small>}
            </span>
          </a>
        </div>
      </td>
      <td className="doc-party">
        {contactDetailHref(due.party_tax_id || '') ? (
          <a className="text-link table-name" href={contactDetailHref(due.party_tax_id!, route)}>
            {due.party_name}
          </a>
        ) : (
          <span className="table-name">{due.party_name}</span>
        )}
      </td>
      <td className="doc-due" data-label="Vencimiento">
        <time dateTime={due.due_date}>{tableDate(due.due_date)}</time>
      </td>
      <td className="doc-status">
        {dueDirectionLabel(due.direction)}
        {due.due_date < asOf && <small>Atrasado</small>}
      </td>
      <td className="numeric total-cell doc-price" data-label="Pendiente">
        {euros(due.balance)}
      </td>
    </tr>
  );
}

function readDueFilters() {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const status: DueStatus =
    params.get('status') === 'overdue'
      ? 'overdue'
      : params.get('status') === 'upcoming'
        ? 'upcoming'
        : 'all';
  const direction: DueDirection | 'all' =
    params.get('direction') === 'receivable'
      ? 'receivable'
      : params.get('direction') === 'payable'
        ? 'payable'
        : 'all';
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.get('page')) || 1)));
  return { status, direction, page, sort: parseDueSort(params.get('sort')) };
}

export function PendingDueDates({
  revision,
  search = '',
  page,
  onPayment,
}: {
  onPayment?: (due: DueDate) => void;
  revision: number;
  search?: string;
  page: number;
}) {
  const { status, direction, sort } = readDueFilters();
  const from = paymentReturnRoute(new URLSearchParams(location.hash.split('?')[1]).get('from'));
  const route = dueDateRoute(status, direction, page, search, sort, from);
  const { data, loading, error } = useRemote<DueDateList>(
    `/due-dates?status=${status}&direction=${direction}&page=${page}&search=${encodeURIComponent(search)}&sort=${sort}`,
    revision,
  );
  useDueReturnPosition(!loading && !!data, route);
  return (
    <div className="pending-dues">
      <div className="table-scroll document-list-scroll">
        <table
          className={`document-list document-list-balanced document-list-priced document-list-filtered due-list`}
          aria-label="Vencimientos pendientes"
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
              <th scope="col">Documento</th>
              <th scope="col">Cliente / proveedor</th>
              <th
                scope="col"
                className="document-sort-heading"
                aria-sort={
                  sort === 'due_desc' ? 'descending' : sort === 'due_asc' ? 'ascending' : 'none'
                }
              >
                <TableSortButton
                  label="Vencimiento"
                  direction={
                    sort === 'due_desc'
                      ? 'descending'
                      : sort === 'due_asc'
                        ? 'ascending'
                        : undefined
                  }
                  onToggle={() =>
                    navigate(
                      dueDateRoute(
                        status,
                        direction,
                        1,
                        search,
                        sort === 'due_desc' ? 'due_asc' : 'due_desc',
                        from,
                      ),
                    )
                  }
                />
              </th>
              <th scope="col">Estado</th>
              <th
                className="numeric document-sort-heading"
                scope="col"
                aria-sort={
                  sort === 'balance_desc'
                    ? 'descending'
                    : sort === 'balance_asc'
                      ? 'ascending'
                      : 'none'
                }
              >
                <TableSortButton
                  label="Pendiente"
                  direction={
                    sort === 'balance_desc'
                      ? 'descending'
                      : sort === 'balance_asc'
                        ? 'ascending'
                        : undefined
                  }
                  onToggle={() =>
                    navigate(
                      dueDateRoute(
                        status,
                        direction,
                        1,
                        search,
                        sort === 'balance_desc' ? 'balance_asc' : 'balance_desc',
                        from,
                      ),
                    )
                  }
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {error || loading || !data?.rows.length ? (
              <tr className="document-table-feedback">
                <td colSpan={5}>
                  {error ? (
                    <div className="list-error">
                      <ErrorBox>{error}</ErrorBox>
                    </div>
                  ) : loading ? (
                    <Loading />
                  ) : search || status !== 'all' || direction !== 'all' ? (
                    <div className="due-empty" role="status">
                      <p>
                        {search
                          ? 'No hay resultados para esta búsqueda'
                          : status === 'upcoming'
                            ? 'No hay próximos vencimientos'
                            : status === 'overdue'
                              ? 'No hay vencimientos atrasados'
                              : 'No hay vencimientos pendientes'}
                        {!search && direction !== 'all'
                          ? ` ${direction === 'receivable' ? 'por cobrar' : 'por pagar'}`
                          : ''}
                      </p>
                    </div>
                  ) : null}
                </td>
              </tr>
            ) : (
              data.rows.map((due) => (
                <DueDateEntry
                  key={route + ':' + dueKey(due)}
                  due={due}
                  route={route}
                  asOf={data.as_of}
                  onPayment={onPayment}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && !error && data && (data.count > data.pageSize || page > 1) && (
        <div className="table-footer">
          <span role="status">
            {data.count
              ? `${Math.min((page - 1) * data.pageSize + 1, data.count)}–${Math.min(page * data.pageSize, data.count)} de ${data.count}`
              : '0 vencimientos'}
          </span>
          <div className="pagination">
            <button
              className="icon-button"
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() =>
                navigate(dueDateRoute(status, direction, page - 1, search, sort, from))
              }
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
              onClick={() =>
                navigate(dueDateRoute(status, direction, page + 1, search, sort, from))
              }
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
