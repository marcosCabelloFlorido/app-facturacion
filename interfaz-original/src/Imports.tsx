import { openTableRow } from './row-navigation';
import { Select } from './Select';
import { ListToolbar } from './ListSearch';
import { ImportFilters } from './ImportFilters';
import { useState } from 'react';
import { RecordNavigation } from './RecordNavigation';
import { HeaderListSearch } from './HeaderSearch';
import { createPortal } from 'react-dom';
import { api, navigate, euros } from './api';
import {
  Field,
  PanelHeading,
  ErrorBox,
  Loading,
  Submit,
  Empty,
  useRemote,
  type Notify,
} from './components';
import { uploadFile } from './Files';
import { importFields, importAliases } from '../shared/imports';
import { RemoteModuleKpis, KpiFilter, useListRoute } from './ModuleKpis';
type Batch = {
  id: string;
  filename: string;
  kind: string;
  created_at: string;
  total: number;
  ready: number;
  imported: number;
  errors: number;
};
type Detail = Batch & {
  rows: {
    id: string;
    row_number: number;
    status: string;
    payload: any;
    errors: { row: number; field: string; message: string }[];
    result_id: string | null;
  }[];
  totals: { status: string; count: number }[];
  page: number;
};
const statusNames: Record<string, string> = {
  ready: 'Preparado',
  error: 'Revisar',
  imported: 'Importado',
  duplicate: 'Ya importado',
};
export function Imports({
  notify,
  readonly,
  searchHost,
}: {
  notify: Notify;
  readonly: boolean;
  searchHost?: HTMLElement | null;
}) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [metric, setMetric] = useState(params.get('metric') || '');
  const [search, setSearch] = useState(params.get('search') || '');
  const [historyPage, setHistoryPage] = useState(Number(params.get('page')) || 1);
  const [view, setView] = useState(
    params.get('view') === 'history' || readonly || metric ? 'history' : 'prepare',
  );
  const [file, setFile] = useState<{ id: string; filename: string } | null>(null),
    [table, setTable] = useState<{
      headers: string[];
      sample: string[][];
      rowCount: number;
    } | null>(null),
    [kind, setKind] = useState('purchase'),
    [delimiter, setDelimiter] = useState(';'),
    [encoding, setEncoding] = useState('utf-8'),
    [mapping, setMapping] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [selected, setSelected] = useState(params.get('batch') || ''),
    [revision, setRevision] = useState(0),
    [page, setPage] = useState(Math.max(1, Number(params.get('batchPage')) || 1));
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [navigationError, setNavigationError] = useState('');
  const [navigationDirection, setNavigationDirection] = useState(1);
  useListRoute('settings/imports', {
    view,
    page: String(historyPage),
    ...(search ? { search } : {}),
    ...(metric ? { metric } : {}),
    ...(selected ? { batch: selected, batchPage: String(page) } : {}),
  });
  const historyEndpoint = (page: number) =>
    '/imports?' +
    new URLSearchParams({
      pagination: '1',
      page: String(page),
      search,
      ...(metric ? { metric } : {}),
    });
  const {
    data: history,
    error: loadError,
    loading: batchesLoading,
  } = useRemote<{ rows: Batch[]; hasMore: boolean }>(historyEndpoint(historyPage), revision);
  const {
    data: detail,
    loading,
    error: detailError,
  } = useRemote<Detail | Batch[]>(
    selected ? '/imports/' + selected + '?page=' + page : '/imports',
    revision,
  );
  const batches = history?.rows;
  const batch =
    selected && detail && !Array.isArray(detail) && detail.id === selected ? detail : null;
  const batchIndex = batches?.findIndex((row) => row.id === selected) ?? -1;
  async function moveBatch(direction: number) {
    if (busy || navigationLoading || batchesLoading || batchIndex < 0) return;
    setNavigationDirection(direction);
    setNavigationError('');
    const neighbour = batches?.[batchIndex + direction];
    if (neighbour) {
      setSelected(neighbour.id);
      setPage(1);
      setError('');
      return;
    }
    setNavigationLoading(true);
    try {
      const adjacentPage = historyPage + direction;
      const adjacent = await api<{ rows: Batch[]; hasMore: boolean }>(
        historyEndpoint(adjacentPage),
      );
      const row = direction < 0 ? adjacent.rows.at(-1) : adjacent.rows[0];
      if (!row)
        throw new Error('El listado ha cambiado. Vuelve a importaciones para actualizarlo.');
      setHistoryPage(adjacentPage);
      setSelected(row.id);
      setPage(1);
      setError('');
    } catch (e) {
      setNavigationError((e as Error).message);
    } finally {
      setNavigationLoading(false);
    }
  }
  async function inspect(
    source: { id: string; filename: string },
    sep = delimiter,
    enc = encoding,
  ) {
    const t = await api<{ headers: string[]; sample: string[][]; rowCount: number }>(
      '/files/' + source.id + '/table?delimiter=' + encodeURIComponent(sep) + '&encoding=' + enc,
    );
    setTable(t);
    const found: Record<string, number> = {};
    for (const [key, aliases] of Object.entries(importAliases)) {
      const i = t.headers.findIndex((h) => aliases.includes(h.toLowerCase()));
      if (i >= 0) found[key] = i;
    }
    setMapping(found);
  }
  const fields = kind === 'product' ? importFields.product : importFields.document;
  return (
    <section className="imports-page" aria-label="Importaciones">
      {searchHost &&
        createPortal(
          <HeaderListSearch
            scope="imports"
            label="Buscar importaciones"
            placeholder="Archivo o petición…"
            value={search}
            onApply={(value) => {
              setView('history');
              setSelected('');
              setSearch(value);
              setMetric('');
              setHistoryPage(1);
            }}
            onClear={() => {
              setView('history');
              setSelected('');
              setSearch('');
              setHistoryPage(1);
            }}
          />,
          searchHost,
        )}

      <PanelHeading title="Importaciones" />
      {selected && (
        <div className="record-navigation">
          <RecordNavigation
            label="Lote"
            collection="lotes de importación"
            position={batchIndex < 0 ? null : (historyPage - 1) * 100 + batchIndex + 1}
            count={
              history && !history.hasMore
                ? (historyPage - 1) * 100 + history.rows.length
                : undefined
            }
            previousAction={
              batchIndex > 0 || (batchIndex === 0 && historyPage > 1)
                ? () => void moveBatch(-1)
                : undefined
            }
            nextAction={
              batchIndex >= 0 && (batchIndex < (batches?.length ?? 0) - 1 || history?.hasMore)
                ? () => void moveBatch(1)
                : undefined
            }
            loading={batchesLoading || navigationLoading || busy || loading}
            error={loadError || navigationError}
            onRetry={() =>
              loadError ? setRevision((v) => v + 1) : void moveBatch(navigationDirection)
            }
          />
        </div>
      )}
      {!selected && (
        <RemoteModuleKpis
          path="/module-kpis/imports"
          revision={revision}
          active={metric}
          href={(id) => 'settings/imports?view=history&metric=' + id}
        />
      )}
      {!selected && (
        <KpiFilter
          label={
            (
              {
                all: 'Todos los lotes',
                ready: 'Lotes con registros preparados',
                error: 'Lotes con errores por revisar',
                imported: 'Lotes con datos importados',
              } as Record<string, string>
            )[metric]
          }
          onClear={() => {
            setMetric('');
            setHistoryPage(1);
          }}
        />
      )}
      {!selected && (
        <>
          <ListToolbar
            label="Herramientas de importaciones"
            filterLabel="Filtros de importaciones"
            filterCount={view !== (readonly ? 'history' : 'prepare') ? 1 : 0}
            filtersOpen={filtersOpen}
            onOpenFilters={() => setFiltersOpen(true)}
            searchEnabled={false}
          />
          {filtersOpen && (
            <ImportFilters
              view={view}
              readonly={readonly}
              onClose={() => setFiltersOpen(false)}
              onApply={(nextView) => {
                setView(nextView);
                setFiltersOpen(false);
              }}
            />
          )}
        </>
      )}
      {(error || loadError) && <ErrorBox>{error || loadError}</ErrorBox>}
      {!readonly && !selected && view === 'prepare' && (
        <section className="panel">
          <PanelHeading
            title={file && table ? 'Relaciona las columnas' : 'Elige qué vas a importar'}
          />
          <div className="form-grid">
            <Field label="Qué vas a importar">
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="purchase">Compras recibidas</option>
                <option value="invoice">Facturas de venta en borrador</option>
                <option value="product">Productos y servicios</option>
              </Select>
            </Field>
            <Field label="Archivo CSV o XLSX">
              <input
                type="file"
                accept=".csv,.xlsx"
                disabled={busy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setBusy(true);
                  setError('');
                  try {
                    const saved = await uploadFile(f);
                    setFile(saved);
                    await inspect(saved);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </Field>
            <details className="import-csv-options">
              <summary>Opciones del archivo CSV</summary>
              <div className="form-grid">
                <Field label="Separador CSV">
                  <Select
                    value={delimiter}
                    disabled={busy}
                    onChange={async (e) => {
                      setDelimiter(e.target.value);
                      if (file) {
                        setBusy(true);
                        try {
                          await inspect(file, e.target.value);
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }
                    }}
                  >
                    <option value=";">Punto y coma</option>
                    <option value=",">Coma</option>
                    <option value={'\t'}>Tabulación</option>
                  </Select>
                </Field>
                <Field label="Codificación CSV">
                  <Select
                    value={encoding}
                    disabled={busy}
                    onChange={async (e) => {
                      setEncoding(e.target.value);
                      if (file) {
                        setBusy(true);
                        try {
                          await inspect(file, delimiter, e.target.value);
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }
                    }}
                  >
                    <option value="utf-8">UTF-8</option>
                    <option value="windows-1252">Windows-1252</option>
                  </Select>
                </Field>
              </div>
            </details>
          </div>
          {file && table && (
            <>
              <p>
                <strong>{file.filename}</strong> · {table.rowCount} filas. Si varias filas
                pertenecen a una factura, relaciona su clave de documento.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError('');
                  try {
                    const b = await api<{ id: string }>('/imports/preview', {
                      method: 'POST',
                      body: { fileId: file.id, kind, mapping, delimiter, encoding },
                    });
                    setSelected(b.id);
                    setView('history');
                    setSearch('');
                    setMetric('');
                    setHistoryPage(1);
                    setPage(1);
                    setRevision((v) => v + 1);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="import-mapping">
                  {fields.map(([key, label]) => (
                    <Field key={key} label={label}>
                      <Select
                        value={mapping[key] ?? ''}
                        onChange={(e) => {
                          const next = { ...mapping };
                          if (e.target.value === '') delete next[key];
                          else next[key] = Number(e.target.value);
                          setMapping(next);
                        }}
                      >
                        <option value="">Sin columna</option>
                        {table.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ))}
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {table.headers.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.sample.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          {r.map((v, j) => (
                            <td key={j}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="form-footer">
                  <Submit busy={busy}>Validar y revisar lote</Submit>
                </div>
              </form>
            </>
          )}
        </section>
      )}
      {selected && (
        <button
          className="button"
          disabled={busy || navigationLoading}
          onClick={() => {
            setNavigationError('');
            setSelected('');
            setView('history');
            setError('');
          }}
        >
          Volver a importaciones
        </button>
      )}
      {selected && detailError && <ErrorBox>{detailError}</ErrorBox>}
      {selected && loading ? (
        <Loading />
      ) : (
        batch && (
          <section className="panel">
            <PanelHeading
              title={batch.filename}
              description={batch.totals
                .map(
                  (t) =>
                    `${t.count} ${t.status === 'error' ? 'por revisar' : t.status === 'ready' ? 'preparado' + (t.count === 1 ? '' : 's') : t.status === 'duplicate' ? 'ya importado' + (t.count === 1 ? '' : 's') : 'importado' + (t.count === 1 ? '' : 's')}`,
                )
                .join(' · ')}
              action={
                !readonly &&
                batch.totals.some((t) => t.status === 'ready' && t.count > 0) && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        const r = await api<{
                          imported: number;
                          failed: number;
                          remaining: number;
                        }>('/imports/' + batch.id + '/commit', { method: 'POST', body: {} });
                        setRevision((v) => v + 1);
                        notify(
                          `${r.imported} registros importados; ${r.failed} requieren revisión. Quedan ${r.remaining} preparados.`,
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? 'Procesando…' : 'Importar hasta 100 preparados'}
                  </button>
                )
              }
            />
            <div className="table-scroll">
              <table className="import-results-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Registro</th>
                    <th>Estado</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.rows.map((r) => (
                    <tr
                      key={r.id}
                      className={r.result_id ? 'record-row' : undefined}
                      onClick={r.result_id ? openTableRow : undefined}
                    >
                      <td>{r.row_number}</td>
                      <td>
                        <strong>{r.payload.party?.name || r.payload.name || 'Sin nombre'}</strong>
                        <small>{r.payload.reference || r.payload.sku || r.payload.date}</small>
                      </td>
                      <td>{statusNames[r.status]}</td>
                      <td>
                        {r.errors.map((e, i) => (
                          <p key={i}>
                            Fila {e.row}, {e.field}: {e.message}
                          </p>
                        ))}
                        {r.result_id && (
                          <a
                            className="document-link"
                            href={
                              batch.kind === 'product'
                                ? '#catalog?view=list&product=' + r.result_id
                                : '#document/' + r.result_id
                            }
                          >
                            Abrir registro
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(batch.totals.reduce((sum, total) => sum + total.count, 0) > 50 || page > 1) && (
              <div className="table-footer">
                <span>
                  Página {page} de{' '}
                  {Math.max(
                    1,
                    Math.ceil(batch.totals.reduce((sum, total) => sum + total.count, 0) / 50),
                  )}
                </span>
                <div>
                  <button
                    className="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="button"
                    disabled={page * 50 >= batch.totals.reduce((s, t) => s + t.count, 0)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </section>
        )
      )}
      {!selected && view === 'history' && (
        <section className="panel">
          <PanelHeading title="Historial de importaciones" />

          {batchesLoading ? (
            <Loading />
          ) : batches?.length ? (
            batches.map((b) => (
              <div className="recovery-row" key={b.id}>
                <div>
                  <strong>{b.filename}</strong>
                  <p>
                    {b.total} registros · {b.imported} importados · {b.errors} por revisar
                  </p>
                </div>
                <button
                  className="button"
                  onClick={() => {
                    setSelected(b.id);
                    setPage(1);
                    setError('');
                  }}
                >
                  Revisar lote
                </button>
              </div>
            ))
          ) : (
            <Empty
              showMessage={Boolean(metric || search)}
              title={
                metric
                  ? 'No hay lotes para este indicador'
                  : search
                    ? 'No hay resultados'
                    : 'Sin importaciones'
              }
            />
          )}
          {!batchesLoading && !loadError && (historyPage > 1 || history?.hasMore) && (
            <div className="table-footer">
              <span>Página {historyPage}</span>
              <div>
                <button
                  className="button"
                  disabled={historyPage === 1 || batchesLoading}
                  onClick={() => setHistoryPage((v) => v - 1)}
                >
                  Anterior
                </button>
                <button
                  className="button"
                  disabled={batchesLoading || !history?.hasMore}
                  onClick={() => setHistoryPage((v) => v + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
