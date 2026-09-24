import type { DocumentStatusChange, FinancialDocument } from '../shared/domain';
export type InvoicePipelineStep = {
  label: string;
  state: 'past' | 'current' | 'next';
  date?: string;
};
export function invoicePipelineSteps(
  history: DocumentStatusChange[] | undefined,
  status: string,
  kind: FinancialDocument['kind'] = 'invoice',
): InvoicePipelineStep[] {
  const steps: InvoicePipelineStep[] = [...(history ?? [])]
    .reverse()
    .map((event, index, events) => ({
      label: event.to,
      date: event.occurred_at,
      state: index === events.length - 1 ? 'current' : 'past',
    }));
  if (!steps.length) steps.push({ label: status, state: 'current' });
  const current = steps[steps.length - 1].label;
  if (kind === 'quote') {
    if (current === 'Borrador') steps.push({ label: 'Confirmado', state: 'next' });
    if (['Borrador', 'Confirmado'].includes(current))
      steps.push({ label: 'Decisión del cliente', state: 'next' });
    if (current === 'Aceptado') steps.push({ label: 'Convertido en factura', state: 'next' });
    return steps;
  }
  if (kind !== 'invoice') {
    const final = kind === 'purchase' ? 'Pagada' : 'Devuelta';
    if (current === 'Borrador')
      steps.push({
        label:
          kind === 'purchase'
            ? 'Contabilizada · pendiente de pago'
            : 'Emitida · pendiente de devolución',
        state: 'next',
      });
    if (current !== final) steps.push({ label: final, state: 'next' });
    return steps;
  }
  if (current === 'Borrador') steps.push({ label: 'Emitida · pendiente de cobro', state: 'next' });
  if (current !== 'Cobrada') steps.push({ label: 'Cobrada', state: 'next' });
  return steps;
}
