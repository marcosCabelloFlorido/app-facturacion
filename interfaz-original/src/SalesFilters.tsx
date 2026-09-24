import { useState, type ReactNode } from 'react';
import { useRemote } from './components';
import type { DocumentCustomer, DocumentDateRange } from '../shared/document-list';
import type { AdvancedSalesFilters } from '../shared/sales-tools';
import type { DocumentSort } from '../shared/document-list';
import { ListFilters } from './ListFilters';

export function SalesFilters(props: {
  tools?: ReactNode;
  kind?: 'sales' | 'quote' | 'purchase';
  customer: string;
  advanced: { filters: AdvancedSalesFilters; sort: DocumentSort };
  dateRange: DocumentDateRange;
  status: string;
  metric: string;
  statusOptions: string[][];
  onClose: () => void;
  onApply: (
    status: string,
    metric: string,
    dates: DocumentDateRange,
    customer: string,
    extra: AdvancedSalesFilters,
    sort: DocumentSort,
  ) => void;
}) {
  const [retry, setRetry] = useState(0);
  const { data, loading, error } = useRemote<DocumentCustomer[]>(
    '/document-customers?kind=' + (props.kind || 'sales'),
    retry,
  );
  return (
    <ListFilters
      {...props}
      amountSource={'/document-amount-range?kind=' + (props.kind || 'sales')}
      customer={{
        value: props.customer,
        options: data || [],
        loading,
        error,
        onRetry: () => setRetry((value) => value + 1),
      }}
      title={
        props.kind === 'quote'
          ? 'Filtros de presupuestos'
          : props.kind === 'purchase'
            ? 'Filtros de compras'
            : 'Filtros de facturas'
      }
      quote={props.kind === 'quote'}
      purchase={props.kind === 'purchase'}
    />
  );
}
