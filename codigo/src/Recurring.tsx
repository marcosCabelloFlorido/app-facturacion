import { useEffect, useState } from 'react';
import { Pause, Play, Repeat2, SkipForward, RotateCcw, Zap, Plus, Trash2 } from 'lucide-react';
import { api, euros, navigate, plusDays, shortDate, tableDate, today } from './api';
import { ErrorBox, Field, Loading, PageHeading, Submit, useRemote } from './components';
import { Select } from './Select';
import { ProductConceptInput } from './ProductConceptInput';
import type { Product } from '../shared/domain';
import { ToggleSwitch } from './ToggleSwitch';
import {
  frequencies,
  frequencyLabels,
  recurringStatusLabels,
  recurringVariables,
  runStatusLabels,
  type Frequency,
} from '../shared/recurring';
import type { Notify } from './components';
import './recurring.css';

type Run = {
  id?: string;
  status: keyof typeof runStatusLabels;
  scheduled_date: string;
  error: string | null;
  note?: string | null;
  document_id: string | null;
  number: string | null;
};
type Line = {
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: '0' | '4' | '10' | '21';
  exemptionReason: string;
};
type Recurring = {
  id: string;
  name: string;
  contact_id: string;
  contact_name: string;
  contact_email?: string;
  contact_active?: boolean;
  lines: Line[];
  series_code: string | null;
  retention_rate: string;
  payment_days: number;
  notes: string;
  template_id: string | null;
  frequency: Frequency;
  interval_count: number;
  start_date: string;
  next_date: string;
  end_date: string | null;
  max_occurrences: number | null;
  occurrences_done: number;
  status: keyof typeof recurringStatusLabels;
  auto_issue: boolean;
  auto_send: boolean;
  recipient: string;
  subject: string;
  body: string;
  version: number;
  total: string;
  last_run?: Run | null;
  upcoming?: string[];
  runs?: Run[];
};
type Props = { route: string; notify: Notify; readonly: boolean; admin: boolean };

const blankLine = (): Line => ({
  description: '',
  quantity: '1',
  unitPrice: '0',
  discount: '0',
  taxRate: '21',
  exemptionReason: '',
});
const defaultBody =
  'Hola {cliente},\n\nAdjuntamos la factura {numero} por importe de {importe}, con vencimiento el {vencimiento}.\n\nUn saludo,\n{empresa}';
const cadence = (r: Pick<Recurring, 'frequency' | 'interval_count'>) =>
  r.interval_count > 1
    ? `Cada ${r.interval_count} · ${frequencyLabels[r.frequency].toLowerCase()}`
    : frequencyLabels[r.frequency];

export function RecurringPage(props: Props) {
  const [, section, third] = props.route.split('?')[0].split('/');
  if (section === 'new') return <RecurringForm {...props} />;
  if (section && third === 'edit') return <RecurringForm {...props} id={section} />;
  if (section) return <RecurringDetail {...props} id={section} />;
  return <RecurringList {...props} />;
}

function RunStatus({ run }: { run?: Run | null }) {
  if (!run) return <span className="recurring-muted">Sin ejecuciones</span>;
  return (
    <span className={`recurring-pill recurring-pill-${run.status}`}>
      {runStatusLabels[run.status]}
    </span>
  );
}

