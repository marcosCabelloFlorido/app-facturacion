import { ibanFormatError, ibanPattern, isIbanFormat, normalizeIban } from '../shared/iban';
import { Profile } from './Profile';
import { RecordNavigation } from './RecordNavigation';
import { settingsDocumentBackLink } from './document-settings-route';
import { countAppliedFilters } from '../shared/filter-count';
import { decodeSearch, filterSearchRows, literalSearch } from '../shared/advanced-search';
import { Decimal } from 'decimal.js';
import { openTableRow } from './row-navigation';
import { ActionsMenu } from './ActionsMenu';
import { ListToolbar } from './ListSearch';
import { HeaderListSearch } from './HeaderSearch';
import { AccountingFilters } from './AccountingFilters';
import { Select } from './Select';
import { SettingsNavigation, settingsGroups, settingsSections } from './SettingsNavigation';
import { Workspaces } from './Workspaces';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Tooltip, TooltipTrigger } from 'react-aria-components';
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  LockKeyhole,
  Plus,
  Save,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import {
  accountNames,
  api,
  downloadUrl,
  euros,
  navigate,
  shortDate,
  tableDate,
  today,
} from './api';
import {
  Empty,
  ErrorBox,
  Field,
  Loading,
  Modal,
  PageHeading,
  PanelHeading,
  Submit,
  useRemote,
  type Notify,
} from './components';
import { labels, type Company, type User } from '../shared/domain';
import { SeriesSettings } from './FinancePanels';
import { AccessMembers } from './Access';
import { TemplatesSettings, PortalSettings } from './Communications';
import { BuyerPolicies } from './BuyerRequirements';
import { Imports } from './Imports';
import { AccountingTools, CloseReview, ReverseEntry, type JournalDraft } from './AccountingTools';
import { ModuleKpis, RemoteModuleKpis, KpiFilter, useListRoute } from './ModuleKpis';
import { accountingKpis, matchesAccountingMetric } from '../shared/accounting-kpis';
type Props = { notify: Notify; readonly: boolean };
type JournalLine = { account: string; debit: string; credit: string };
type AccountingData = {
  entries: {
    id: string;
    number: string;
    date: string;
    description: string;
    actor: string;
    event: string;
    can_reverse: boolean;
    document_id: string | null;
    lines: JournalLine[];
  }[];
  trial: { account: string; debit: string; credit: string; balance: string }[];
  periods: { month: string; closed_at: string | null }[];
  taxes: { kind: string; net: string; tax: string; retention: string }[];
};
export function Accounting(props: Props & { admin: boolean }) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const summary = !['tab', 'metric', 'detail', 'account', 'view', 'search', 'entry'].some((key) =>
    params.has(key),
  );
  return <AccountingWorkspace {...props} summary={summary} />;
}
function AccountingWorkspace({
  notify,
  admin,
  summary,
}: Props & { admin: boolean; summary: boolean }) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const [from, setFrom] = useState(params.get('from') || today().slice(0, 4) + '-01-01');
  const [to, setTo] = useState(params.get('to') || today().slice(0, 4) + '-12-31');
  const [tab] = useState(params.get('tab') || 'journal');
  const [metric, setMetric] = useState(params.get('metric') || '');
  const [search, setSearch] = useState(params.get('search') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(params.get('entry') || '');
  const setSelectedEntry = (entry: AccountingData['entries'][number] | null) =>
    setSelectedEntryId(entry?.id || '');
  useListRoute(
    'accounting',
    {
      from,
      to,
      tab,
      ...(search ? { search } : {}),
      ...(metric ? { metric } : {}),
      ...(selectedEntryId ? { entry: selectedEntryId } : {}),
      ...Object.fromEntries(
        ['detail', 'account', 'page'].flatMap((key) =>
          params.get(key) ? [[key, params.get(key)!]] : [],
        ),
      ),
    },
    !summary,
  );
  const accountingRoute =
    'accounting?' +
    new URLSearchParams({
      from,
      to,
      tab,
      ...(search ? { search } : {}),
      ...(metric ? { metric } : {}),
    });
  const ledgerHref = (account: string) =>
    '#accounting?' + new URLSearchParams({ tab: 'ledger', account, from, to });
  const documentHref = (id: string) =>
    '#document/' + id + '?from=' + encodeURIComponent(accountingRoute);
  const [revision, setRevision] = useState(0);
  const { data, error, loading } = useRemote<AccountingData>(
    `/accounting?from=${from}&to=${to}`,
    revision,
  );
  const [entry, setEntry] = useState<JournalDraft | 'new' | null>(null);
  const [reversing, setReversing] = useState<{ id: string; date: string; number: string } | null>(
    null,
  );
  const { data: chart } = useRemote<{ code: string; name: string }[]>(
    '/accounting/accounts',
    revision,
  );
  const accountLabels = {
    ...accountNames,
    ...Object.fromEntries((chart || []).map((a) => [a.code, a.name])),
  };
  const [period, setPeriod] = useState<{ month: string; close: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const totals = accountingKpis(data?.trial || []);
  const entries = filterSearchRows(
    (data?.entries || []).filter((entry) => !metric || matchesAccountingMetric(entry, metric)),
    search,
    'journal',
    (entry) => ({
      text: [
        entry.number,
        entry.description,
        entry.actor,
        ...entry.lines.map((line) => line.account),
      ].join(' '),
      date: entry.date,
      amount: entry.lines.reduce((sum, line) => sum.plus(line.debit), new Decimal(0)).toFixed(2),
    }),
  );
  const selectedEntry = data?.entries.find((row) => row.id === selectedEntryId);
  const selectedEntryIndex = entries.findIndex((row) => row.id === selectedEntryId);
  const metrics = [
    {
      id: 'revenue',
      label: 'Ingresos del periodo',
      value: totals.revenue,
      format: 'money' as const,
      context: 'Ingresos contabilizados',
    },
    {
      id: 'expenses',
      label: 'Gastos del periodo',
      value: totals.expenses,
      format: 'money' as const,
      context: 'Gastos contabilizados',
    },
    {
      id: 'result',
      label: 'Resultado del periodo',
      value: totals.result,
      format: 'money' as const,
      context: 'Ingresos menos gastos',
    },
    {
      id: 'manual',
      label: 'Asientos manuales',
      value: String(data?.entries.filter((entry) => entry.event === 'manual').length || 0),
      format: 'count' as const,
      context: 'Periodo seleccionado',
    },
  ];
  const output =
    data?.taxes.reduce(
      (sum, t) => sum + (t.kind === 'invoice' ? 1 : t.kind === 'credit' ? -1 : 0) * Number(t.tax),
      0,
    ) || 0;
  const input = (data?.taxes || []).reduce(
    (s, t) =>
      s + (t.kind === 'purchase' ? 1 : t.kind === 'purchase_credit' ? -1 : 0) * Number(t.tax),
    0,
  );
  const headerMetrics =
    tab === 'taxes'
      ? [
          {
            id: 'taxOutput',
            label: 'IVA repercutido neto',
            value: String(output),
            format: 'money' as const,
            context: 'Ventas y rectificativas',
          },
          {
            id: 'taxInput',
            label: 'IVA soportado registrado',
            value: String(input),
            format: 'money' as const,
            context: 'Compras y abonos',
          },
          {
            id: 'taxNet',
            label: 'Diferencia de IVA',
            value: String(output - input),
            format: 'money' as const,
            context: 'Periodo seleccionado',
          },
        ]
      : metrics;
  return (
    <>
      <PageHeading
        title="Contabilidad"
        tools={
          <HeaderListSearch
            scope="journal"
            label="Buscar asientos"
            placeholder="Asiento, cuenta o petición…"
            value={tab === 'journal' ? search : ''}
            onApply={(value) => {
              const f = decodeSearch(value, 'journal')?.filters;
              navigate(
                'accounting?' +
                  new URLSearchParams({
                    tab: 'journal',
                    search: value,
                    from: f?.from || (f?.to ? '0001-01-01' : from),
                    to: f?.to || (f?.from ? '9999-12-31' : to),
                  }),
              );
            }}
            onClear={() =>
              navigate(
                'accounting?' +
                  new URLSearchParams({
                    tab: 'journal',
                    from: search.startsWith('@buscar:') ? today().slice(0, 4) + '-01-01' : from,
                    to: search.startsWith('@buscar:') ? today().slice(0, 4) + '-12-31' : to,
                  }),
              )
            }
          />
        }
        backLink={!summary ? { href: '#accounting', label: 'Contabilidad' } : undefined}
        subtitleLink={
          summary
            ? {
                href: '#accounting?tab=journal&from=' + from + '&to=' + to,
                label: 'Ver el libro diario',
              }
            : undefined
        }
        metadata={summary ? `${shortDate(from)} – ${shortDate(to)}` : undefined}
        menu={[
          admin && {
            label: 'Asiento manual',
            group: 'Registrar',
            icon: Plus,
            onAction: () => setEntry('new'),
          },
          {
            label: 'Informes contables',
            group: 'Consultar y exportar',
            icon: ChartColumn,
            href: '#accounting?tab=reports&from=' + from + '&to=' + to,
          },
          {
            label: 'Cambiar periodo',
            group: 'Consultar y exportar',
            icon: CalendarDays,
            onAction: () => setFiltersOpen(true),
          },
          {
            label: 'Exportar diario completo',
            group: 'Consultar y exportar',
            icon: Download,
            href: downloadUrl('/export/journal'),
          },
        ]}
      />
      <div className="page-content accounting-page">
        {summary ? (
          error ? (
            <ErrorBox>{error}</ErrorBox>
          ) : loading ? (
            <Loading />
          ) : (
            <ModuleKpis
              items={metrics}
              href={(id) => `accounting?tab=journal&metric=${id}&from=${from}&to=${to}`}
            />
          )
        ) : (
          <>
            <div className="accounting-list-tools">
              <ListToolbar
                label="Herramientas de contabilidad"
                filterLabel="Filtrar contabilidad"
                tools={
                  tab === 'accounts' &&
                  admin && (
                    <TooltipTrigger delay={400} isDisabled={creatingAccount}>
                      <Button
                        className="list-tool-button"
                        aria-label="Nueva cuenta"
                        aria-haspopup="dialog"
                        aria-expanded={creatingAccount}
                        isDisabled={loading || !data || !!error}
                        onPress={() => setCreatingAccount(true)}
                      >
                        <Plus size={18} strokeWidth={1.4} aria-hidden="true" />
                      </Button>
                      <Tooltip className="ui-tooltip" placement="bottom end">
                        Nueva cuenta
                      </Tooltip>
                    </TooltipTrigger>
                  )
                }

                filterCount={countAppliedFilters(
                  { metric, from, to },
                  {
                    defaults: {
                      from: today().slice(0, 4) + '-01-01',
                      to: today().slice(0, 4) + '-12-31',
                    },
                    search: tab === 'journal' ? search : '',
                    scope: 'journal',
                  },
                )}
                filtersOpen={filtersOpen}
                onOpenFilters={() => setFiltersOpen(true)}
              />
            </div>
            {error ? (
              <ErrorBox>{error}</ErrorBox>
            ) : loading ? (
              <Loading />
            ) : (
              data && (
                <>
                  {['reports', 'ledger', 'drafts', 'accounts'].includes(tab) && (
                    <AccountingTools
                      key={tab}
                      tab={tab}
                      from={from}
                      to={to}
                      admin={admin}
                      notify={notify}
                      onEdit={setEntry}
                      creatingAccount={creatingAccount}
                      onCloseAccount={() => setCreatingAccount(false)}
                      revision={revision}
                    />
                  )}
                  {tab === 'journal' && (
                    <section className="panel table-panel">
                      <PanelHeading
                        title="Libro diario"
                        description={`${entries.length} asientos en el periodo seleccionado`}
                      />
                      {entries.length ? (
                        <div className="table-scroll">
                          <table className="accounting-journal-table">
                            <thead>
                              <tr>
                                <th>Asiento</th>
                                <th>Concepto</th>
                                <th>Fecha</th>
                                <th>Origen</th>
                                <th className="numeric">Importe</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map((e) => (
                                <tr
                                  key={e.id}
                                  className="record-row"
                                  onClick={(event) =>
                                    openTableRow(event, 'a.table-name, button.table-name')
                                  }
                                >
                                  <td>
                                    <button
                                      className="text-link"
                                      onClick={() => setSelectedEntry(e)}
                                      aria-label={'Ver asiento ' + e.number}
                                    >
                                      #{e.number}
                                    </button>
                                  </td>
                                  <td>
                                    {e.document_id ? (
                                      <a
                                        className="text-link table-name"
                                        href={documentHref(e.document_id)}
                                      >
                                        {e.description}
                                      </a>
                                    ) : (
                                      <button
                                        className="text-link table-name"
                                        onClick={() => setSelectedEntry(e)}
                                      >
                                        {e.description}
                                      </button>
                                    )}
                                  </td>
                                  <td>{tableDate(e.date)}</td>
                                  <td>{e.event === 'manual' ? 'Manual' : 'Automático'}</td>
                                  <td className="numeric total-cell">
                                    {euros(
                                      e.lines.reduce((sum, line) => sum + Number(line.debit), 0),
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty
                          showMessage={Boolean(metric || search)}
                          title={
                            metric
                              ? 'No hay asientos para este indicador'
                              : search
                                ? 'No hay resultados'
                                : 'El diario está preparado'
                          }
                          description={
                            metric || search
                              ? undefined
                              : 'Los asientos aparecerán al confirmar documentos o registrar movimientos.'
                          }
                        />
                      )}
                    </section>
                  )}
                  {tab === 'trial' && (
                    <section className="panel table-panel">
                      <PanelHeading
                        title="Balance de sumas y saldos"
                        description="No incluye saldos de ejercicios anteriores."
                      />
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Cuenta</th>
                              <th>Descripción</th>
                              <th className="numeric">Debe</th>
                              <th className="numeric">Haber</th>
                              <th className="numeric">Saldo deudor / acreedor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.trial.map((t) => (
                              <tr
                                key={t.account}
                                className="record-row"
                                onClick={(event) => openTableRow(event, 'a.text-link')}
                              >
                                <td>
                                  <a className="text-link" href={ledgerHref(t.account)}>
                                    {t.account}
                                  </a>
                                </td>
                                <td>{accountLabels[t.account]}</td>
                                <td className="numeric">{euros(t.debit)}</td>
                                <td className="numeric">{euros(t.credit)}</td>
                                <td className="numeric total-cell">{euros(t.balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={2}>Total</td>
                              <td className="numeric">
                                {euros(data.trial.reduce((a, t) => a + Number(t.debit), 0))}
                              </td>
                              <td className="numeric">
                                {euros(data.trial.reduce((a, t) => a + Number(t.credit), 0))}
                              </td>
                              <td className="numeric">
                                {euros(data.trial.reduce((a, t) => a + Number(t.balance), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </section>
                  )}
                  {tab === 'taxes' && (
                    <>
                      <ModuleKpis
                        items={headerMetrics}
                        active={metric}
                        href={(id) => `accounting?tab=taxes&metric=${id}&from=${from}&to=${to}`}
                      />
                      <section className="panel table-panel">
                        <PanelHeading
                          title="Bases, cuotas y retenciones"
                          description="No es una declaración tributaria."
                        />
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Tipo de documento</th>
                                <th className="numeric">Base</th>
                                <th className="numeric">IVA</th>
                                <th className="numeric">Retenciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.taxes
                                .filter((t) =>
                                  metric === 'taxOutput'
                                    ? ['invoice', 'credit'].includes(t.kind)
                                    : metric === 'taxInput'
                                      ? ['purchase', 'purchase_credit'].includes(t.kind)
                                      : true,
                                )
                                .map((t) => (
                                  <tr key={t.kind}>
                                    <td>{labels[t.kind]}</td>
                                    <td className="numeric">
                                      {['credit', 'purchase_credit'].includes(t.kind) ? '−' : ''}
                                      {euros(t.net)}
                                    </td>
                                    <td className="numeric">
                                      {['credit', 'purchase_credit'].includes(t.kind) ? '−' : ''}
                                      {euros(t.tax)}
                                    </td>
                                    <td className="numeric">
                                      {['credit', 'purchase_credit'].includes(t.kind) ? '−' : ''}
                                      {euros(t.retention)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  )}
                  {tab === 'periods' && (
                    <section className="panel table-panel">
                      <PanelHeading title="Periodos mensuales" />
                      <div className="table-scroll">
                        <table className="periods-table">
                          <thead>
                            <tr>
                              <th>Periodo</th>
                              <th>Estado</th>
                              <th>Fecha de cierre</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {data.periods.map((p) => (
                              <tr key={p.month}>
                                <td>
                                  {new Intl.DateTimeFormat('es-ES', {
                                    month: 'long',
                                    year: 'numeric',
                                  }).format(new Date(p.month + 'T12:00:00'))}
                                </td>
                                <td>
                                  <span className={`badge ${p.closed_at ? 'solid' : ''}`}>
                                    {p.closed_at ? 'Cerrado' : 'Abierto'}
                                  </span>
                                </td>
                                <td>
                                  {p.closed_at
                                    ? new Date(p.closed_at).toLocaleString('es-ES')
                                    : '—'}
                                </td>
                                <td>
                                  {admin && (
                                    <button
                                      className="button small-button"
                                      onClick={() => {
                                        setActionError('');
                                        setPeriod({ month: p.month, close: !p.closed_at });
                                      }}
                                    >
                                      <LockKeyhole size={14} />
                                      {p.closed_at ? 'Reabrir' : 'Cerrar periodo'}
                                    </button>
                                  )}
                                </td>
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
          </>
        )}
      </div>
      {filtersOpen && (
        <AccountingFilters
          metric={metric}
          tab={tab}
          from={from}
          to={to}
          onClose={() => setFiltersOpen(false)}
          onApply={(nextFrom, nextTo, nextTab, nextMetric) => {
            setFiltersOpen(false);
            if (summary || nextTab !== tab) {
              navigate(
                'accounting?' + new URLSearchParams({ tab: nextTab, from: nextFrom, to: nextTo }),
              );
              return;
            }
            setMetric(nextMetric);
            setSearch(literalSearch(search));
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />
      )}
      {selectedEntry && (
        <Modal
          title={'Asiento ' + selectedEntry.number}
          wide
          description={selectedEntry.description}
          headerActions={
            <ActionsMenu
              label={'Acciones del asiento ' + selectedEntry.number}
              items={[
                !!selectedEntry.document_id && {
                  label: 'Ver documento',
                  icon: FileText,
                  href: documentHref(selectedEntry.document_id),
                },
                admin &&
                  selectedEntry.can_reverse && {
                    label: 'Revertir asiento',
                    icon: Undo2,
                    onAction: () => {
                      setReversing(selectedEntry);
                      setSelectedEntry(null);
                    },
                  },
              ]}
            />
          }
          onClose={() => setSelectedEntry(null)}
        >
          <div className="record-navigation">
            <RecordNavigation
              label="Asiento"
              collection="asientos"
              position={selectedEntryIndex < 0 ? null : selectedEntryIndex + 1}
              count={entries.length}
              previousAction={
                selectedEntryIndex > 0
                  ? () => setSelectedEntry(entries[selectedEntryIndex - 1])
                  : undefined
              }
              nextAction={
                selectedEntryIndex >= 0 && selectedEntryIndex < entries.length - 1
                  ? () => setSelectedEntry(entries[selectedEntryIndex + 1])
                  : undefined
              }
              loading={loading}
              error={error}
              onRetry={() => setRevision((v) => v + 1)}
            />
          </div>
          <p className="muted small">
            {shortDate(selectedEntry.date)} · {selectedEntry.actor}
          </p>
          <div className="table-scroll">
            <table className="accounting-entry-lines">
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th className="numeric">Debe</th>
                  <th className="numeric">Haber</th>
                </tr>
              </thead>
              <tbody>
                {selectedEntry.lines.map((line, index) => (
                  <tr key={index}>
                    <td>
                      <a className="text-link" href={ledgerHref(line.account)}>
                        {line.account} · {accountLabels[line.account]}
                      </a>
                    </td>
                    <td className="numeric">{Number(line.debit) ? euros(line.debit) : '—'}</td>
                    <td className="numeric">{Number(line.credit) ? euros(line.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-actions">
            {selectedEntry.document_id && (
              <a className="button" href={documentHref(selectedEntry.document_id)}>
                Ver documento
              </a>
            )}
            <button className="button" onClick={() => setSelectedEntry(null)}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}
      {reversing && (
        <ReverseEntry
          entry={reversing}
          onClose={() => setReversing(null)}
          onSaved={() => {
            setReversing(null);
            setRevision((v) => v + 1);
            notify('Asiento revertido y enlazado con el original.');
          }}
        />
      )}
      {entry && (
        <EntryForm
          draft={entry === 'new' ? undefined : entry}
          onClose={() => setEntry(null)}
          onSaved={() => {
            setEntry(null);
            setRevision((v) => v + 1);
            navigate('accounting?tab=drafts&from=' + from + '&to=' + to);
            notify('Borrador de asiento guardado para revisar.');
          }}
        />
      )}
      {period && (
        <Modal
          title={period.close ? 'Cerrar periodo contable' : 'Reabrir periodo contable'}
          description={period.month.slice(0, 7)}
          wide={period.close}
          className={period.close ? 'period-close-modal' : undefined}
          onClose={() => {
            if (!busy) setPeriod(null);
          }}
        >
          {actionError && <ErrorBox>{actionError}</ErrorBox>}
          {period.close && (
            <CloseReview
              to={new Date(
                Number(period.month.slice(0, 4)),
                Number(period.month.slice(5, 7)),
                0,
                12,
              ).toLocaleDateString('en-CA')}
            />
          )}
          {!period.close && (
            <p className="modal-copy">
              Volverás a permitir asientos y movimientos con fecha en este mes.
            </p>
          )}
          <div className={period.close ? 'modal-actions period-close-actions' : 'modal-actions'}>
            <button
              type="button"
              className={period.close ? 'icon-button icon-button-plain' : 'button primary'}
              aria-label={period.close ? 'Confirmar cierre' : undefined}
              title={period.close ? 'Confirmar cierre' : undefined}
              aria-busy={busy}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api('/accounting/period', { method: 'POST', body: period });
                  setPeriod(null);
                  setRevision((v) => v + 1);
                  notify('Estado del periodo actualizado.');
                } catch (e) {
                  setActionError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {period.close ? <Check size={20} aria-hidden="true" /> : 'Confirmar reapertura'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function EntryForm({
  onClose,
  onSaved,
  draft,
}: {
  onClose: () => void;
  onSaved: () => void;
  draft?: JournalDraft;
}) {
  const { data: accounts } =
    useRemote<{ code: string; name: string; control: boolean }[]>('/accounting/accounts');
  const [date, setDate] = useState(draft?.payload.date || today());
  const [description, setDescription] = useState(draft?.payload.description || '');
  const [lines, setLines] = useState<JournalLine[]>(
    draft?.payload.lines || [
      { account: '629', debit: '0', credit: '0' },
      { account: '572', debit: '0', credit: '0' },
    ],
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (i: number, patch: Partial<JournalLine>) =>
    setLines(lines.map((l, j) => (i === j ? { ...l, ...patch } : l)));
  return (
    <Modal
      title="Asiento manual"
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api('/accounting/drafts' + (draft ? '/' + draft.id : ''), {
              method: draft ? 'PUT' : 'POST',
              body: draft
                ? { version: draft.version, entry: { date, description, lines } }
                : { date, description, lines },
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
        <div className="form-grid">
          <Field label="Fecha">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Descripción">
            <input
              required
              minLength={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        {lines.map((l, i) => (
          <div className="journal-form-line" key={i}>
            <Field label="Cuenta">
              <Select value={l.account} onChange={(e) => update(i, { account: e.target.value })}>
                {accounts
                  ?.filter((a) => !a.control)
                  .map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} · {a.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Debe">
              <input
                inputMode="decimal"
                value={l.debit}
                onChange={(e) => update(i, { debit: e.target.value.replace(',', '.') })}
              />
            </Field>
            <Field label="Haber">
              <input
                inputMode="decimal"
                value={l.credit}
                onChange={(e) => update(i, { credit: e.target.value.replace(',', '.') })}
              />
            </Field>
            <button
              type="button"
              className="icon-button"
              aria-label={`Eliminar línea contable ${i + 1}`}
              disabled={lines.length <= 2}
              onClick={() => setLines(lines.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button"
          onClick={() => setLines([...lines, { account: '555', debit: '0', credit: '0' }])}
        >
          <Plus size={16} />
          Añadir línea
        </button>
        <div className="modal-actions">
          <Submit busy={busy}>Guardar borrador</Submit>
        </div>
      </form>
    </Modal>
  );
}
export function Settings({
  me,
  onRefresh,
  onSelectWorkspace,
  notify,
  readonly,
  section: requestedSection = 'home',
}: Props & {
  me: { company: Company; user: User; demo: boolean; workspaceId: string };
  onRefresh: () => Promise<void>;
  onSelectWorkspace: (id: string) => Promise<void>;
  section?: string;
}) {
  const section = requestedSection === 'security' ? 'profile' : requestedSection;
  const [importsSearchHost, setImportsSearchHost] = useState<HTMLDivElement | null>(null);
  const [data, setData] = useState({ ...me.company, iban: normalizeIban(me.company.iban) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [userForm, setUserForm] = useState(false);
  const [seriesForm, setSeriesForm] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState(false);
  const [templateForm, setTemplateForm] = useState(false);
  const [hasTemplates, setHasTemplates] = useState(false);
  const [hasBuyerPolicies, setHasBuyerPolicies] = useState(false);
  const [buyerPolicyForm, setBuyerPolicyForm] = useState(false);
  const settingsForm = useRef<HTMLFormElement>(null);
  const admin = me.user.role === 'admin';
  const sections = settingsSections(admin);
  const category = settingsGroups.find((group) => group.value === section);
  const tab =
    section === 'home'
      ? 'company'
      : category
        ? category.items.find((value) => sections.some((item) => item.value === value)) || 'company'
        : sections.some((item) => item.value === section && item.value !== 'audit')
          ? section
          : 'company';
  const documentBackLink = settingsDocumentBackLink(location.hash.slice(1));
  const change = (key: keyof Company, value: string) => setData({ ...data, [key]: value });
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/company', { method: 'PUT', body: data });
      await onRefresh();
      notify('Datos de empresa guardados.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Configuración"
        backLink={documentBackLink}
        menu={[
          tab === 'workspaces' && {
            label: 'Añadir empresa',
            icon: Plus,
            onAction: () => setWorkspaceForm(true),
          },
          admin &&
            (tab === 'company' || tab === 'billing') && {
              label: 'Guardar cambios',
              icon: Save,
              onAction: () => settingsForm.current?.requestSubmit(),
              disabled: busy,
            },
          admin &&
            tab === 'users' && {
              label: 'Nuevo usuario',
              icon: Users,
              onAction: () => setUserForm(true),
            },
          admin &&
            tab === 'series' && {
              label: 'Nueva serie',
              icon: Plus,
              onAction: () => setSeriesForm(true),
            },
          admin &&
            tab === 'templates' &&
            hasTemplates && {
              label: 'Nueva plantilla',
              icon: Plus,
              onAction: () => setTemplateForm(true),
            },
          admin &&
            tab === 'buyer-policies' &&
            hasBuyerPolicies && {
              label: 'Añadir requisito del comprador',
              icon: Plus,
              onAction: () => setBuyerPolicyForm(true),
            },
        ]}
        tools={tab === 'imports' ? <div ref={setImportsSearchHost} /> : undefined}
      />
      <div className="page-content settings-hierarchy">
        <div className="settings-two-level">
          <SettingsNavigation
            section={tab}
            sections={sections}
            onNavigate={(value) => {
              const context = new URLSearchParams(location.hash.split('?')[1]);
              const returnParams = documentBackLink
                ? '?' +
                  new URLSearchParams({
                    returnTo: documentBackLink.href.slice(1),
                    documentKind: context.get('documentKind') || '',
                  })
                : '';
              navigate(
                (value === 'audit'
                  ? 'audit'
                  : value === 'home'
                    ? 'settings'
                    : 'settings/' + value) + returnParams,
              );
              setError('');
            }}
          />
          <div className="settings-main settings-section-content">
            {tab === 'workspaces' && (
              <Workspaces
                currentId={me.workspaceId}
                onSelect={onSelectWorkspace}
                creating={workspaceForm}
                onCreatingChange={setWorkspaceForm}
              />
            )}
            {tab === 'templates' && (
              <TemplatesSettings
                notify={notify}
                readonly={!admin}
                creating={admin && templateForm}
                onCreatingChange={setTemplateForm}
                onHasItemsChange={setHasTemplates}
              />
            )}
            {tab === 'portal' && admin && <PortalSettings notify={notify} />}
            {tab === 'imports' && (
              <Imports
                key={location.hash}
                notify={notify}
                readonly={readonly}
                searchHost={importsSearchHost}
              />
            )}
            {tab === 'buyer-policies' && admin && (
              <BuyerPolicies
                notify={notify}
                creating={buyerPolicyForm}
                onCreatingChange={setBuyerPolicyForm}
                onHasItemsChange={setHasBuyerPolicies}
              />
            )}
            {tab === 'series' && admin && (
              <SeriesSettings
                notify={notify}
                creating={seriesForm}
                onCreatingChange={setSeriesForm}
              />
            )}
            {error && <ErrorBox>{error}</ErrorBox>}
            {(tab === 'company' || tab === 'billing') && (
              <form
                ref={settingsForm}
                className="panel settings-form"
                data-settings-section={tab}
                onSubmit={save}
              >
                <PanelHeading
                  title={tab === 'company' ? 'Datos de empresa' : 'Preferencias de facturación'}
                />
                {tab === 'company' ? (
                  <>
                    <section
                      className="settings-field-group"
                      aria-labelledby="company-fiscal-heading"
                    >
                      <h3 id="company-fiscal-heading">Datos fiscales</h3>
                      <div className="form-grid">
                        <Field label="Razón social">
                          <input
                            required
                            disabled={!admin}
                            value={data.name}
                            onChange={(e) => change('name', e.target.value)}
                          />
                        </Field>
                        <Field label="NIF / identificador fiscal">
                          <input
                            required
                            disabled={!admin}
                            value={data.taxId}
                            onChange={(e) => change('taxId', e.target.value)}
                          />
                        </Field>
                        <Field label="Dirección fiscal" className="span-2">
                          <input
                            required
                            disabled={!admin}
                            value={data.address}
                            onChange={(e) => change('address', e.target.value)}
                          />
                        </Field>
                      </div>
                    </section>
                    <section
                      className="settings-field-group"
                      aria-labelledby="company-contact-heading"
                    >
                      <h3 id="company-contact-heading">Contacto</h3>
                      <div className="form-grid">
                        <Field label="Correo de facturación">
                          <input
                            type="email"
                            disabled={!admin}
                            value={data.email}
                            onChange={(e) => change('email', e.target.value)}
                          />
                        </Field>
                        <Field label="Teléfono">
                          <input
                            disabled={!admin}
                            value={data.phone}
                            onChange={(e) => change('phone', e.target.value)}
                          />
                        </Field>
                        <Field label="Sitio web">
                          <input
                            disabled={!admin}
                            value={data.website}
                            onChange={(e) => change('website', e.target.value)}
                          />
                        </Field>
                      </div>
                    </section>
                  </>
                ) : (
                  <>
                    <div className="form-grid">
                      <Field label="Moneda">
                        <input disabled value="EUR · Euro" />
                      </Field>
                      <Field label="IBAN para el documento">
                        <input
                          disabled={!admin}
                          value={data.iban}
                          autoCapitalize="characters"
                          spellCheck={false}
                          pattern={ibanPattern}
                          placeholder="ES79 2100 0813 6101 2345 6789"
                          onBlur={(e) => {
                            e.target.setCustomValidity(
                              isIbanFormat(e.target.value) ? '' : ibanFormatError,
                            );
                          }}
                          onChange={(e) => {
                            const input = e.currentTarget;
                            const value = normalizeIban(input.value);
                            let caret = normalizeIban(
                              input.value.slice(0, input.selectionStart ?? input.value.length),
                            ).length;
                            if (
                              (e.nativeEvent as InputEvent).inputType === 'deleteContentForward' &&
                              value[caret] === ' '
                            ) {
                              caret += 1;
                            }
                            change('iban', value);
                            input.value = value;
                            input.setSelectionRange(caret, caret);
                            input.setCustomValidity(isIbanFormat(value) ? '' : ibanFormatError);
                          }}
                        />
                      </Field>
                      <Field label="Condiciones de pago" className="span-2">
                        <textarea
                          rows={3}
                          disabled={!admin}
                          value={data.paymentTerms}
                          onChange={(e) => change('paymentTerms', e.target.value)}
                        />
                      </Field>
                    </div>
                  </>
                )}
                {admin && (
                  <button type="submit" hidden disabled={busy}>
                    Guardar cambios
                  </button>
                )}
              </form>
            )}
            {tab === 'users' && admin && (
              <section className="panel table-panel">
                <PanelHeading title="Usuarios y permisos" />
                <AccessMembers revision={revision} onRefresh={() => void onRefresh()} />
              </section>
            )}
            {tab === 'profile' && <Profile user={me.user} onRefresh={onRefresh} notify={notify} />}
          </div>
        </div>
      </div>
      {userForm && (
        <UserForm
          onClose={() => setUserForm(false)}
          onSaved={() => {
            setUserForm(false);
            setRevision((v) => v + 1);
            notify('Cuenta local creada.');
          }}
        />
      )}
    </>
  );
}
function UserList({ revision }: { revision: number }) {
  const { data, error, loading } = useRemote<(User & { active: boolean })[]>('/users', revision);
  return error ? (
    <ErrorBox>{error}</ErrorBox>
  ) : loading ? (
    <Loading />
  ) : (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Permiso</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
              </td>
              <td>{u.email}</td>
              <td>
                <span className="badge">{labels[u.role]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function UserForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState({ name: '', email: '', password: '', role: 'operator' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal
      title="Crear cuenta de usuario"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api('/users', { method: 'POST', body: data });
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <ErrorBox>{error}</ErrorBox>}
        <Field label="Nombre">
          <input
            required
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
        </Field>
        <Field label="Correo electrónico">
          <input
            type="email"
            required
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
          />
        </Field>
        <Field label="Contraseña inicial">
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={data.password}
            onChange={(e) => setData({ ...data, password: e.target.value })}
          />
        </Field>
        <Field label="Permisos">
          <Select value={data.role} onChange={(e) => setData({ ...data, role: e.target.value })}>
            <option value="operator">Gestor</option>
            <option value="viewer">Consulta</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
        <div className="modal-actions">
          <Submit busy={busy}>Crear cuenta local</Submit>
        </div>
      </form>
    </Modal>
  );
}
export function Audit({ me }: { me: { company: Company; user: User } }) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const [search, setSearch] = useState(params.get('search') || '');
  const [metric, setMetric] = useState(params.get('metric') || '');
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  useListRoute('audit', { search, page: String(page), ...(metric ? { metric } : {}) });
  const { data, error, loading } = useRemote<{
    rows: { id: string; action: string; actor: string; entity_id: string; created_at: string }[];
    hasMore: boolean;
  }>(
    `/audit?pagination=1&search=${encodeURIComponent(search)}&page=${page}${metric ? '&metric=' + metric : ''}`,
  );
  return (
    <>
      <PageHeading
        eyebrow="CONTROL"
        title="Registro de auditoría"
        backLink={{ href: '#settings/account', label: 'Cuenta y seguridad' }}
        tools={
          <HeaderListSearch
            scope="audit"
            label="Buscar auditoría"
            placeholder="Operación, usuario o petición…"
            value={search}
            onApply={(value) => {
              setSearch(value);
              setMetric('');
              setPage(1);
            }}
            onClear={() => {
              setSearch('');
              setPage(1);
            }}
          />
        }
        description="Registro de operaciones."
      />
      <div className="page-content settings-two-level">
        <SettingsNavigation
          section="audit"
          sections={settingsSections(me.user.role === 'admin')}
          onNavigate={(value) => {
            const params = new URLSearchParams(location.hash.split('?')[1]);
            const context = new URLSearchParams();
            for (const key of ['returnTo', 'documentKind'])
              if (params.has(key)) context.set(key, params.get(key)!);
            navigate(
              (value === 'audit' ? 'audit' : 'settings/' + value) +
                (context.size ? '?' + context : ''),
            );
          }}
        />
        <div className="settings-section-content">
          <RemoteModuleKpis
            path="/module-kpis/audit"
            active={metric}
            href={(id) => 'audit?metric=' + id}
          />
          <KpiFilter
            label={
              (
                {
                  today: 'Operaciones de hoy',
                  week: 'Últimos 7 días',
                  documents: 'Operaciones sobre documentos',
                  payments: 'Operaciones sobre movimientos',
                } as Record<string, string>
              )[metric]
            }
            onClear={() => {
              setMetric('');
              setPage(1);
            }}
          />
          <section className="panel table-panel">
            {error ? (
              <ErrorBox>{error}</ErrorBox>
            ) : loading ? (
              <Loading />
            ) : (
              <div className="table-scroll">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Acción</th>
                      <th>Usuario</th>
                      <th>Fecha y hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rows.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.action}</strong>
                        </td>
                        <td>{a.actor}</td>
                        <td>{new Date(a.created_at).toLocaleString('es-ES')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && (page > 1 || data?.hasMore) && (
              <div className="table-footer">
                <span>Página {page}</span>
                <div>
                  <button
                    type="button"
                    className="icon-button icon-button-plain"
                    aria-label="Página anterior"
                    title="Página anterior"
                    disabled={page === 1}
                    onClick={() => setPage((v) => v - 1)}
                  >
                    <ChevronLeft size={18} strokeWidth={1.6} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-plain"
                    aria-label="Página siguiente"
                    title="Página siguiente"
                    disabled={!data?.hasMore}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    <ChevronRight size={18} strokeWidth={1.6} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
