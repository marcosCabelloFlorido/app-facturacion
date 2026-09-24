import type { KpiComparison } from './kpi-comparisons';

export type ModuleKpi = {
  id: string;
  label: string;
  value: string;
  format: 'money' | 'count';
  context: string;
  comparisons?: KpiComparison[];
};
export type ModuleSummary = { asOf: string; items: ModuleKpi[] };
