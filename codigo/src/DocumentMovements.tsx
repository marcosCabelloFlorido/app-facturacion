import { labels, type FinancialDocument } from '../shared/domain';
import { euros, tableDate } from './api';
import { PanelHeading } from './components';
import { MovementReference } from './MovementReference';

export function DocumentMovements({ doc }: { doc: FinancialDocument }) {
  const payments = doc.payments ?? [];
  const receipt =
    doc.kind === 'invoice' || (doc.kind === 'credit' && doc.credit_side === 'purchase');
  const movementStatus = (reversed: boolean) =>
    doc.kind === 'credit'
      ? reversed
        ? 'Devolución anulada'
        : receipt
          ? 'Devolución recibida'
          : 'Devolución pagada'
      : reversed
        ? receipt
          ? 'Cobro anulado'
          : 'Pago anulado'
        : receipt
          ? 'Cobro recibido'
          : 'Pago realizado';

  return (
    <div className="document-activity">
      {payments.length > 0 && (
        <section aria-label="Movimientos">
          <PanelHeading title="Movimientos" />
          <div className="table-scroll">
            <table className="document-payments-table" aria-label="Movimientos">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Método de pago</th>
                  <th scope="col">Estado</th>
                  <th scope="col" className="numeric">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <time dateTime={payment.date}>{tableDate(payment.date)}</time>
                    </td>
                    <td>
                      {labels[payment.method] || payment.method}
                      <MovementReference value={payment.reference} />
                    </td>
                    <td>{movementStatus(!!payment.reversed_at)}</td>
                    <td className="numeric">{euros(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
