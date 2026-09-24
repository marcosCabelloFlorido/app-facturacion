import { InvoiceLink } from './InvoiceReference';
import { useEffect, useRef, useState } from 'react';
import { Decimal } from 'decimal.js';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { api, euros, shortDate, today } from './api';
import { Modal, Field, ErrorBox, Loading, useRemote } from './components';
import { Select } from './Select';
import { CreationSteps } from './CreationSteps';
import { paymentProjection } from '../shared/sales-usability';
import type { FinancialDocument } from '../shared/domain';
import './creation.css';

type Selection = { doc: FinancialDocument; amount: string };
const direction = (doc: FinancialDocument) =>
  doc.kind === 'invoice' || (doc.kind === 'credit' && doc.credit_side === 'purchase')
    ? 'receipt'
    : 'payment';

export function PaymentCreation({
  initialDocument,
  initialAmount,
  salesOnly = false,
  onClose,
  onSaved,
}: {
  initialDocument?: FinancialDocument;
  initialAmount?: string;
  salesOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(initialDocument ? 1 : 0);
  const [visited, setVisited] = useState(step);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<Record<string, Selection>>(() =>
    initialDocument
      ? {
          [initialDocument.id]: {
            doc: initialDocument,
            amount:
              initialAmount && !paymentProjection(initialDocument.balance, initialAmount).error
                ? initialAmount
                : initialDocument.balance,
          },
        }
      : {},
  );
  const [date, setDate] = useState(
    initialDocument && initialDocument.date > today() ? initialDocument.date : today(),
  );
  const [method, setMethod] = useState('bank');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  const lock = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // The API returns 25 records; show five at a time to keep selection compact.
  const {
    data,
    loading,
    error: loadError,
  } = useRemote<{ rows: FinancialDocument[]; count: number }>(
    '/documents?status=unpaid' +
      (salesOnly ? '&kind=invoice' : '') +
      '&page=' +
      (Math.floor((page - 1) / 5) + 1) +
      '&search=' +
      encodeURIComponent(search),
    retry,
  );
  const selections = Object.values(selected);
  const paymentDirection = selections[0]
    ? direction(selections[0].doc)
    : salesOnly
      ? 'receipt'
      : null;
  const invalid = selections.some(
    ({ doc, amount }) => !!paymentProjection(doc.balance, amount).error,
  );
  const total = invalid
    ? null
    : selections
        .reduce((sum, { amount }) => sum.plus(amount.replace(',', '.')), new Decimal(0))
        .toFixed(2);
  const minDate = selections.reduce(
    (latest, { doc }) => (doc.date > latest ? doc.date : latest),
    '',
  );
  const title =
    initialDocument?.kind === 'credit'
      ? 'Registrar devolución'
      : paymentDirection === 'receipt'
        ? 'Registrar cobro'
        : paymentDirection === 'payment'
          ? 'Registrar pago'
          : 'Registrar cobro o pago';
  const names = ['Documento', 'Fecha', 'Cumplimentar movimiento'];
  const offset = ((page - 1) % 5) * 5;
  const visible = data?.rows.slice(offset, offset + 5) || [];
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    form.current?.closest('dialog')?.scrollTo(0, 0);
  }, [step]);
  function go(next: number) {
    if (lock.current) return;
    if (next > 0 && !selections.length) {
      setError('Selecciona al menos un documento.');
      return;
    }
    if (next > 1 && (!date || date < minDate)) {
      setDateError('La fecha debe ser igual o posterior al ' + shortDate(minDate) + '.');
      setStep(1);
      return;
    }
    setError('');
    setDateError('');
    setVisited((value) => Math.max(value, next));
    setStep(next);
  }
  function toggle(doc: FinancialDocument, checked: boolean) {
    if (lock.current) return;
    setSelected((current) => {
      const next = { ...current };
      if (checked) next[doc.id] = { doc, amount: doc.balance };
      else delete next[doc.id];
      return next;
    });
    if (checked && date < doc.date) setDate(doc.date);
    setError('');
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (step < 2) {
      go(step + 1);
      return;
    }
    if (!selections.length || invalid || total === null) {
      setError('Revisa los importes del movimiento.');
      return;
    }
    if (!date || date < minDate) {
      go(2);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const values = { date, method, reference };
      await api(initialDocument ? '/payments' : '/payments/batch', {
        method: 'POST',
        body: initialDocument
          ? {
              ...values,
              documentId: initialDocument.id,
              amount: selections[0].amount.replace(',', '.'),
            }
          : {
              ...values,
              amount: total,
              allocations: selections.map(({ doc, amount }) => ({
                documentId: doc.id,
                amount: amount.replace(',', '.'),
              })),
            },
      });
      onSaved();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      wide
      className="creation-dialog editor-page editor-page-invoice"
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <form ref={form} noValidate onSubmit={submit} className="creation-form" aria-busy={busy}>
        <CreationSteps
          names={names}
          step={step}
          availableStep={visited}
          disabled={busy}
          onChange={go}
          label="Pasos del movimiento"
        />
        <h3 className="sr-only" tabIndex={-1} ref={heading}>
          {names[step]}
        </h3>
        {error && <ErrorBox>{error}</ErrorBox>}
        <fieldset className="editor-fieldset payment-creation-fields" disabled={busy}>
          {step === 0 &&
            (initialDocument ? (
              <div className="creation-context">
                <div>
                  <span>Documento</span>
                  <strong>
                    <InvoiceLink id={initialDocument.id} newTab>
                      {initialDocument.number}
                    </InvoiceLink>
                  </strong>
                  <p>{initialDocument.party.name}</p>
                </div>
                <div>
                  <span>Pendiente</span>
                  <strong>{euros(initialDocument.balance)}</strong>
                </div>
              </div>
            ) : (
              <>
                <Field label="Buscar documento, cliente o proveedor">
                  <input
                    value={search}
                    maxLength={150}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </Field>
                {loading ? (
                  <Loading compact />
                ) : loadError ? (
                  <>
                    <ErrorBox>{loadError}</ErrorBox>
                    <button
                      type="button"
                      className="button"
                      onClick={() => setRetry((value) => value + 1)}
                    >
                      Reintentar documentos
                    </button>
                  </>
                ) : (
                  <>
                    <div className="payment-document-options">
                      {visible.map((doc) => (
                        <label key={doc.id} className="payment-document-option">
                          <input
                            type="checkbox"
                            checked={!!selected[doc.id]}
                            disabled={
                              !selected[doc.id] &&
                              (selections.length >= 100 ||
                                (!!paymentDirection && direction(doc) !== paymentDirection))
                            }
                            onChange={(event) => toggle(doc, event.target.checked)}
                          />
                          <span>
                            <strong>{doc.number}</strong>
                            <span>{doc.party.name}</span>
                          </span>
                          <span className="payment-document-balance">
                            <strong>{euros(doc.balance)}</strong>
                            <span>{direction(doc) === 'receipt' ? 'Cobro' : 'Pago'}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {!visible.length && (
                      <p role="status">
                        {search ? 'No hay coincidencias.' : 'No hay documentos pendientes.'}
                      </p>
                    )}
                    {!!data && (data.count > 5 || page > 1) && (
                      <div className="creation-pagination">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Página anterior"
                          disabled={page === 1}
                          onClick={() => setPage((value) => value - 1)}
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <span>
                          {page} de {Math.max(1, Math.ceil(data.count / 5))}
                        </span>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Página siguiente"
                          disabled={page * 5 >= data.count}
                          onClick={() => setPage((value) => value + 1)}
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                )}
                <p className="muted" role="status">
                  {selections.length
                    ? `${selections.length} ${selections.length === 1 ? 'documento seleccionado' : 'documentos seleccionados'} · ${total === null ? '—' : euros(total)}`
                    : 'Selecciona los documentos del movimiento.'}
                  {!salesOnly && selections.length > 0
                    ? ' Solo se pueden agrupar movimientos del mismo sentido.'
                    : ''}
                </p>
              </>
            ))}
          {step === 1 && (
            <div className="creation-date-step">
              <div className="creation-context">
                <div>
                  <span>{selections.length === 1 ? 'Documento' : 'Documentos'}</span>
                  <strong>
                    {selections.length === 1 ? (
                      <InvoiceLink id={selections[0].doc.id} newTab>
                        {selections[0].doc.number}
                      </InvoiceLink>
                    ) : (
                      selections.length + ' seleccionados'
                    )}
                  </strong>
                  <p>
                    {selections.length === 1
                      ? selections[0]?.doc.party.name
                      : paymentDirection === 'receipt'
                        ? 'Cobro agrupado'
                        : 'Pago agrupado'}
                  </p>
                </div>
                <div>
                  <span>Pendiente</span>
                  <strong>
                    {euros(
                      selections
                        .reduce((sum, { doc }) => sum.plus(doc.balance), new Decimal(0))
                        .toFixed(2),
                    )}
                  </strong>
                </div>
              </div>
              <Field label="Fecha del movimiento" error={dateError}>
                <input
                  type="date"
                  required
                  min={minDate || undefined}
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setDateError('');
                  }}
                />
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="creation-movement-step">
              <div className="creation-context">
                <div>
                  <span>{selections.length === 1 ? 'Documento' : 'Documentos'}</span>
                  <strong>
                    {selections.length === 1 ? (
                      <InvoiceLink id={selections[0].doc.id} newTab>
                        {selections[0].doc.number}
                      </InvoiceLink>
                    ) : (
                      selections.length + ' seleccionados'
                    )}
                  </strong>
                  {selections.length === 1 && <p>{selections[0].doc.party.name}</p>}
                </div>
                <div>
                  <span>Pendiente</span>
                  <strong>
                    {euros(
                      selections
                        .reduce((sum, { doc }) => sum.plus(doc.balance), new Decimal(0))
                        .toFixed(2),
                    )}
                  </strong>
                </div>
              </div>
              <div
                className={`payment-entry-fields${selections.length > 1 ? ' payment-entry-fields-multiple' : ''}`}
              >
                <div className="payment-amounts">
                  {selections.map(({ doc, amount }) => {
                    const projection = paymentProjection(doc.balance, amount);
                    return (
                      <section
                        key={doc.id}
                        className="payment-amount-row"
                        aria-label={'Movimiento de ' + doc.number}
                      >
                        {selections.length > 1 && (
                          <div className="payment-amount-document">
                            <InvoiceLink id={doc.id} newTab>
                              {doc.number}
                            </InvoiceLink>
                            <span>{doc.party.name}</span>
                            <span className="muted">Pendiente: {euros(doc.balance)}</span>
                          </div>
                        )}
                        <div>
                          <Field
                            label={selections.length === 1 ? 'Importe' : 'Importe de ' + doc.number}
                            error={amount ? projection.error : undefined}
                          >
                            <div className="input-suffix">
                              <input
                                required
                                inputMode="decimal"
                                value={amount}
                                onChange={(event) =>
                                  setSelected((current) => ({
                                    ...current,
                                    [doc.id]: { doc, amount: event.target.value.replace(',', '.') },
                                  }))
                                }
                              />
                              <span aria-hidden="true">€</span>
                            </div>
                          </Field>
                          <p className="payment-remaining muted" aria-live="polite">
                            {projection.remaining !== null && Number(projection.remaining) > 0
                              ? 'Quedarán pendientes: ' + euros(projection.remaining)
                              : ''}
                          </p>
                        </div>
                      </section>
                    );
                  })}
                </div>
                <Field label="Medio de pago">
                  <Select value={method} onChange={(event) => setMethod(event.target.value)}>
                    <option value="bank">Transferencia bancaria</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                  </Select>
                </Field>
              </div>
              <Field label="Referencia (opcional)">
                <input
                  maxLength={initialDocument ? 200 : 300}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </Field>
              {selections.length > 1 && (
                <div className="creation-total">
                  <span>{paymentDirection === 'receipt' ? 'Total a cobrar' : 'Total a pagar'}</span>
                  <strong>{total === null ? '—' : euros(total)}</strong>
                </div>
              )}
            </div>
          )}
        </fieldset>
        <div className="wizard-actions">
          {step > 0 && (
            <button
              type="button"
              className="icon-button icon-button-plain"
              aria-label="Anterior"
              title="Anterior"
              disabled={busy}
              onClick={() => go(step - 1)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="submit"
            className="button primary"
            aria-busy={busy}
            disabled={busy || !selections.length || (step === 2 && invalid)}
          >
            {step === 2 ? 'Confirmar' : 'Continuar'}
            {step === 2 ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <ArrowRight size={16} aria-hidden="true" />
            )}
          </button>
        </div>
        {busy && (
          <p className="muted" role="status">
            Registrando movimiento…
          </p>
        )}
      </form>
    </Modal>
  );
}
