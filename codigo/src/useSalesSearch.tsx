import { useEffect, useMemo, useRef, useState } from 'react';
import { api, euros, today } from './api';
import { Field } from './components';
import { Select } from './Select';
import type { DocumentCustomer } from '../shared/document-list';
import type { DocumentQuery } from '../shared/sales-tools';
import {
  interpretSalesSearch,
  salesSearchCustomers,
  type SalesSearchFilters,
} from '../shared/sales-search';

export function useSalesSearch({
  enabled,
  kind = 'sales',
  open,
  text,
  workspaceId,
  applied,
  literalApplied,
  showApplyAction = true,
  onApply,
  onLiteral,
}: {
  enabled: boolean;
  kind?: 'sales' | 'quote' | 'purchase';
  open: boolean;
  text: string;
  workspaceId?: string;
  applied?: Partial<DocumentQuery>;
  literalApplied: boolean;
  showApplyAction?: boolean;
  onApply: (filters: SalesSearchFilters, text: string) => void;
  onLiteral: (text: string) => void;
}) {
  const partyLabel = kind === 'purchase' ? 'Proveedor' : 'Cliente';
  const partiesLabel = kind === 'purchase' ? 'proveedores' : 'clientes';
  const [selection, setSelection] = useState({ text: '', taxId: '' });
  const [year, setYear] = useState<{ text: string; value: string } | null>(null);
  const [editingYear, setEditingYear] = useState('');
  const [cache, setCache] = useState<{
    workspaceId?: string;
    kind: string;
    rows: DocumentCustomer[];
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const anchor = today();
  const interpretation = useMemo(
    () =>
      interpretSalesSearch(
        text,
        anchor,
        year?.text === text ? Number(year.value) : undefined,
        kind,
      ),
    [text, anchor, year, kind],
  );
  const needsCustomer =
    enabled && open && !literalApplied && !!(interpretation.customerText || applied?.customer);
  const customers =
    cache?.workspaceId === workspaceId && cache?.kind === kind ? cache?.rows : undefined;
  useEffect(() => {
    if (!needsCustomer || customers) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<DocumentCustomer[]>('/document-customers?kind=' + kind, {
      signal: controller.signal,
      workspaceId,
    })
      .then((rows) => {
        if (!controller.signal.aborted) {
          setCache({ workspaceId, kind, rows });
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [needsCustomer, workspaceId, revision, customers, kind]);
  const matches =
    interpretation.customerText && customers
      ? salesSearchCustomers(interpretation.customerText, customers)
      : [];
  const selected =
    matches.length === 1
      ? matches[0]
      : matches.find((c) => selection.text === text && c.taxId === selection.taxId);
  const ready = interpretation.kind === 'filters' && (!interpretation.customerText || !!selected);
  const submit = () => {
    if (applied) return true;
    if (literalApplied || interpretation.kind === 'literal') {
      onLiteral(text);
      return true;
    }
    if (!ready) {
      previewRef.current?.querySelector<HTMLElement>('.app-select-trigger, input')?.focus();
      return false;
    }
    onApply({ ...interpretation.filters, ...(selected ? { customer: selected.taxId } : {}) }, text);
    return true;
  };
  if (enabled && open && !text.trim())
    return {
      submit,
      preview: (
        <p className="sales-search-preview">
          {kind === 'quote'
            ? 'Ej.: presupuestos aceptados de septiembre'
            : kind === 'purchase'
              ? 'Ej.: compras pendientes de Ana por más de 500 €'
              : 'Ej.: pendientes de Ana por más de 500 €'}
        </p>
      ),
    };
  if (!enabled || !open || literalApplied || interpretation.kind === 'literal')
    return { submit, preview: null };
  const date = (value?: string) => value?.split('-').reverse().join('/') || '…';
  const savedLabels = applied
    ? [
        applied.customer &&
          partyLabel +
            ': ' +
            (customers?.find((c) => c.taxId === applied.customer)?.name || applied.customer),
        applied.status &&
          applied.status !== 'all' &&
          'Estado: ' +
            ({
              issued: 'Emitidas',
              recorded: 'Contabilizadas',
              unpaid: 'Pendientes',
              overdue: 'Vencidas',
              paid: kind === 'purchase' ? 'Pagadas' : 'Cobradas',
              draft: 'Borradores',
              sent: 'Pendientes de respuesta',
              accepted: 'Aceptados',
              rejected: 'Rechazados',
              converted: 'Convertidos',
              expired: 'Caducados',
            }[applied.status] || applied.status),
        (applied.from || applied.to) && `Emisión: ${date(applied.from)}–${date(applied.to)}`,
        (applied.dueFrom || applied.dueTo) &&
          `Vencimiento: ${date(applied.dueFrom)}–${date(applied.dueTo)}`,
        applied.minTotal && 'Total mínimo: ' + euros(applied.minTotal),
        applied.maxTotal && 'Total máximo: ' + euros(applied.maxTotal),
        applied.sort &&
          applied.sort !== 'default' &&
          'Orden: ' +
            ({
              total_desc: 'mayor importe primero',
              total_asc: 'menor importe primero',
              date_asc: 'emisión más antigua',
              due_asc: 'vencimiento más cercano',
              due_desc: 'vencimiento más lejano',
              balance_desc: 'mayor saldo pendiente',
              balance_asc: 'menor saldo pendiente',
            }[applied.sort] || applied.sort),
      ].filter(Boolean)
    : [];
  return {
    submit,
    preview: (
      <div className="sales-search-preview" ref={previewRef}>
        {(applied || interpretation.kind !== 'error') && (
          <p role="status" aria-live="polite">
            {applied
              ? savedLabels.join(' · ')
              : [
                  ...(selected ? [partyLabel + ': ' + selected.name + ' · ' + selected.taxId] : []),
                  ...interpretation.labels,
                ].join(' · ')}
          </p>
        )}
        {!applied && interpretation.kind === 'error' && (
          <p role="alert">
            Búsqueda no aplicada. {interpretation.error} Se mantienen los resultados anteriores.
          </p>
        )}
        {!applied &&
          interpretation.customerText &&
          interpretation.kind !== 'error' &&
          (loading || (!customers && !error) ? (
            <p role="status">Buscando {partiesLabel}…</p>
          ) : error ? (
            <div role="alert">
              <p>
                No se han podido consultar los {partiesLabel}. {error}
              </p>
              <button
                type="button"
                className="quiet-link"
                onClick={() => setRevision((v) => v + 1)}
              >
                Reintentar
              </button>
            </div>
          ) : matches.length === 0 ? (
            <p role="alert">
              No hay {partiesLabel} que coincidan con «{interpretation.customerText}». Revisa el
              nombre o escribe su NIF.
            </p>
          ) : matches.length > 1 ? (
            <Field label={kind === 'purchase' ? 'Elige el proveedor' : 'Elige el cliente'}>
              <Select
                searchable
                value={selected?.taxId || ''}
                onChange={(e) => setSelection({ text, taxId: e.target.value })}
              >
                <option value="">Seleccionar {partyLabel.toLowerCase()}</option>
                {matches.map((c) => (
                  <option key={c.taxId} value={c.taxId}>
                    {c.name} · {c.taxId}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null)}
        {!applied &&
          (interpretation.assumedYear || editingYear === text) &&
          (editingYear === text ? (
            <Field label="Año de la búsqueda">
              <input
                type="number"
                min="1"
                max="9999"
                value={year?.text === text ? year.value : interpretation.assumedYear}
                onChange={(e) => setYear({ text, value: e.target.value })}
              />
            </Field>
          ) : (
            <button type="button" className="quiet-link" onClick={() => setEditingYear(text)}>
              Cambiar año ({interpretation.assumedYear})
            </button>
          ))}
        {!applied && (
          <div className="sales-search-preview-actions">
            {ready && showApplyAction && (
              <button type="button" className="quiet-link" onClick={submit}>
                Aplicar búsqueda
              </button>
            )}
            <button type="button" className="quiet-link" onClick={() => onLiteral(text)}>
              Buscar como texto
            </button>
          </div>
        )}
      </div>
    ),
  };
}
