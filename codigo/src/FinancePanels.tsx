import { Select } from './Select';

import { useEffect, useRef, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { api, euros, shortDate, tableDate, today, navigate } from './api';
import {
  Field,
  ErrorBox,
  Loading,
  Empty,
  PanelHeading,
  Modal,
  Submit,
  useRemote,
  type Notify,
} from './components';
import type { FinancialDocument, DocumentInput } from '../shared/domain';
type Series = { code: string; kind: string; name: string; active: boolean };
export function DocumentDates({
  data,
  onChange,
}: {
  data: DocumentInput;
  onChange: (p: Partial<DocumentInput>) => void;
}) {
  const { data: series } = useRemote<Series[]>('/series');
  return (
    <details className="advanced-options">
      <summary>Fechas de operación y serie</summary>
      <div className="form-grid">
        {(['purchaseOrder', 'costCenter', 'contract'] as const).map((key) => (
          <Field
            key={key}
            label={
              {
                purchaseOrder: 'Número de pedido',
                costCenter: 'Centro de coste',
                contract: 'Referencia de contrato',
              }[key]
            }
          >
            <input
              maxLength={120}
              value={data.buyerFields?.[key] || ''}
              onChange={(e) =>
                onChange({ buyerFields: { ...data.buyerFields, [key]: e.target.value } })
              }
            />
          </Field>
        ))}
        <Field label="Fecha de operación">
          <input
            type="date"
            max={data.date}
            value={data.operationDate || data.date}
            onChange={(e) => onChange({ operationDate: e.target.value || undefined })}
          />
        </Field>
        {data.kind === 'purchase' && (
          <Field label="Fecha de registro contable">
            <input
              type="date"
              min={data.date}
              value={data.registrationDate || data.date}
              onChange={(e) => onChange({ registrationDate: e.target.value || undefined })}
            />
          </Field>
        )}
        <Field label="Serie de numeración">
          <Select
            value={data.seriesCode || ''}
            onChange={(e) => onChange({ seriesCode: e.target.value || null })}
          >
            <option value="">Serie general</option>
            {series
              ?.filter((s) => s.kind === data.kind && (s.active || s.code === data.seriesCode))
              .map((s) => (
                <option value={s.code} key={s.code}>
                  {s.code} · {s.name}
                  {!s.active ? ' (inactiva)' : ''}
                </option>
              ))}
          </Select>
        </Field>
      </div>
    </details>
  );
}
export function SeriesSettings({
  notify,
  creating,
  onCreatingChange: setCreating,
}: {
  notify: Notify;
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
}) {
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const { data, error: loadError, loading, setData } = useRemote<Series[]>('/series', revision);
  const [form, setForm] = useState({ code: '', name: '', kind: 'invoice' });
  return (
    <section className="panel series-settings">
      <PanelHeading title="Series de numeración" />
      {loadError && <ErrorBox>{loadError}</ErrorBox>}
      {error && !creating && <ErrorBox>{error}</ErrorBox>}
      {loading && <Loading />}
      {data?.length === 0 && (
        <Empty title="Sin series adicionales" description="La serie general sigue disponible." />
      )}
      {data?.map((s) => (
        <div className="recovery-row" key={s.code}>
          <div className="recovery-copy">
            <strong>
              {s.code} · {s.name}
            </strong>
          </div>
          <input
            type="checkbox"
            checked={s.active}
            aria-label={'Activar serie ' + s.code + ' · ' + s.name}
            disabled={busy || loading || !!loadError}
            onChange={async (event) => {
              const active = event.currentTarget.checked;
              setBusy(true);
              setError('');
              try {
                await api('/series/' + s.code, { method: 'PUT', body: { active } });
                setData(
                  (current) =>
                    current?.map((series) =>
                      series.code === s.code ? { ...series, active } : series,
                    ) ?? null,
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      ))}
      {creating && (
        <Modal
          title="Nueva serie de numeración"
          onClose={() => {
            if (!busy) setCreating(false);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('/series', { method: 'POST', body: form });
                setRevision((v) => v + 1);
                setForm({ ...form, code: '', name: '' });
                notify('Serie creada. Disponible en los documentos.');
                setCreating(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <ErrorBox>{error}</ErrorBox>}
            <div className="form-grid">
              <Field label="Código">
                <input
                  required
                  pattern="[A-Z][A-Z0-9]{1,11}"
                  maxLength={12}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Nombre">
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Tipo">
                <Select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  <option value="invoice">Facturas de venta</option>
                  <option value="purchase">Compras</option>
                  <option value="quote">Presupuestos</option>
                  <option value="credit">Rectificativas</option>
                </Select>
              </Field>
            </div>
            <div className="modal-actions">
              <Submit busy={busy}>Crear serie</Submit>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
type Schedule = {
  version: number;
  rows: { id: string; due_date: string; amount: string; settled: string; balance: string }[];
  revisions: { version: number; reason: string; created_at: string; actor: string }[];
};
export function DocumentSchedule({
  doc,
  readonly,
  revision = 0,
}: {
  doc: FinancialDocument;
  readonly: boolean;
  revision?: number;
}) {
  const [editingDue, setEditingDue] = useState(0);
  const amountInput = useRef<HTMLInputElement>(null);
  const [refresh, setRefresh] = useState(0),
    [edit, setEdit] = useState(false),
    [dues, setDues] = useState<{ date: string; amount: string }[]>([]),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const {
    data,
    loading,
    error: loadError,
  } = useRemote<Schedule>('/documents/' + doc.id + '/schedule', revision + refresh);
  useEffect(() => {
    if (edit) amountInput.current?.focus();
  }, [edit, editingDue]);
  return (
    <section className="panel document-schedule">
      <PanelHeading title="Vencimientos" />
      {loadError && <ErrorBox>{loadError}</ErrorBox>}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="table-scroll">
              <table
                className="document-section-table document-dues-table"
                aria-label="Plazos de la factura"
              >
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Estado</th>
                    <th scope="col" className="numeric">
                      Importe
                    </th>
                    {!readonly && (
                      <th scope="col">
                        <span className="sr-only">Acciones</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((d, index) => {
                    const applied = new Decimal(d.settled).gt(0);
                    const settled = new Decimal(d.balance).eq(0);
                    return (
                      <tr key={d.id}>
                        <td>
                          <time dateTime={d.due_date}>{shortDate(d.due_date)}</time>
                          {applied && !settled && (
                            <small className="muted">Aplicado: {euros(d.settled)}</small>
                          )}
                        </td>
                        <td>{settled ? 'Liquidado' : 'Pendiente'}</td>
                        <td className="numeric">{euros(settled ? d.amount : d.balance)}</td>
                        {!readonly && (
                          <td className="numeric">
                            {' '}
                            {!readonly && !loadError && (
                              <button
                                type="button"
                                className="icon-button icon-button-plain schedule-edit-action"
                                aria-label={'Modificar importe del plazo ' + (index + 1)}
                                title="Modificar importe"
                                disabled={busy}
                                onClick={() => {
                                  setDues(
                                    data.rows.map((due) => ({
                                      date: due.due_date,
                                      amount: due.amount,
                                    })),
                                  );
                                  setEditingDue(index);
                                  setReason('');
                                  setError('');
                                  setEdit(true);
                                }}
                              >
                                <Pencil size={18} strokeWidth={1.6} aria-hidden="true" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.revisions.length > 0 && (
              <details className="advanced-options">
                <summary>Historial de plazos</summary>
                {data.revisions.map((r) => (
                  <p key={r.version}>
                    <strong>Revisión {r.version}</strong> · {r.reason}
                    <br />
                    <span className="muted small">
                      {r.actor} · {new Date(r.created_at).toLocaleString('es-ES')}
                    </span>
                  </p>
                ))}
              </details>
            )}
          </>
        )
      )}
      {edit && data && (
        <Modal
          title="Acordar plazos"
          description={`Los plazos deben sumar ${euros(doc.total)}. Los importes ya liquidados se conservan.`}
          onClose={() => {
            if (!busy) setEdit(false);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('/documents/' + doc.id + '/schedule', {
                  method: 'POST',
                  body: { version: data.version, reason, dues },
                });
                setEdit(false);
                setRefresh((v) => v + 1);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <ErrorBox>{error}</ErrorBox>}
            {dues.map((d, i) => (
              <div className="schedule-edit-row" key={i}>
                <Field label={`Fecha del plazo ${i + 1}`}>
                  <input
                    required
                    type="date"
                    min={doc.date}
                    value={d.date}
                    onChange={(e) =>
                      setDues(dues.map((v, j) => (j === i ? { ...v, date: e.target.value } : v)))
                    }
                  />
                </Field>
                <Field label="Importe">
                  <input
                    required
                    inputMode="decimal"
                    value={d.amount}
                    ref={i === editingDue ? amountInput : undefined}
                    onChange={(e) =>
                      setDues(
                        dues.map((v, j) =>
                          j === i ? { ...v, amount: e.target.value.replace(',', '.') } : v,
                        ),
                      )
                    }
                  />
                </Field>
                <button
                  type="button"
                  className="text-link"
                  disabled={dues.length === 1}
                  onClick={() => setDues(dues.filter((_, j) => j !== i))}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button schedule-add"
              onClick={() => setDues([...dues, { date: doc.due_date, amount: '0' }])}
            >
              Añadir plazo
            </button>
            <Field label="Motivo del acuerdo">
              <textarea
                required
                minLength={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <div className="modal-actions">
              <Submit busy={busy}>Guardar calendario</Submit>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
export function CreditForm({
  doc,
  onClose,
  onSaved,
}: {
  doc: FinancialDocument;
  onClose: () => void;
  onSaved: (d: FinancialDocument) => void;
}) {
  const { data, error: loadError } = useRemote<{
    lines: { sourceLine: number; description: string; remaining: string }[];
  }>('/documents/' + doc.id + '/credit-remaining');
  const [date, setDate] = useState(today() < doc.date ? doc.date : today()),
    [reason, setReason] = useState(''),
    [quantities, setQuantities] = useState<Record<number, string>>({}),
    [partial, setPartial] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={doc.kind === 'purchase' ? 'Registrar abono del proveedor' : 'Rectificar factura'}
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const lines = partial
              ? data?.lines
                  .map((l) => ({
                    sourceLine: l.sourceLine,
                    quantity: quantities[l.sourceLine] || '0',
                  }))
                  .filter((l) => new Decimal(l.quantity).gt(0))
              : undefined;
            const d = await api<FinancialDocument>('/documents/' + doc.id + '/credit', {
              method: 'POST',
              body: { date, reason, lines },
            });
            onSaved(d);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(error || loadError) && <ErrorBox>{error || loadError}</ErrorBox>}
        <div className="form-grid">
          <Field label="Fecha de rectificación">
            <input
              type="date"
              min={doc.date}
              value={date}
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Alcance">
            <Select
              value={partial ? 'partial' : 'full'}
              onChange={(e) => setPartial(e.target.value === 'partial')}
            >
              <option value="full">Todo lo que queda por rectificar</option>
              <option value="partial">Seleccionar cantidades</option>
            </Select>
          </Field>
        </div>
        {partial &&
          data?.lines.map((l) => (
            <Field key={l.sourceLine} label={l.description}>
              <input
                inputMode="decimal"
                value={quantities[l.sourceLine] || '0'}
                onChange={(e) =>
                  setQuantities({ ...quantities, [l.sourceLine]: e.target.value.replace(',', '.') })
                }
              />
            </Field>
          ))}
        <Field label="Motivo">
          <textarea
            required
            minLength={5}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <p className="muted">
          Al confirmar se compensará el saldo pendiente hasta el importe rectificado. El resto
          quedará pendiente de devolución.
        </p>
        <div className="modal-actions">
          <Submit busy={busy}>Crear borrador de rectificación</Submit>
        </div>
      </form>
    </Modal>
  );
}
