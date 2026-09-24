import type { ModuleKpi } from '../shared/module-kpis';
import { formatKpiValue } from './kpi-format';
import { Modal } from './components';
import './kpi-comparison-modal.css';

function trendFrom(percent: string | null | undefined) {
  if (percent == null) return null;
  const n = Number(percent);
  return { positive: n >= 0, label: `${n >= 0 ? '+' : ''}${percent} %` };
}

function TrendPill({ percent }: { percent: string | null | undefined }) {
  const trend = trendFrom(percent);
  if (!trend) return <span className="kpi-trend-pill is-empty">—</span>;
  return (
    <span className={`kpi-trend-pill${trend.positive ? ' is-up' : ' is-down'}`}>
      {trend.label}
    </span>
  );
}

// Modal centrado con la evolución mensual e interanual de un indicador: réplica
// visual (en CSS propio del proyecto) del layout de 3 columnas de una tabla de precios.
export function KpiComparisonModal({ item, onClose }: { item: ModuleKpi; onClose: () => void }) {
  const money = item.format === 'money';
  const month = item.comparisons?.find((c) => c.period === 'month');
  const year = item.comparisons?.find((c) => c.period === 'year');
  return (
    <Modal title={item.label} onClose={onClose} wide className="kpi-comparison-modal">
      <div className="kpi-comparison-columns">
        <div className="kpi-comparison-group">
          <div className="kpi-comparison-column">
            <span className="kpi-comparison-label">Mes anterior</span>
            <strong className="kpi-comparison-value">
              {month ? formatKpiValue(month.value, money) : '—'}
            </strong>
          </div>
          <div className="kpi-comparison-trend">
            <TrendPill percent={month?.percent} />
          </div>
        </div>
        <div className="kpi-comparison-group">
          <div className="kpi-comparison-column is-current">
            <span className="kpi-comparison-label">Mes actual</span>
            <strong className="kpi-comparison-value">{formatKpiValue(item.value, money)}</strong>
          </div>
          <div className="kpi-comparison-trend" />
        </div>
        <div className="kpi-comparison-group">
          <div className="kpi-comparison-column">
            <span className="kpi-comparison-label">Mismo mes año anterior</span>
            <strong className="kpi-comparison-value">
              {year ? formatKpiValue(year.value, money) : '—'}
            </strong>
          </div>
          <div className="kpi-comparison-trend">
            <TrendPill percent={year?.percent} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
