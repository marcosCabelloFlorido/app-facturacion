import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MetricDetail } from '../shared/dashboard';
import { euros, shortDate } from './api';
import { ErrorBox, Loading, Modal, PanelHeading, useRemote } from './components';
import './monthly-chart.css';

type Month = { month: string; revenue: string; expenses: string };
type Series = 'revenue' | 'expenses';
type Selection = { month: string; series: Series; page: number };
const seriesLabels = { revenue: 'Ingresos', expenses: 'Gastos' };
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(
    new Date(`${month}-02T12:00:00`),
  );

function chartRoute(selection: Selection | null) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  for (const key of ['chartMonth', 'chartSeries', 'chartPage']) params.delete(key);
  if (selection) {
    params.set('chartMonth', selection.month);
    params.set('chartSeries', selection.series);
    params.set('chartPage', String(selection.page));
  }
  return `overview/analysis${params.size ? `?${params}` : ''}`;
}

function AnimatedMoney({ value, delay = 0 }: { value: number; delay?: number }) {
  const [current, setCurrent] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? value : 0,
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(value);
      return;
    }
    let frame = 0;
    const startedAt = performance.now() + delay;
    const duration = 900;
    const update = (now: number) => {
      if (now < startedAt) {
        frame = requestAnimationFrame(update);
        return;
      }
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCurrent(progress === 1 ? value : value * eased);
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [delay, value]);

  return (
    <span className="animated-money" aria-label={euros(value)}>
      {euros(current)}
    </span>
  );
}

export function MonthlyChart({ monthly, result }: { monthly: Month[]; result: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollLeft = scroll.scrollWidth;
  }, []);
  const [selection, setSelection] = useState<Selection | null>(() => {
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const month = params.get('chartMonth');
    const series = params.get('chartSeries');
    const page = Number(params.get('chartPage')) || 1;
    return monthly.some((item) => item.month === month) &&
      (series === 'revenue' || series === 'expenses')
      ? { month: month!, series, page: Math.min(100000, Math.max(1, Math.floor(page))) }
      : null;
  });
  const select = (value: Selection | null) => {
    history.replaceState(history.state, '', `#${chartRoute(value)}`);
    setSelection(value);
  };
  const max = Math.max(1, ...monthly.flatMap((m) => [Number(m.revenue), Number(m.expenses)]));
  return (
    <section className="panel chart-panel monthly-chart analysis-enter">
      <PanelHeading title="Ingresos y gastos" />
      <div className="chart-legend">
        <span>
          <i className="legend-income" />
          Ingresos
        </span>
        <span>
          <i className="legend-expense" />
          Gastos
        </span>
      </div>
      <div className="chart-scroll" ref={scrollRef}>
        <div className="bar-chart" role="group" aria-label="Ingresos y gastos por mes">
          <div className="chart-axis" aria-hidden="true">
            <AnimatedMoney value={max} delay={40} />
            <AnimatedMoney value={max / 2} delay={90} />
            <span>0 €</span>
          </div>
          <div className="chart-plot">
            <div className="grid-lines" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            {monthly.map((month, index) => (
              <div className="month-bar" key={month.month}>
                <div className="bar-pair">
                  {(['revenue', 'expenses'] as const).map((series) => {
                    const label = `${seriesLabels[series]} · ${monthLabel(month.month)}: ${euros(month[series])}`;
                    return (
                      <button
                        type="button"
                        className="chart-bar-action"
                        key={series}
                        aria-label={label}
                        title={label}
                        aria-haspopup="dialog"
                        onClick={() => select({ month: month.month, series, page: 1 })}
                      >
                        <span
                          aria-hidden="true"
                          className={`bar ${series === 'revenue' ? `income ${index === monthly.length - 1 ? 'current' : ''}` : 'expense'}`}
                          style={{
                            height: `${(Math.max(0, Number(month[series])) / max) * 100}%`,
                            animationDelay: `${100 + index * 55 + (series === 'expenses' ? 45 : 0)}ms`,
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
                <span aria-hidden="true">
                  {new Intl.DateTimeFormat('es-ES', { month: 'short' })
                    .format(new Date(`${month.month}-02T12:00:00`))
                    .replace('.', '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-footer">
        <span>Resultado operativo del mes</span>
        <strong>
          <AnimatedMoney value={result} delay={180} />
        </strong>
      </div>
      {selection && (
        <MonthlyDetail
          key={`${selection.month}-${selection.series}`}
          selection={selection}
          onClose={() => select(null)}
          onPage={(page) => select({ ...selection, page })}
        />
      )}
    </section>
  );
}

function MonthlyDetail({
  selection,
  onClose,
  onPage,
}: {
  selection: Selection;
  onClose: () => void;
  onPage: (page: number) => void;
}) {
  const [retry, setRetry] = useState(0);
  // The chart includes the entire month, including future dates in the current month.
  const [year, month] = selection.month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const { data, error, loading } = useRemote<MetricDetail>(
    `/dashboard/${selection.series}?asOf=${lastDay}&page=${selection.page}`,
    retry,
  );
  const returnTo = chartRoute(selection);
  return (
    <Modal
      title={seriesLabels[selection.series]}
      description={monthLabel(selection.month)}
      sidePanel
      onClose={onClose}
    >
      <div className="side-panel-body chart-detail-body">
        {error ? (
          <div className="list-error">
            <ErrorBox>{error}</ErrorBox>
            <button type="button" className="button" onClick={() => setRetry((value) => value + 1)}>
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
                  <strong>{euros(data.total)}</strong>
                  <p>
                    Base imponible · {data.count} {data.count === 1 ? 'documento' : 'documentos'}
                  </p>
                </div>
              </div>
              <ul className="chart-documents" aria-label="Documentos del mes">
                {data.rows.map((doc) => (
                  <li key={doc.id}>
                    <a
                      className="chart-document"
                      href={`#document/${doc.id}?from=${encodeURIComponent(returnTo)}`}
                    >
                      <div className="chart-document-copy">
                        <strong>{doc.number}</strong>
                        <span>{doc.party.name}</span>
                        <small>
                          {shortDate(doc.date)}
                          {doc.kind === 'credit' ? ' · Rectificativa' : ''}
                        </small>
                      </div>
                      <strong className="chart-document-amount">{euros(doc.metric_amount)}</strong>
                    </a>
                  </li>
                ))}
              </ul>
              {!data.rows.length && data.count > 0 && (
                <button type="button" className="button" onClick={() => onPage(1)}>
                  Primera página
                </button>
              )}
              {data.count > data.pageSize && (
                <div className="table-footer">
                  <span>
                    Página {data.page} de {Math.ceil(data.count / data.pageSize)}
                  </span>
                  <div className="actions">
                    <button
                      type="button"
                      className="icon-button icon-button-plain"
                      aria-label="Página anterior"
                      title="Página anterior"
                      disabled={selection.page <= 1}
                      onClick={() => onPage(selection.page - 1)}
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-plain"
                      aria-label="Página siguiente"
                      title="Página siguiente"
                      disabled={selection.page * data.pageSize >= data.count}
                      onClick={() => onPage(selection.page + 1)}
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </Modal>
  );
}
