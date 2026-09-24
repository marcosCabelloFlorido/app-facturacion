import type { FinancialDocument } from './domain';
import type { KpiComparison } from './kpi-comparisons';

export const dashboardMetrics = {
  revenue: {
    label: 'Facturación del mes',
    amountLabel: 'Base imponible',
    monthly: true,
  },
  quotes: {
    label: 'Presupuestos pendientes',
    amountLabel: 'Total',
    monthly: false,
  },
  expenses: {
    label: 'Gastos del mes',
    amountLabel: 'Base imponible',
    monthly: true,
  },
  payable: {
    label: 'Pendiente de pago',
    amountLabel: 'Pendiente',
    monthly: false,
  },
} as const;
export type DashboardMetric = keyof typeof dashboardMetrics;
export type DashboardSummary = Record<DashboardMetric, string> & {
  as_of: string;
  comparisons?: Partial<Record<DashboardMetric, KpiComparison[]>>;
};
export function isDashboardMetric(value: string | undefined): value is DashboardMetric {
  return !!value && Object.hasOwn(dashboardMetrics, value);
}
export type MetricDetail = {
  rows: (FinancialDocument & { metric_amount: string })[];
  total: string;
  count: number;
  as_of: string;
  page: number;
  pageSize: number;
};
