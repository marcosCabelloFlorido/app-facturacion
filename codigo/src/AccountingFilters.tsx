import { FilterSection } from './FilterSection';
import { useState } from 'react';
import { Field, Modal, ErrorBox } from './components';
import { Select } from './Select';
import { KpiFilter } from './ModuleKpis';
import { datePreset } from '../shared/sales-tools';
import { documentDateRangeSchema } from '../shared/document-list';
import { today } from './api';

export function AccountingFilters({
  metric,
  tab,
  from,
  to,
  onClose,
  onApply,
}: {
  metric: string;
  tab: string;
  from: string;
  to: string;
  onClose: () => void;
  onApply: (from: string, to: string, tab: string, metric: string) => void;
}) {
  const [nextMetric, setNextMetric] = useState(metric);
  const [nextTab, setNextTab] = useState(tab);
  const [start, setStart] = useState(from),
    [end, setEnd] = useState(to),
    [error, setError] = useState('');
  const [datesOpen, setDatesOpen] = useState(false);
  return (
    <Modal title="Filtros de contabilidad" onClose={onClose} sidePanel>
      <form
        className="side-panel-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = documentDateRangeSchema.safeParse({ from: start, to: end });
          if (!result.success) {
            setError(result.error.issues[0].message);
            setDatesOpen(true);
            const input = event.currentTarget.querySelector<HTMLInputElement>(
              `[name="${String(result.error.issues[0].path[0])}"]`,
            );
            requestAnimationFrame(() => input?.focus());
            return;
          }
          onApply(start, end, nextTab, nextTab === tab ? nextMetric : '');
        }}
      >
        <div className="side-panel-body">
          <KpiFilter
            persistent
            onClear={() => {
              const year = today().slice(0, 4);
              setNextMetric('');
              setStart(year + '-01-01');
              setEnd(year + '-12-31');
              setError('');
            }}
          />
          {error && <ErrorBox>{error}</ErrorBox>}
          <Field label="Vista">
            <Select value={nextTab} onChange={(event) => setNextTab(event.target.value)}>
              {[
                ['journal', 'Libro diario'],
                ['trial', 'Sumas y saldos'],
                ['reports', 'Informes'],
                ['ledger', 'Mayor'],
                ['drafts', 'Asientos en borrador'],
                ['accounts', 'Plan de cuentas'],
                ['taxes', 'Resumen fiscal'],
                ['periods', 'Periodos'],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <FilterSection title="Fecha del asiento" open={datesOpen} onOpenChange={setDatesOpen}>
            <Field label="Periodo">
              <Select
                value=""
                onChange={(event) => {
                  const range = datePreset(event.target.value, today());
                  if (range) {
                    setStart(range.from || from);
                    setEnd(range.to || to);
                    setError('');
                  }
                }}
              >
                <option value="">Personalizado</option>
                <option value="month">Este mes</option>
                <option value="quarter">Este trimestre</option>
                <option value="year">Este año</option>
              </Select>
            </Field>
            <Field label="Desde">
              <input
                name="from"
                required
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label="Hasta">
              <input
                name="to"
                required
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
          </FilterSection>
        </div>
        <div className="modal-actions">
          <button className="button primary" type="submit">
            Aplicar filtros
          </button>
        </div>
      </form>
    </Modal>
  );
}
