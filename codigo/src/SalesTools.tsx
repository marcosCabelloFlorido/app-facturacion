import { euros } from './api';
import type { DocumentList } from '../shared/document-list';

export function SalesTools({
  quote = false,
  purchase = false,
  result,
}: {
  quote?: boolean;
  purchase?: boolean;
  result?: DocumentList;
}) {
  return (
    <div className="filter-list-tools">
      {result?.summary ? (
        <details className="optional-details">
          <summary>Resumen del filtro aplicado</summary>
          <div className="sales-filter-extra">
            <dl className="sales-summary-values">
              <div>
                <dt>Documentos</dt>
                <dd>{result.count}</dd>
              </div>
              <div>
                <dt>Importe total</dt>
                <dd>{euros(result.summary.total)}</dd>
              </div>
              {!quote && (
                <>
                  <div>
                    <dt>{purchase ? 'Pendiente de pago' : 'Pendiente de cobro'}</dt>
                    <dd>
                      {euros(purchase ? result.summary.payable || '0' : result.summary.receivable)}
                    </dd>
                  </div>
                  <div>
                    <dt>{purchase ? 'Abonos por recibir' : 'Pendiente de devolver'}</dt>
                    <dd>
                      {euros(
                        purchase ? result.summary.purchaseRefunds || '0' : result.summary.refunds,
                      )}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt>Borradores incluidos</dt>
                <dd>{result.summary.drafts}</dd>
              </div>
            </dl>
            {quote ? (
              <p>Incluye todas las páginas y los borradores del filtro.</p>
            ) : (
              <p>
                Incluye todas las páginas. Las rectificativas restan del importe total; los
                borradores no se incluyen en los pendientes.
              </p>
            )}
            {!!result.summary.unknown && (
              <p>{result.summary.unknown} borradores sin importe calculable.</p>
            )}
          </div>
        </details>
      ) : (
        <button className="quiet-link" type="button" disabled>
          Resumen del filtro aplicado
        </button>
      )}
    </div>
  );
}
