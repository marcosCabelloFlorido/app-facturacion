import { euros } from './api';
import { paymentProjection } from '../shared/sales-usability';

export function SalesPaymentPreview({ balance, amount }: { balance: string; amount: string }) {
  const result = paymentProjection(balance, amount);
  return (
    <dl className="sales-payment-preview" aria-live="polite" aria-label="Resultado del movimiento">
      <div>
        <dt>Pendiente</dt>
        <dd>{euros(balance)}</dd>
      </div>
      <div>
        <dt>Registras</dt>
        <dd>{result.remaining === null ? '—' : euros(amount.replace(',', '.'))}</dd>
      </div>
      <div>
        <dt>Quedarán</dt>
        <dd>{result.remaining === null ? '—' : euros(result.remaining)}</dd>
      </div>
    </dl>
  );
}
