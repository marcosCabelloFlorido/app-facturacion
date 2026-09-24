import { AmountRangeFilter } from './AmountRangeFilter';
import { wholeAmountRange } from './amount-range';
import { FilterSection } from './FilterSection';
import { useState } from 'react';
import { type ContactActivityView, contactActivityViews } from '../shared/contacts';
import {
  contactActivityQuerySchema,
  contactActivityStatusOptions,
  type ContactActivityFilters as Filters,
} from '../shared/contact-activity-filters';
import { datePreset } from '../shared/sales-tools';
import { today } from './api';
import { Field, Modal } from './components';
import { Select } from './Select';
import { contactActivityLabels } from './contact-activity';

// FUENTE: 15-side-panel-filters.md y 06-input.md; rangos comunes de ListFilters.
export function ContactActivityFilters({
  view,
  contactId,
  filters,
  onClose,
  onApply,
}: {
  view: ContactActivityView;
  contactId: string;
  filters: Filters;
  onClose: () => void;
  onApply: (view: ContactActivityView, filters: Filters) => void;
}) {
  const [nextView, setNextView] = useState(view);
  const [draft, setDraft] = useState<Filters>(() => ({ ...filters, ...wholeAmountRange(filters) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState('');
  const [datesOpen, setDatesOpen] = useState(false);
  const movement = nextView === 'payments' || nextView === 'funds';
  const update = (key: keyof Filters, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors({});
  };
  return (
    <Modal title="Filtros de actividad" onClose={onClose} sidePanel>
      <form
        className="side-panel-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = contactActivityQuerySchema.safeParse({
            view: nextView,
            ...Object.fromEntries(Object.entries(draft).filter(([, value]) => !!value?.trim())),
          });
          if (!parsed.success) {
            setErrors(
              Object.fromEntries(
                parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
              ),
            );
            const field = String(parsed.error.issues[0].path[0]);
            const input = event.currentTarget.querySelector<HTMLElement>(`[name="${field}"]`);
            if (field === 'from' || field === 'to') setDatesOpen(true);
            requestAnimationFrame(() => input?.focus());
            return;
          }
          const { view: appliedView, search, page, ...appliedFilters } = parsed.data;
          onApply(appliedView, appliedFilters);
        }}
      >
        <div className="side-panel-body">
          <button
            className="quiet-link"
            type="button"
            onClick={() => {
              setNextView('documents');
              setDraft({ status: 'all' });
              setPeriod('');
              setErrors({});
            }}
          >
            Limpiar filtros
          </button>
          <Field label="Documentos y movimientos">
            <Select
              value={nextView}
              onChange={(event) => {
                setNextView(event.target.value as ContactActivityView);
                update('status', 'all');
              }}
            >
              {contactActivityViews
                .filter(
                  (value) =>
                    !['sales_net', 'purchases_net', 'receivable', 'payable'].includes(value) ||
                    value === view,
                )
                .map((value) => (
                  <option key={value} value={value}>
                    {contactActivityLabels[value]}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Estado" error={errors.status}>
            <Select value={draft.status} onChange={(event) => update('status', event.target.value)}>
              {contactActivityStatusOptions(nextView).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <AmountRangeFilter
            key={contactId + nextView}
            source={`/contacts/${contactId}/activity-amount-range?view=${nextView}`}
            label="Intervalo de precios"
            minimum={draft.minTotal}
            maximum={draft.maxTotal}
            errors={{ minTotal: errors.minTotal, maxTotal: errors.maxTotal }}
            onChange={(range) => {
              setDraft((current) => ({ ...current, ...range }));
              setErrors({});
            }}
          />
          <FilterSection
            title={movement ? 'Fecha del movimiento' : 'Fecha del documento'}
            open={datesOpen}
            onOpenChange={setDatesOpen}
          >
            <Field label="Periodo">
              <Select
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  const range = datePreset(event.target.value, today());
                  setDraft((current) => ({
                    ...current,
                    from: range.from || '',
                    to: range.to || '',
                  }));
                  setErrors({});
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
            <div className="list-filter-dates">
              {(
                [
                  ['from', 'Desde'],
                  ['to', 'Hasta'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} error={errors[key]}>
                  <input
                    name={key}
                    type="date"
                    min="0001-01-01"
                    max="9999-12-31"
                    value={draft[key] || ''}
                    onChange={(event) => {
                      setPeriod('');
                      update(key, event.target.value);
                    }}
                  />
                </Field>
              ))}
            </div>
          </FilterSection>
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
