import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import type { ModuleKpi, ModuleSummary } from '../shared/module-kpis';
import { formatKpiValue } from './kpi-format';
import { ErrorBox, Loading, useRemote } from './components';
import { KpiComparisonModal } from './KpiComparisonModal';

export function useListRoute(section: string, query: Record<string, string>, enabled = true) {
  const route = section + '?' + new URLSearchParams(query).toString();
  useEffect(() => {
    if (enabled) history.replaceState(null, '', '#' + route);
  }, [route, enabled]);
}

// FUENTE: kit 11-stat-tile.md, DashboardModule.tsx:115–169; misma base que Visión general.
export function ModuleKpis({
  items,
  active,
  href,
  label = 'Indicadores de la sección',
}: {
  items: ModuleKpi[];
  active?: string;
  href: (id: string) => string;
  label?: string;
}) {
  const [comparisonItem, setComparisonItem] = useState<ModuleKpi | null>(null);
  return (
    <nav
      className={`metric-links module-kpis${items.length === 3 ? ' three' : ''}`}
      aria-label={label}
    >
      {items.map((item) => {
        const hasComparisons = (item.comparisons?.length ?? 0) > 0;
        return (
          <a
            key={item.id}
            className="metric-link"
            href={'#' + href(item.id)}
            aria-current={active === item.id ? 'true' : undefined}
          >
            {hasComparisons && (
              <button
                type="button"
                className="metric-kpi-info"
                aria-label={`Ver comparativa de ${item.label}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setComparisonItem(item);
                }}
              >
                <Info size={16} aria-hidden="true" />
              </button>
            )}
            <span className="metric-label">{item.label}</span>
            <strong>{formatKpiValue(item.value, item.format === 'money')}</strong>
          </a>
        );
      })}
      {comparisonItem && (
        <KpiComparisonModal item={comparisonItem} onClose={() => setComparisonItem(null)} />
      )}
    </nav>
  );
}

export function RemoteModuleKpis({
  path,
  revision = 0,
  active,
  href,
}: {
  path: string;
  revision?: number;
  active?: string;
  href: (id: string, summary: ModuleSummary) => string;
}) {
  const [retry, setRetry] = useState(0);
  const { data, error, loading } = useRemote<ModuleSummary>(path, revision + retry);
  if (error)
    return (
      <div className="list-error">
        <ErrorBox>No se han podido cargar los indicadores. {error}</ErrorBox>
        <button className="button" onClick={() => setRetry((v) => v + 1)}>
          Reintentar indicadores
        </button>
      </div>
    );
  if (loading || !data) return <Loading compact />;
  return <ModuleKpis items={data.items} active={active} href={(id) => href(id, data)} />;
}

export function KpiFilter({
  label,
  onClear,
  persistent = false,
}: {
  label?: string;
  onClear?: () => void;
  persistent?: boolean;
}) {
  if (!label && !(persistent && onClear)) return null;
  return (
    <div className="kpi-filter" role="status">
      {label && <span>{label}</span>}
      {onClear && (
        <button type="button" className="quiet-link" onClick={onClear}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
