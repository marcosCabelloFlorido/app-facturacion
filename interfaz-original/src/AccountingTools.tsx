import { RecordNavigation } from './RecordNavigation';
import { openTableRow } from './row-navigation';
import { Select } from './Select';
import { ModuleKpis, KpiFilter } from './ModuleKpis';
import { navigate } from './api';
import { useState } from 'react';
import { api, euros, shortDate, tableDate, today } from './api';
import {
  Field,
  ErrorBox,
  Loading,
  Empty,
  PanelHeading,
  Submit,
  Modal,
  useRemote,
  type Notify,
} from './components';
export type JournalDraft = {
  id: string;
  version: number;
  actor: string;
  payload: {
    date: string;
    description: string;
    lines: { account: string; debit: string; credit: string }[];
  };
};
type Account = { code: string; name: string; section: string; control: boolean; active: boolean };
type Review = {
  canClose: boolean;
  controls: { account: string; auxiliary: string; ledger: string; difference: string }[];
  blocks: string[];
  warnings: string[];
};
type Report = {
  rows: (Account & { opening: string; debit: string; credit: string; closing: string })[];
  assets: string;
  liabilities: string;
  equity: string;
  accumulatedResult: string;
  income: string;
  expenses: string;
  result: string;
  review: Review;
};
const names: Record<string, string> = {
  asset: 'Activo',
  liability: 'Pasivo',
  equity: 'Patrimonio',
  expense: 'Gastos',
  income: 'Ingresos',
};
export function ReverseEntry({
  entry,
  onClose,
  onSaved,
}: {
  entry: { id: string; date: string; number: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(today() < entry.date ? entry.date : today()),
    [reason, setReason] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={`Revertir asiento #${entry.number}`}
      description="Se conservará el original y se registrará un asiento inverso enlazado con su motivo."
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
            await api('/accounting/entries/' + entry.id + '/reverse', {
              method: 'POST',
              body: { date, reason },
            });
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <ErrorBox>{error}</ErrorBox>}
        <Field label="Fecha de reversión">
          <input
            required
            type="date"
            min={entry.date}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Motivo">
          <textarea
            required
            minLength={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <div className="modal-actions">
          <Submit busy={busy}>Confirmar reversión</Submit>
        </div>
      </form>
    </Modal>
  );
}
export function CloseReview({ to }: { to: string }) {
  const { data, error, loading } = useRemote<Review>('/accounting/review?to=' + to);
  return error ? (
    <ErrorBox>{error}</ErrorBox>
  ) : loading ? (
    <Loading />
  ) : data ? (
    <>
      <div className="table-scroll">
        <table className="close-review-table" role="table" aria-label="Conciliación de cuentas">
          <thead>
            <tr>
              <th scope="col">Cuenta</th>
              <th scope="col" className="numeric">
                Auxiliar documental
              </th>
              <th scope="col" className="numeric">
                Saldo contable
              </th>
              <th scope="col" className="numeric">
                Diferencia
              </th>
            </tr>
          </thead>
          <tbody>
            {data.controls.map((c) => (
              <tr key={c.account}>
                <td>
                  {c.account === '430' ? 'Clientes' : 'Proveedores'} · {c.account}
                </td>
                <td className="numeric">
                  <span className="close-review-label" aria-hidden="true">
                    Auxiliar documental
                  </span>
                  <span>{euros(c.auxiliary)}</span>
                </td>
                <td className="numeric">
                  <span className="close-review-label" aria-hidden="true">
                    Saldo contable
                  </span>
                  <span>{euros(c.ledger)}</span>
                </td>
                <td className="numeric">
                  <span className="close-review-label" aria-hidden="true">
                    Diferencia
                  </span>
                  <span>{euros(c.difference)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.blocks.map((b) => (
        <ErrorBox key={b}>{b}</ErrorBox>
      ))}
    </>
  ) : null;
}
export function AccountingTools({
  tab,
  from,
  to,
  admin,
  notify,
  onEdit,
  creatingAccount,
  onCloseAccount,
  revision = 0,
}: {
  tab: string;
  from: string;
  to: string;
  admin: boolean;
  notify: Notify;
  onEdit: (d: JournalDraft) => void;
  creatingAccount: boolean;
  onCloseAccount: () => void;
  revision?: number;
}) {
  const [refresh, setRefresh] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [posting, setPosting] = useState<JournalDraft | null>(null);
  const ledgerParams = new URLSearchParams(location.hash.split('?')[1]);
  const [account, setAccount] = useState(ledgerParams.get('account') || '572'),
    [page, setPage] = useState(Math.max(1, Number(ledgerParams.get('page')) || 1));
  const ledgerHref = (code: string) =>
    '#accounting?' + new URLSearchParams({ tab: 'ledger', account: code, from, to });
  const ledgerRoute =
    'accounting?' + new URLSearchParams({ tab: 'ledger', account, from, to, page: String(page) });
  const [form, setForm] = useState({ code: '', name: '', section: 'expense' });
  const {
    data: accounts,
    loading: accountsLoading,
    error: accountsError,
  } = useRemote<Account[]>('/accounting/accounts', revision + refresh);
  const accountIndex = accounts?.findIndex((row) => row.code === account) ?? -1;
  const accountHref = (offset: number) => {
    const row = accountIndex >= 0 ? accounts?.[accountIndex + offset] : undefined;
    return row ? ledgerHref(row.code) : undefined;
  };
  const endpoint =
    tab === 'reports'
      ? `/accounting/reports?from=${from}&to=${to}`
      : tab === 'ledger'
        ? `/accounting/ledger?account=${account}&from=${from}&to=${to}&page=${page}`
        : tab === 'drafts'
          ? '/accounting/drafts'
          : '/accounting/accounts';
  const { data, error: loadError, loading } = useRemote<any>(endpoint, revision + refresh);
  const report = data as Report;
  const reportMetric = new URLSearchParams(location.hash.split('?')[1]).get('detail') || '';
  const reportLabels: Record<string, string> = {
    assets: 'Activo al cierre',
    result: 'Resultado del intervalo',
    equity: 'Patrimonio y resultado acumulado',
  };
  return (
    <>
      {(error || loadError) && <ErrorBox>{error || loadError}</ErrorBox>}
      {tab === 'ledger' && (
        <div className="record-navigation">
          <RecordNavigation
            label="Cuenta"
            collection="cuentas"
            position={accountIndex < 0 ? null : accountIndex + 1}
            count={accounts?.length ?? 0}
            previous={accountHref(-1)}
            next={accountHref(1)}
            loading={accountsLoading}
            error={accountsError}
            onRetry={() => setRefresh((v) => v + 1)}
          />
        </div>
      )}
      {tab === 'ledger' && (
        <div className="accounting-controls">
          <Field label="Cuenta del mayor">
            <Select
              value={account}
              onChange={(e) => {
                navigate(ledgerHref(e.target.value).slice(1));
              }}
            >
              {accounts?.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} · {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            {tab === 'reports' && (
              <>
                <ModuleKpis
                  active={reportMetric}
                  href={(id) => `accounting?tab=reports&from=${from}&to=${to}&detail=${id}`}
                  items={[
                    {
                      id: 'assets',
                      label: reportLabels.assets,
                      value: report.assets,
                      format: 'money',
                      context: 'Hasta ' + shortDate(to),
                    },
                    {
                      id: 'result',
                      label: reportLabels.result,
                      value: report.result,
                      format: 'money',
                      context: 'Ingresos menos gastos',
                    },
                    {
                      id: 'equity',
                      label: reportLabels.equity,
                      value: String(Number(report.equity) + Number(report.accumulatedResult)),
                      format: 'money',
                      context: 'Hasta ' + shortDate(to),
                    },
                  ]}
                />
                <KpiFilter
                  label={reportLabels[reportMetric]}
                  onClear={() => navigate(`accounting?tab=reports&from=${from}&to=${to}`)}
                />
                <section className="panel table-panel">
                  <PanelHeading title="Situación patrimonial y resultados" />
                  <div className="table-scroll">
                    <table aria-label="Situación patrimonial y resultados">
                      <thead>
                        <tr>
                          <th>Cuenta</th>
                          <th>Grupo</th>
                          <th className="numeric">Inicial</th>
                          <th className="numeric">Debe</th>
                          <th className="numeric">Haber</th>
                          <th className="numeric">Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows
                          .filter(
                            (r) =>
                              (Number(r.opening) || Number(r.debit) || Number(r.credit)) &&
                              (reportMetric === 'assets'
                                ? r.section === 'asset'
                                : reportMetric === 'result'
                                  ? ['income', 'expense'].includes(r.section)
                                  : reportMetric === 'equity'
                                    ? ['equity', 'income', 'expense'].includes(r.section)
                                    : true),
                          )
                          .map((r) => (
                            <tr
                              key={r.code}
                              className="record-row"
                              onClick={(event) => openTableRow(event, 'a.text-link')}
                            >
                              <td>
                                <strong>
                                  <a className="text-link" href={ledgerHref(r.code)}>
                                    {r.code} · {r.name}
                                  </a>
                                </strong>
                              </td>
                              <td>{names[r.section]}</td>
                              <td className="numeric">{euros(r.opening)}</td>
                              <td className="numeric">{euros(r.debit)}</td>
                              <td className="numeric">{euros(r.credit)}</td>
                              <td className="numeric">{euros(r.closing)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {!report.rows.some(
                    (r) =>
                      (Number(r.opening) || Number(r.debit) || Number(r.credit)) &&
                      (reportMetric === 'assets'
                        ? r.section === 'asset'
                        : reportMetric === 'result'
                          ? ['income', 'expense'].includes(r.section)
                          : reportMetric === 'equity'
                            ? ['equity', 'income', 'expense'].includes(r.section)
                            : true),
                  ) && <Empty title="Sin movimientos en este periodo" />}
                </section>
              </>
            )}
            {tab === 'ledger' && (
              <section className="panel table-panel">
                <PanelHeading title="Libro mayor" />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Asiento</th>
                        <th>Concepto</th>
                        <th className="numeric">Debe</th>
                        <th className="numeric">Haber</th>
                        <th className="numeric">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r: any) => (
                        <tr
                          key={r.id}
                          className={r.document_id ? 'record-row' : undefined}
                          onClick={
                            r.document_id
                              ? (event) => openTableRow(event, 'a.text-link')
                              : undefined
                          }
                        >
                          <td>{tableDate(r.date)}</td>
                          <td>#{r.number}</td>
                          <td>
                            {r.document_id ? (
                              <a
                                className="text-link"
                                href={
                                  '#document/' +
                                  r.document_id +
                                  '?from=' +
                                  encodeURIComponent(ledgerRoute)
                                }
                              >
                                {r.description}
                              </a>
                            ) : (
                              r.description
                            )}
                          </td>
                          <td className="numeric">{euros(r.debit)}</td>
                          <td className="numeric">{euros(r.credit)}</td>
                          <td className="numeric">{euros(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(data.count > 50 || page > 1) && (
                  <div className="table-footer">
                    <span>{data.count} movimientos</span>
                    <div>
                      <button
                        className="button"
                        disabled={page === 1}
                        onClick={() =>
                          navigate(ledgerRoute.replace(/page=\d+/, 'page=' + (page - 1)))
                        }
                      >
                        Anterior
                      </button>
                      <span>
                        Página {page} de {Math.max(1, Math.ceil(data.count / 50))}
                      </span>
                      <button
                        className="button"
                        disabled={page * 50 >= data.count}
                        onClick={() =>
                          navigate(ledgerRoute.replace(/page=\d+/, 'page=' + (page + 1)))
                        }
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
            {tab === 'drafts' && (
              <section className="panel">
                <PanelHeading title="Asientos pendientes de revisión" />
                {data.length ? (
                  data.map((d: JournalDraft) => (
                    <div className="recovery-row" key={d.id}>
                      <div>
                        <strong>{d.payload.description}</strong>
                        <p>
                          {shortDate(d.payload.date)} · {d.actor} · Revisión {d.version}
                        </p>
                      </div>
                      {admin && (
                        <div className="actions">
                          <button className="button" onClick={() => onEdit(d)}>
                            Revisar
                          </button>
                          <button
                            className="button primary"
                            onClick={() => {
                              setError('');
                              setPosting(d);
                            }}
                          >
                            Contabilizar
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <Empty
                    title="Sin asientos pendientes"
                    description="Crea un asiento manual para preparar un ajuste."
                  />
                )}
              </section>
            )}
            {tab === 'accounts' && (
              <section className="panel">
                <PanelHeading title="Plan de cuentas" />
                {admin && creatingAccount && (
                  <Modal
                    title="Nueva cuenta contable"
                    onClose={() => {
                      if (!busy) onCloseAccount();
                    }}
                  >
                    <form
                      className="account-modal-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        setError('');
                        try {
                          await api('/accounting/accounts', { method: 'POST', body: form });
                          setForm({ ...form, code: '', name: '' });
                          setRefresh((v) => v + 1);
                          notify('Cuenta añadida al plan.');
                          onCloseAccount();
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {error && <ErrorBox>{error}</ErrorBox>}
                      <Field label="Código">
                        <input
                          required
                          pattern="[1-9][0-9]{2,9}"
                          value={form.code}
                          onChange={(e) => setForm({ ...form, code: e.target.value })}
                        />
                      </Field>
                      <Field label="Nombre">
                        <input
                          required
                          minLength={3}
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </Field>
                      <Field label="Grupo del informe">
                        <Select
                          value={form.section}
                          onChange={(e) => setForm({ ...form, section: e.target.value })}
                        >
                          {Object.entries(names).map(([key, name]) => (
                            <option value={key} key={key}>
                              {name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <div className="modal-actions">
                        <Submit busy={busy}>Crear cuenta</Submit>
                      </div>
                    </form>
                  </Modal>
                )}
                <div className="table-scroll">
                  <table className="accounts-table" aria-label="Plan de cuentas">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Grupo</th>
                        <th>Uso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data as Account[]).map((a) => (
                        <tr
                          key={a.code}
                          className="record-row"
                          onClick={(event) => openTableRow(event, 'a.text-link')}
                        >
                          <td>
                            <a className="text-link" href={ledgerHref(a.code)}>
                              {a.code}
                            </a>
                          </td>
                          <td>
                            <a className="text-link" href={ledgerHref(a.code)}>
                              {a.name}
                            </a>
                          </td>
                          <td>{names[a.section]}</td>
                          <td>{a.control ? 'Control documental' : 'General'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )
      )}
      {posting && (
        <Modal
          title="Contabilizar asiento revisado"
          description={posting.payload.description}
          onClose={() => {
            if (!busy) setPosting(null);
          }}
        >
          {error && <ErrorBox>{error}</ErrorBox>}
          <p>
            El asiento quedará inmutable. Si necesitas corregirlo después, podrás registrar su
            reversión.
          </p>
          <div className="modal-actions">
            <button className="button" disabled={busy} onClick={() => setPosting(null)}>
              Volver
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await api('/accounting/drafts/' + posting.id + '/post', {
                    method: 'POST',
                    body: { version: posting.version },
                  });
                  setPosting(null);
                  setRefresh((v) => v + 1);
                  notify('Asiento contabilizado.');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirmar contabilización
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
