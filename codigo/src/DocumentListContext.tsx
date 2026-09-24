import { X } from 'lucide-react';
import type { DocumentQuery } from '../shared/sales-tools';
import { euros, shortDate } from './api';

// FUENTE: 08-toolbar.md (AbsencesModule.tsx:2910–2911), 05-button.md (variante link)
// y Kronjop × Ley IA, familias «search» y «icon-actions». Contexto sin cajas adicionales.
export function DocumentListContext({
  query,
  count,
  customerName,
  onClear,
}: {
  query: Partial<DocumentQuery>;
  count?: number;
  customerName?: string;
  onClear: () => void;
}) {
  const purchase = query.kind === 'purchase';
  const quote = query.kind === 'quote';
  const criteria: string[] = [];
  const metrics: Record<string, string> = {
    month: purchase ? 'Compras del mes · sin IVA' : 'Facturado este mes · sin IVA',
    pending: purchase ? 'Pendientes de pago' : 'Pendientes de cobro',
    overdue: 'Vencimientos atrasados',
    draft: 'Borradores',
    sent: 'Presupuestos vigentes pendientes de respuesta',
    accepted: 'Aceptados pendientes de facturar',
    expired: 'Caducados pendientes de respuesta',
  };
  const statuses: Record<string, string> = {
    issued: 'Emitidas',
    recorded: 'Contabilizadas',
    draft: 'Borradores',
    unpaid: purchase ? 'Pendientes de pago' : 'Pendientes de cobro',
    paid: purchase ? 'Pagadas' : 'Cobradas',
    overdue: 'Vencidas',
    sent: 'Confirmados',
    expired: 'Caducados',
    accepted: 'Aceptados',
    converted: 'Convertidos',
    rejected: 'Rechazados',
  };
  if (query.metric) criteria.push(metrics[query.metric] || query.metric);
  if (query.metric && query.asOf) criteria.push('A ' + shortDate(query.asOf));
  if (query.status && query.status !== 'all') {
    const status = statuses[query.status] || query.status;
    if (!criteria.includes(status)) criteria.push(status);
  }
  if (query.customer)
    criteria.push((purchase ? 'Proveedor: ' : 'Cliente: ') + (customerName || query.customer));
  if (query.search) criteria.push('Búsqueda: «' + query.search + '»');
  const range = (label: string, from?: string, to?: string) => {
    if (from && to) criteria.push(label + ': ' + shortDate(from) + ' – ' + shortDate(to));
    else if (from) criteria.push(label + ': desde ' + shortDate(from));
    else if (to) criteria.push(label + ': hasta ' + shortDate(to));
  };
  range('Emisión', query.from, query.to);
  range(quote ? 'Validez' : 'Vencimiento', query.dueFrom, query.dueTo);
  if (query.minTotal && query.maxTotal)
    criteria.push('Total: ' + euros(query.minTotal) + ' – ' + euros(query.maxTotal));
  else if (query.minTotal) criteria.push('Total desde ' + euros(query.minTotal));
  else if (query.maxTotal) criteria.push('Total hasta ' + euros(query.maxTotal));
  if (query.sort && query.sort !== 'default')
    criteria.push(
      {
        due_asc: 'Vencimiento más cercano',
        due_desc: 'Vencimiento más lejano',
        date_asc: 'Emisión más antigua',
        total_desc: 'Mayor total primero',
        total_asc: 'Menor total primero',
        balance_desc: 'Mayor pendiente primero',
      }[query.sort],
    );
  if (!criteria.length) return null;
  const noun = quote ? 'presupuesto' : purchase ? 'compra' : 'factura';
  return (
    <div className="list-context" aria-label="Filtros aplicados">
      <span className="list-context-criteria">{criteria.join(' · ')}</span>
      {count !== undefined && (
        <span className="list-context-count">
          · {count} {noun}
          {count === 1 ? '' : 's'}
        </span>
      )}
      <button
        type="button"
        className="quiet-link list-context-clear"
        onClick={onClear}
        aria-label="Quitar filtros y búsqueda"
      >
        <X size={13} aria-hidden="true" /> Quitar
      </button>
    </div>
  );
}