function RecurringList({ notify, readonly, admin }: Props) {
  const [revision, setRevision] = useState(0);
  const { data, error, loading } = useRemote<Recurring[]>('/recurring', revision);
  const settings = useRemote<{ enabled: boolean }>('/recurring/settings', revision);
  const [busy, setBusy] = useState(false);
  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      await api('/recurring/settings', { method: 'PUT', body: { enabled } });
      notify(enabled ? 'Facturación recurrente activada.' : 'Facturación recurrente desactivada.');
      setRevision((v) => v + 1);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-content recurring-page">
      <PageHeading
        title="Facturas recurrentes"
        description="Plantillas que emiten facturas solas cada mes, trimestre o año."
        primaryAction={
          !readonly && {
            label: 'Nueva recurrencia',
            icon: Plus,
            onAction: () => navigate('recurring/new'),
          }
        }
      />
      <section className="panel recurring-switch" aria-label="Activación">
        <div>
          <strong>Emisión automática</strong>
          <p>
            {settings.data?.enabled
              ? 'Activa: el servidor genera las facturas cuando llega su fecha.'
              : 'Desactivada: no se genera ninguna factura aunque haya recurrencias activas.'}
          </p>
        </div>
        <ToggleSwitch
          checked={!!settings.data?.enabled}
          label="Emisión automática de facturas recurrentes"
          disabled={!admin || busy || !settings.data}
          onChange={toggle}
        />
      </section>
      {error && <ErrorBox>{error}</ErrorBox>}
      {loading && <Loading />}
      {data && data.length === 0 && (
        <section className="panel recurring-empty">
          <Repeat2 size={22} aria-hidden="true" />
          <p>Aún no hay recurrencias. Crea una desde cero o desde una factura emitida.</p>
        </section>
      )}
      {data && data.length > 0 && (
        <div className="panel table-scroll">
          <table className="recurring-table" aria-label="Recurrencias">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Cliente</th>
                <th scope="col">Periodicidad</th>
                <th scope="col">Próxima fecha</th>
                <th scope="col" className="num">
                  Importe
                </th>
                <th scope="col">Estado</th>
                <th scope="col">Último resultado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={() => navigate('recurring/' + r.id)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('recurring/' + r.id)}
                >
                  <td>
                    <a href={'#recurring/' + r.id} onClick={(e) => e.stopPropagation()}>
                      {r.name}
                    </a>
                  </td>
                  <td>{r.contact_name}</td>
                  <td>{cadence(r)}</td>
                  <td>{r.status === 'finished' ? '—' : tableDate(r.next_date)}</td>
                  <td className="num">{euros(r.total)}</td>
                  <td>
                    <span className={`recurring-pill recurring-pill-${r.status}`}>
                      {recurringStatusLabels[r.status]}
                    </span>
                  </td>
                  <td>
                    <RunStatus run={r.last_run} />
                    {r.last_run?.number && (
                      <span className="recurring-muted"> {r.last_run.number}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecurringDetail({ id, notify, readonly }: Props & { id: string }) {
  const [revision, setRevision] = useState(0);
  const { data: r, error, loading } = useRemote<Recurring>('/recurring/' + id, revision);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const act = async (name: string, path: string, body: object = {}, ok = 'Hecho.') => {
    setBusy(name);
    setActionError('');
    try {
      const result = await api<{ run?: Run }>('/recurring/' + id + path, { method: 'POST', body });
      notify(
        result?.run?.status === 'failed' ? 'La generación ha fallado: ' + result.run.error : ok,
      );
      setRevision((v) => v + 1);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  if (loading && !r) return <Loading />;
  if (!r) return <ErrorBox>{error || 'Recurrencia no encontrada.'}</ErrorBox>;
  const failed = r.runs?.find((x) => x.scheduled_date === r.next_date && x.status === 'failed');
  const active = r.status === 'active';
  return (
    <div className="page-content recurring-page">
      <PageHeading
        title={r.name}
        backLink={{ href: '#recurring', label: 'Facturas recurrentes' }}
        description={`${r.contact_name} · ${cadence(r)} · ${euros(r.total)}`}
        status={
          <span className={`recurring-pill recurring-pill-${r.status}`}>
            {recurringStatusLabels[r.status]}
          </span>
        }
      />
      {actionError && <ErrorBox>{actionError}</ErrorBox>}
      {failed && (
        <div className="error-box recurring-failure" role="alert">
          <span>
            <strong>{shortDate(failed.scheduled_date)}:</strong> {failed.error} La recurrencia no
            avanzará hasta que reintentes o saltes esta fecha.
          </span>
        </div>
      )}
      {!readonly && r.status !== 'finished' && (
        <div className="recurring-actions">
          {active ? (
            <button
              className="button"
              disabled={!!busy}
              onClick={() => act('pause', '/pause', { version: r.version }, 'Recurrencia pausada.')}
            >
              <Pause size={16} aria-hidden="true" /> Pausar
            </button>
          ) : (
            <button
              className="button"
              disabled={!!busy}
              onClick={() =>
                act('resume', '/resume', { version: r.version }, 'Recurrencia reanudada.')
              }
            >
              <Play size={16} aria-hidden="true" /> Reanudar
            </button>
          )}
          {active && !failed && (
            <button
              className="button"
              disabled={!!busy}
              onClick={() => act('now', '/run-now', {}, 'Factura generada.')}
            >
              <Zap size={16} aria-hidden="true" /> Emitir ahora
            </button>
          )}
          {failed && (
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => act('retry', '/retry', {}, 'Factura generada.')}
            >
              <RotateCcw size={16} aria-hidden="true" /> Reintentar
            </button>
          )}
          <button
            className="button"
            disabled={!!busy}
            onClick={() =>
              confirm(
                '¿Saltar la fecha ' + shortDate(r.next_date) + '? No se generará esa factura.',
              ) && act('skip', '/skip', {}, 'Fecha omitida.')
            }
          >
            <SkipForward size={16} aria-hidden="true" /> Saltar fecha
          </button>
          <button className="button" onClick={() => navigate('recurring/' + id + '/edit')}>
            Editar
          </button>
        </div>
      )}
      <div className="recurring-grid">
        <section className="panel" aria-label="Configuración">
          <h2>Configuración</h2>
          <dl className="recurring-facts">
            <dt>Cliente</dt>
            <dd>
              {r.contact_name}
              {r.contact_active === false && ' (archivado)'}
            </dd>
            <dt>Periodicidad</dt>
            <dd>{cadence(r)}</dd>
            <dt>Inicio</dt>
            <dd>{shortDate(r.start_date)}</dd>
            <dt>Fin</dt>
            <dd>
              {r.end_date ? shortDate(r.end_date) : 'Sin fecha de fin'}
              {r.max_occurrences ? ` · máx. ${r.max_occurrences} facturas` : ''}
            </dd>
            <dt>Generadas</dt>
            <dd>{r.occurrences_done}</dd>
            <dt>Serie</dt>
            <dd>{r.series_code || 'Predeterminada'}</dd>
            <dt>Vencimiento</dt>
            <dd>{r.payment_days} días tras la fecha de factura</dd>
            <dt>Al llegar la fecha</dt>
            <dd>{r.auto_issue ? 'Emitir la factura' : 'Dejar como borrador'}</dd>
            <dt>Correo</dt>
            <dd>
              {r.auto_send
                ? 'Enviar a ' + (r.recipient || r.contact_email || 'el contacto')
                : 'No enviar'}
            </dd>
          </dl>
        </section>
        <section className="panel" aria-label="Próximas fechas">
          <h2>Próximas fechas</h2>
          {r.upcoming && r.upcoming.length > 0 ? (
            <ol className="recurring-upcoming">
              {r.upcoming.map((d) => (
                <li key={d}>{shortDate(d)}</li>
              ))}
            </ol>
          ) : (
            <p className="recurring-muted">No quedan fechas pendientes.</p>
          )}
        </section>
      </div>
      <section className="panel table-scroll" aria-label="Historial">
        <h2>Historial de facturas generadas</h2>
        {r.runs && r.runs.length > 0 ? (
          <table className="recurring-table">
            <thead>
              <tr>
                <th scope="col">Fecha prevista</th>
                <th scope="col">Resultado</th>
                <th scope="col">Factura</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {r.runs.map((run) => (
                <tr key={run.id}>
                  <td>{shortDate(run.scheduled_date)}</td>
                  <td>
                    <RunStatus run={run} />
                  </td>
                  <td>
                    {run.document_id ? (
                      <a href={'#document/' + run.document_id}>{run.number || 'Borrador'}</a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={run.error ? 'recurring-error' : 'recurring-muted'}>
                    {run.error || run.note || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="recurring-muted">Todavía no se ha generado ninguna factura.</p>
        )}
      </section>
    </div>
  );
}

type FormState = {
  name: string;
  contactId: string;
  lines: Line[];
  seriesCode: string;
  retentionRate: string;
  paymentDays: number;
  notes: string;
  templateId: string | null;
  frequency: Frequency;
  intervalCount: number;
  startDate: string;
  endDate: string;
  maxOccurrences: string;
  autoIssue: boolean;
  autoSend: boolean;
  recipient: string;
  subject: string;
  body: string;
};

function RecurringForm({ id, route, notify }: Props & { id?: string }) {
  const from = new URLSearchParams(route.split('?')[1]).get('from');
  const [state, setState] = useState<FormState | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<{ id: string; name: string; taxId: string }[]>([]);
  const [contactLabel, setContactLabel] = useState('');
  const [createdProducts, setCreatedProducts] = useState<Product[]>([]);
  const {
    data: products,
    loading: productsLoading,
    error: productsError,
  } = useRemote<Product[]>('/products');
  const catalogProducts = [
    ...createdProducts,
    ...(products || []).filter((p) => !createdProducts.some((c) => c.id === p.id)),
  ];
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => (s ? { ...s, [key]: value } : s));
  const base: FormState = {
    name: '',
    contactId: '',
    lines: [blankLine()],
    seriesCode: '',
    retentionRate: '0',
    paymentDays: 30,
    notes: '',
    templateId: null,
    frequency: 'monthly',
    intervalCount: 1,
    startDate: plusDays(today(), 0),
    endDate: '',
    maxOccurrences: '',
    autoIssue: true,
    autoSend: false,
    recipient: '',
    subject: 'Factura {numero}',
    body: defaultBody,
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (id) {
          const r = await api<Recurring>('/recurring/' + id);
          if (!alive) return;
          setVersion(r.version);
          setContactLabel(r.contact_name);
          setState({
            ...base,
            name: r.name,
            contactId: r.contact_id,
            lines: r.lines,
            seriesCode: r.series_code ?? '',
            retentionRate: String(r.retention_rate),
            paymentDays: r.payment_days,
            notes: r.notes,
            templateId: r.template_id,
            frequency: r.frequency,
            intervalCount: r.interval_count,
            startDate: r.start_date,
            endDate: r.end_date ?? '',
            maxOccurrences: r.max_occurrences ? String(r.max_occurrences) : '',
            autoIssue: r.auto_issue,
            autoSend: r.auto_send,
            recipient: r.recipient,
            subject: r.subject,
            body: r.body,
          });
        } else if (from) {
          const d = await api<
            Partial<FormState> & { seriesCode: string | null; contactName?: string }
          >('/documents/' + from + '/recurring-draft');
          if (!alive) return;
          setContactLabel(d.contactName ?? '');
          setState({
            ...base,
            ...d,
            contactId: d.contactId ?? '',
            seriesCode: d.seriesCode ?? '',
          } as FormState);
        } else if (alive) setState(base);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, from]);
  useEffect(() => {
    if (search.trim().length < 2) return setContacts([]);
    const t = setTimeout(() => {
      api<{ rows: { id: string; name: string; taxId: string }[] }>(
        '/contacts?type=customer&pageSize=8&search=' + encodeURIComponent(search),
      )
        .then((p) => setContacts(p.rows))
        .catch(() => setContacts([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (!state) return;
    const q = new URLSearchParams({
      startDate: state.startDate,
      frequency: state.frequency,
      interval: String(state.intervalCount),
      count: '3',
    });
    if (state.endDate) q.set('endDate', state.endDate);
    if (state.maxOccurrences) q.set('maxOccurrences', state.maxOccurrences);
    const t = setTimeout(
      () =>
        api<{ dates: string[] }>('/recurring/preview?' + q)
          .then((r) => setDates(r.dates))
          .catch(() => setDates([])),
      200,
    );
    return () => clearTimeout(t);
  }, [
    state?.startDate,
    state?.frequency,
    state?.intervalCount,
    state?.endDate,
    state?.maxOccurrences,
  ]);
  if (!state) return error ? <ErrorBox>{error}</ErrorBox> : <Loading />;
  const setLine = (i: number, patch: Partial<Line>) =>
    set(
      'lines',
      state.lines.map((l, n) => (n === i ? { ...l, ...patch } : l)),
    );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!state.contactId) return setError('Elige un cliente.');
    setBusy(true);
    const body = {
      name: state.name,
      contactId: state.contactId,
      lines: state.lines,
      seriesCode: state.seriesCode || null,
      retentionRate: state.retentionRate,
      paymentDays: Number(state.paymentDays),
      notes: state.notes,
      templateId: state.templateId,
      frequency: state.frequency,
      intervalCount: Number(state.intervalCount),
      startDate: state.startDate,
      endDate: state.endDate || null,
      maxOccurrences: state.maxOccurrences ? Number(state.maxOccurrences) : null,
      autoIssue: state.autoIssue,
      autoSend: state.autoSend,
      recipient: state.recipient,
      subject: state.subject,
      body: state.body,
    };
    try {
      const saved = id
        ? await api<{ id: string }>('/recurring/' + id, {
            method: 'PUT',
            body: { ...body, version },
          })
        : await api<{ id: string }>('/recurring', { method: 'POST', body });
      notify(id ? 'Recurrencia actualizada.' : 'Recurrencia creada.');
      navigate('recurring/' + saved.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-content recurring-page">
      <PageHeading
        title={id ? 'Editar recurrencia' : 'Nueva recurrencia'}
        backLink={{ href: id ? '#recurring/' + id : '#recurring', label: 'Facturas recurrentes' }}
      />
      <form className="panel recurring-form" onSubmit={submit} noValidate>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="recurring-fields">
          <Field label="Nombre">
            <input
              value={state.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={120}
              required
            />
          </Field>
          <Field
            label="Cliente"
            hint={
              state.contactId
                ? 'Seleccionado: ' + (contactLabel || 'cliente')
                : 'Escribe para buscar.'
            }
          >
            <input
              value={search}
              placeholder="Nombre o NIF"
              onChange={(e) => setSearch(e.target.value)}
            />
            {contacts.length > 0 && (
              <ul className="recurring-results" role="listbox" aria-label="Clientes">
                {contacts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        set('contactId', c.id);
                        setContactLabel(c.name);
                        setSearch('');
                        setContacts([]);
                      }}
                    >
                      {c.name} <span className="recurring-muted">{c.taxId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <Field label="Periodicidad">
            <Select
              value={state.frequency}
              onChange={(e) => set('frequency', e.target.value as Frequency)}
            >
              {frequencies.map((f) => (
                <option key={f} value={f}>
                  {frequencyLabels[f]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cada (periodos)">
            <input
              type="number"
              min={1}
              max={24}
              value={state.intervalCount}
              onChange={(e) => set('intervalCount', Number(e.target.value))}
            />
          </Field>
          <Field label="Primera factura">
            <input
              type="date"
              value={state.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </Field>
          <Field label="Fin (opcional)">
            <input
              type="date"
              value={state.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </Field>
          <Field label="Máximo de facturas (opcional)">
            <input
              type="number"
              min={1}
              value={state.maxOccurrences}
              onChange={(e) => set('maxOccurrences', e.target.value)}
            />
          </Field>
          <Field label="Vencimiento (días)">
            <input
              type="number"
              min={0}
              max={365}
              value={state.paymentDays}
              onChange={(e) => set('paymentDays', Number(e.target.value))}
            />
          </Field>
        </div>
        <p className="recurring-muted" aria-live="polite">
          Próximas fechas: {dates.length ? dates.map(shortDate).join(' · ') : '—'}
        </p>
        <h2>Líneas de la factura</h2>
        <div className="recurring-lines-wrap">
          <table className="recurring-table recurring-lines">
            <thead>
              <tr>
                <th scope="col">Descripción</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Precio</th>
                <th scope="col">Dto. %</th>
                <th scope="col">IVA %</th>
                <th scope="col">
                  <span className="sr-only">Quitar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <ProductConceptInput
                      id={`recurring-line-${i}`}
                      label={`Producto o servicio ${i + 1}`}
                      placeholder="Busca en el catálogo o escribe"
                      value={l.description}
                      products={catalogProducts}
                      loading={productsLoading}
                      catalogError={productsError}
                      disabled={busy}
                      onCreated={(product) =>
                        setCreatedProducts((current) => [...current, product])
                      }
                      onChange={(description) => setLine(i, { description })}
                      onSelect={(product) =>
                        setLine(i, {
                          description: product.name,
                          unitPrice: product.unitPrice,
                          taxRate: product.taxRate,
                          exemptionReason: product.exemptionReason,
                        })
                      }
                    />
                    {l.taxRate === '0' && (
                      <input
                        aria-label="Motivo del IVA 0 %"
                        placeholder="Motivo del IVA 0 %"
                        value={l.exemptionReason}
                        onChange={(e) => setLine(i, { exemptionReason: e.target.value })}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      aria-label="Cantidad"
                      inputMode="decimal"
                      value={l.quantity}
                      onChange={(e) => setLine(i, { quantity: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Precio unitario"
                      inputMode="decimal"
                      value={l.unitPrice}
                      onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Descuento"
                      inputMode="decimal"
                      value={l.discount}
                      onChange={(e) => setLine(i, { discount: e.target.value })}
                    />
                  </td>
                  <td>
                    <Select
                      value={l.taxRate}
                      onChange={(e) => setLine(i, { taxRate: e.target.value as Line['taxRate'] })}
                    >
                      {['21', '10', '4', '0'].map((t) => (
                        <option key={t} value={t}>
                          {t} %
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Quitar línea"
                      disabled={state.lines.length === 1}
                      onClick={() =>
                        set(
                          'lines',
                          state.lines.filter((_, n) => n !== i),
                        )
                      }
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="button"
          onClick={() => set('lines', [...state.lines, blankLine()])}
        >
          <Plus size={16} aria-hidden="true" /> Añadir línea
        </button>
        <div className="recurring-fields">
          <Field label="Retención">
            <Select
              value={state.retentionRate}
              onChange={(e) => set('retentionRate', e.target.value)}
            >
              {['0', '7', '15', '19'].map((t) => (
                <option key={t} value={t}>
                  {t} %
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Serie (opcional)">
            <input
              value={state.seriesCode}
              placeholder="Serie predeterminada"
              onChange={(e) => set('seriesCode', e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Notas" className="recurring-wide">
            <textarea rows={2} value={state.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
        <h2>Emisión y envío</h2>
        <label className="recurring-check">
          <input
            type="checkbox"
            checked={state.autoIssue}
            onChange={(e) =>
              setState({
                ...state,
                autoIssue: e.target.checked,
                autoSend: e.target.checked && state.autoSend,
              })
            }
          />
          Emitir la factura automáticamente (si no, queda como borrador)
        </label>
        <label className="recurring-check">
          <input
            type="checkbox"
            checked={state.autoSend}
            disabled={!state.autoIssue}
            onChange={(e) => set('autoSend', e.target.checked)}
          />
          Enviarla por correo al emitirla
        </label>
        {state.autoSend && (
          <div className="recurring-fields">
            <Field label="Destinatario" hint="Vacío: el correo del cliente.">
              <input
                type="email"
                value={state.recipient}
                onChange={(e) => set('recipient', e.target.value)}
              />
            </Field>
            <Field label="Asunto">
              <input value={state.subject} onChange={(e) => set('subject', e.target.value)} />
            </Field>
            <Field
              label="Mensaje"
              className="recurring-wide"
              hint={'Variables: ' + recurringVariables.map((v) => `{${v}}`).join(' ')}
            >
              <textarea rows={6} value={state.body} onChange={(e) => set('body', e.target.value)} />
            </Field>
          </div>
        )}
        <div className="recurring-actions">
          <Submit busy={busy}>{id ? 'Guardar cambios' : 'Crear recurrencia'}</Submit>
          <button
            type="button"
            className="button"
            onClick={() => navigate(id ? 'recurring/' + id : 'recurring')}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

/** Indicación en la ficha de una factura generada por una recurrencia. */
export function RecurringOrigin({ documentId }: { documentId: string }) {
  const { data } = useRemote<{ id: string; name: string } | null>(
    '/documents/' + documentId + '/recurring',
  );
  if (!data) return null;
  return (
    <p className="recurring-origin">
      <Repeat2 size={14} aria-hidden="true" /> Generada por la recurrencia{' '}
      <a href={'#recurring/' + data.id}>{data.name}</a>
    </p>
  );
}
