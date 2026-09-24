import { AmountRangeFilter } from './AmountRangeFilter';
import { wholeAmountRange } from './amount-range';
import { FilterSection } from './FilterSection';
import { useRef, useState, type ReactNode } from 'react';
import { Field, Modal } from './components';
import { Select } from './Select';
import { today } from './api';
import {
  advancedSalesSchema,
  datePreset,
  salesSortOptions,
  type AdvancedSalesFilters,
} from '../shared/sales-tools';
import type { DocumentSort } from '../shared/document-list';
import {
  documentDateRangeSchema,
  type DocumentDateRange,
  type DocumentCustomer,
} from '../shared/document-list';

// FUENTE: 15-side-panel-filters.md, AbsencesModule.tsx:3040–3314.
// Modal, Field y Select conservan la tipografía y accesibilidad del sistema vigente.
export function ListFilters({
  title,
  amountSource,
  quote = false,
  purchase = false,
  dateRange,
  advanced,
  customer,
  status,
  metric,
  metricOptions,
  tools,
  statusOptions,
  onClose,
  onApply,
}: {
  title: string;
  amountSource?: string;
  tools?: ReactNode;
  quote?: boolean;
  purchase?: boolean;
  dateRange?: DocumentDateRange;
  advanced?: { filters: AdvancedSalesFilters; sort: DocumentSort };
  customer?: {
    value: string;
    options: DocumentCustomer[];
    loading: boolean;
    error: string;
    onRetry: () => void;
  };
  status: string;
  metric: string;
  metricOptions?: { id: string; label: string }[];
  statusOptions: string[][];
  onClose: () => void;
  onApply: (
    status: string,
    metric: string,
    dates: DocumentDateRange,
    customer: string,
    extra: AdvancedSalesFilters,
    sort: DocumentSort,
  ) => void;
}) {
  const [nextStatus, setNextStatus] = useState(status);
  const [nextMetric, setNextMetric] = useState(metric);
  const [nextCustomer, setNextCustomer] = useState(customer?.value || '');
  const [nextFrom, setNextFrom] = useState(dateRange?.from || '');
  const [nextTo, setNextTo] = useState(dateRange?.to || '');
  const [dateErrors, setDateErrors] = useState<{ from?: string; to?: string }>({});
  const [nextAdvanced, setNextAdvanced] = useState<AdvancedSalesFilters>(() => ({
    ...advanced?.filters,
    ...wholeAmountRange(advanced?.filters || {}),
  }));
  const [nextSort, setNextSort] = useState<DocumentSort>(advanced?.sort || 'default');
  const [advancedError, setAdvancedError] = useState('');
  const [advancedField, setAdvancedField] = useState('');
  const [nextPeriod, setNextPeriod] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [priceErrors, setPriceErrors] = useState<{ minTotal?: string; maxTotal?: string }>({});
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  return (
    <Modal title={title} onClose={onClose} sidePanel>
      <form
        className="side-panel-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const dates = documentDateRangeSchema.safeParse(
            dateRange ? { from: nextFrom || undefined, to: nextTo || undefined } : {},
          );
          if (!dates.success) {
            const errors = {
              from: dates.error.issues.find((issue) => issue.path[0] === 'from')?.message,
              to: dates.error.issues.find((issue) => issue.path[0] === 'to')?.message,
            };
            setDateErrors(errors);
            setDatesOpen(true);
            requestAnimationFrame(() => (errors.from ? fromRef : toRef).current?.focus());
            return;
          }
          const extras = advancedSalesSchema.safeParse(
            Object.fromEntries(Object.entries(nextAdvanced).filter(([, v]) => !!v?.trim())),
          );
          if (!extras.success) {
            const errors = {
              minTotal: extras.error.issues.find((issue) => issue.path[0] === 'minTotal')?.message,
              maxTotal: extras.error.issues.find((issue) => issue.path[0] === 'maxTotal')?.message,
            };
            setPriceErrors(errors);
            if (!errors.minTotal && !errors.maxTotal) {
              setAdvancedOpen(true);
              setAdvancedError(
                quote
                  ? extras.error.issues[0].message.replace('El vencimiento', 'La validez')
                  : extras.error.issues[0].message,
              );
              const field = String(extras.error.issues[0].path[0]);
              setAdvancedField(field);
              requestAnimationFrame(() =>
                document.getElementById('sales-filter-' + field)?.focus(),
              );
            }
            return;
          }
          onApply(nextStatus, nextMetric, dates.data, nextCustomer, extras.data, nextSort);
        }}
      >
        <div className="side-panel-body">
          <button
            className="quiet-link"
            type="button"
            onClick={() => {
              setNextStatus('all');
              setNextAdvanced({});
              setNextSort('default');
              setAdvancedError('');
              setNextMetric('');
              setNextCustomer('');
              setNextPeriod('');
              setNextFrom('');
              setNextTo('');
              setDateErrors({});
              setPriceErrors({});
            }}
          >
            Limpiar filtros
          </button>
          {!!metricOptions?.length && (
            <Field label="Indicador">
              <Select
                value={nextMetric}
                onChange={(event) => {
                  setNextMetric(event.target.value);
                  setNextStatus('all');
                }}
              >
                <option value="">Todos</option>
                {metricOptions.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Estado">
            <Select
              value={nextStatus}
              onChange={(event) => {
                setNextStatus(event.target.value);
                setNextMetric('');
              }}
            >
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {customer && (
            <div>
              <Field
                label={purchase ? 'Proveedor' : 'Cliente'}
                error={customer.error}
                hint={
                  customer.loading
                    ? purchase
                      ? 'Cargando proveedores…'
                      : 'Cargando clientes…'
                    : undefined
                }
              >
                <Select
                  searchable
                  value={nextCustomer}
                  disabled={customer.loading}
                  onChange={(event) => setNextCustomer(event.target.value)}
                >
                  <option value="">Todos</option>
                  {nextCustomer &&
                    !customer.options.some((item) => item.taxId === nextCustomer) && (
                      <option value={nextCustomer}>{nextCustomer}</option>
                    )}
                  {customer.options.map((item) => (
                    <option key={item.taxId} value={item.taxId}>
                      {item.name} · {item.taxId}
                    </option>
                  ))}
                </Select>
              </Field>
              {customer.error && (
                <button className="quiet-link" type="button" onClick={customer.onRetry}>
                  {purchase ? 'Reintentar proveedores' : 'Reintentar clientes'}
                </button>
              )}
            </div>
          )}
          {advanced && (
            <>
              <Field label="Ordenar por">
                <Select
                  value={nextSort}
                  onChange={(event) => setNextSort(event.target.value as DocumentSort)}
                >
                  {salesSortOptions
                    .filter(([value]) => !quote || value !== 'balance_desc')
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {quote ? label.replace('Vencimiento', 'Validez') : label}
                      </option>
                    ))}
                </Select>
              </Field>
              <AmountRangeFilter
                label="Intervalo de precios"
                source={amountSource!}
                minimum={nextAdvanced.minTotal}
                maximum={nextAdvanced.maxTotal}
                errors={priceErrors}
                onChange={(range) => {
                  setNextAdvanced((current) => ({ ...current, ...range }));
                  setPriceErrors({});
                }}
              />
            </>
          )}
          {dateRange && (
            <FilterSection title="Fecha de emisión" open={datesOpen} onOpenChange={setDatesOpen}>
              {advanced && (
                <Field label="Periodo">
                  <Select
                    value={nextPeriod}
                    onChange={(event) => {
                      setNextPeriod(event.target.value);
                      const range = datePreset(event.target.value, today());
                      setNextFrom(range.from || '');
                      setNextTo(range.to || '');
                      setDateErrors({});
                    }}
                  >
                    <option value="">Personalizado</option>
                    <option value="today">Hoy</option>
                    <option value="month">Este mes</option>
                    <option value="previous">Mes anterior</option>
                    <option value="quarter">Este trimestre</option>
                    <option value="year">Este año</option>
                  </Select>
                </Field>
              )}
              <Field label="Desde" error={dateErrors.from}>
                <input
                  ref={fromRef}
                  type="date"
                  min="0001-01-01"
                  max="9999-12-31"
                  value={nextFrom}
                  onChange={(event) => {
                    setNextPeriod('');
                    setNextFrom(event.target.value);
                    setDateErrors({});
                  }}
                />
              </Field>
              <Field label="Hasta" error={dateErrors.to}>
                <input
                  ref={toRef}
                  type="date"
                  min="0001-01-01"
                  max="9999-12-31"
                  value={nextTo}
                  onChange={(event) => {
                    setNextPeriod('');
                    setNextTo(event.target.value);
                    setDateErrors({});
                  }}
                />
              </Field>
            </FilterSection>
          )}
          {advanced && (
            <>
              <FilterSection
                title={quote ? 'Validez' : 'Vencimiento'}
                open={advancedOpen}
                onOpenChange={setAdvancedOpen}
              >
                <div className="sales-filter-extra">
                  {(
                    [
                      ['dueFrom', quote ? 'Validez desde' : 'Vencimiento desde'],
                      ['dueTo', quote ? 'Validez hasta' : 'Vencimiento hasta'],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      error={advancedField === key ? advancedError : undefined}
                    >
                      <input
                        id={'sales-filter-' + key}
                        aria-invalid={advancedField === key && !!advancedError}
                        type="date"
                        min="0001-01-01"
                        max="9999-12-31"
                        value={nextAdvanced[key] || ''}
                        onChange={(event) => {
                          setNextAdvanced((v) => ({ ...v, [key]: event.target.value }));
                          setAdvancedError('');
                        }}
                      />
                    </Field>
                  ))}
                </div>
              </FilterSection>
            </>
          )}
          {tools}
        </div>
        <div className="modal-actions side-panel-actions">
          <button className="button primary" type="submit">
            Aplicar
          </button>
        </div>
      </form>
    </Modal>
  );
}
