import { openTableRow } from './row-navigation';
import { contactDetailHref } from './contact-route';
import { useState } from 'react';
import {
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Receipt,
  Wallet,
} from 'lucide-react';
import {
  dashboardMetrics,
  type DashboardMetric,
  type DashboardSummary,
  type MetricDetail,
} from '../shared/dashboard';
import { ModuleKpis } from './ModuleKpis';
import { euros, shortDate, tableDate } from './api';
import { formatKpiValue } from './kpi-format';
import { Empty, ErrorBox, Loading, PageHeading, useRemote } from './components';

export function Dashboard({ name, readonly }: { name: string; readonly: boolean }) {
  const [retry, setRetry] = useState(0);
  const { data, error, loading } = useRemote<DashboardSummary>('/dashboard/summary', retry);
  return (
    <>
      <PageHeading
        variant="greeting"
        title={`Hola, ${name.split(' ')[0]}`}
        menu={[
          !readonly && {
            label: 'Nueva factura',
            group: 'Crear documentos',
            icon: FilePlus2,
            href: '#new/invoice',
          },
          !readonly && {
            label: 'Nuevo presupuesto',
            group: 'Crear documentos',
            icon: FilePlus2,
            href: '#new/quote',
          },
          !readonly && {
            label: 'Nueva compra',
            group: 'Crear documentos',
            icon: Receipt,
            href: '#new/purchase',
          },
          {
            label: 'Evolución y actividad',
            group: 'Consultar',
            icon: ChartNoAxesCombined,
            href: '#overview/analysis',
          },
          { label: 'Vencimientos pendientes', group: 'Consultar', icon: Wallet, href: '#payments' },
        ]}
      />
      <div className="page-content overview-focus">
        {error ? (
          <div className="list-error">
            <ErrorBox>{error}</ErrorBox>
            <button className="button" onClick={() => setRetry((value) => value + 1)}>
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <Loading />
        ) : (
          data && (
            <>
              <ModuleKpis
                label={`Resumen del negocio a ${shortDate(data.as_of)}`}
                items={(Object.keys(dashboardMetrics) as DashboardMetric[]).map((key) => ({
                  id: key,
                  label: dashboardMetrics[key].label,
                  value: data[key],
                  format: 'money',
                  context: '',
                  comparisons: data.comparisons?.[key],
                }))}
                href={(key) =>
                  key === 'revenue'
                    ? `sales?view=list&metric=month&asOf=${data.as_of}`
                    : `overview/${key}?asOf=${data.as_of}`
                }
              />
            </>
          )
        )}
      </div>
    </>
  );
}

export function DashboardDetail({ metric }: { metric: DashboardMetric }) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const asOf = params.get('asOf');
  const [retry, setRetry] = useState(0);
  const query = new URLSearchParams({ page: String(page), ...(asOf ? { asOf } : {}) });
  const { data, loading, error } = useRemote<MetricDetail>(`/dashboard/${metric}?${query}`, retry);
  const definition = dashboardMetrics[metric];
  const returnTo = `overview/${metric}?${query}`;
  return (
    <>
      <PageHeading title={definition.label} />
      <div className="page-content metric-detail">
        {error ? (
          <div className="list-error">
            <ErrorBox>{error}</ErrorBox>
            <button className="button" onClick={() => setRetry((v) => v + 1)}>
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <Loading />
        ) : (
          data && (
            <>
              <div className="metric-detail-summary">
                <div>
                  <strong>{formatKpiValue(data.total, true)}</strong>
                  <p>
                    {data.count} {data.count === 1 ? 'documento' : 'documentos'}
                    {definition.monthly
                      ? ` · ${shortDate(data.as_of.slice(0, 8) + '01')} – ${shortDate(data.as_of)}`
                      : metric === 'quotes'
                        ? ` · vigentes a ${shortDate(data.as_of)}`
                        : ' · saldo actual'}
                  </p>
                </div>
              </div>
              {data.rows.length ? (
                <div className="table-scroll">
                  <table className="metric-table">
                    <thead>
                      <tr>
                        <th>Documento</th>
                        <th>Cliente / proveedor</th>
                        <th>Fecha</th>
                        <th className="numeric">{definition.amountLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((doc) => (
                        <tr key={doc.id} className="record-row" onClick={openTableRow}>
                          <td>
                            <a
                              className="document-link"
                              href={`#document/${doc.id}?from=${encodeURIComponent(returnTo)}`}
                            >
                              <strong>{doc.number}</strong>
                            </a>
                            {doc.kind === 'credit' && (
                              <small className="metric-credit-label">Rectificativa</small>
                            )}
                          </td>
                          <td>
                            {contactDetailHref(doc.party.taxId, returnTo) ? (
                              <a
                                className="text-link table-name"
                                href={contactDetailHref(doc.party.taxId, returnTo)}
                              >
                                {doc.party.name}
                              </a>
                            ) : (
                              doc.party.name
                            )}
                          </td>
                          <td>{tableDate(doc.date)}</td>
                          <td className="numeric total-cell">{euros(doc.metric_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  showMessage={Boolean(data.count)}
                  title={
                    data.count
                      ? 'Esta página ya no tiene documentos'
                      : definition.monthly
                        ? 'Sin documentos en este periodo'
                        : metric === 'quotes'
                          ? 'Sin presupuestos pendientes'
                          : 'Todo al día'
                  }
                  action={
                    data.count ? (
                      <a
                        className="button"
                        href={`#overview/${metric}?${new URLSearchParams({ ...Object.fromEntries(query), page: '1' })}`}
                      >
                        Primera página
                      </a>
                    ) : undefined
                  }
                />
              )}
              {data.count > data.pageSize && (
                <div className="table-footer">
                  <span>
                    Página {data.page} de {Math.ceil(data.count / data.pageSize)}
                  </span>
                  <div className="actions">
                    {page > 1 && (
                      <a
                        className="icon-button"
                        aria-label="Página anterior"
                        href={`#overview/${metric}?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page - 1) })}`}
                      >
                        <ChevronLeft size={18} />
                      </a>
                    )}
                    {page * data.pageSize < data.count && (
                      <a
                        className="icon-button"
                        aria-label="Página siguiente"
                        href={`#overview/${metric}?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) })}`}
                      >
                        <ChevronRight size={18} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </>
  );
}
