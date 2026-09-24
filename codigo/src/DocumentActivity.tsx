import { type FinancialDocument } from '../shared/domain';
import { PanelHeading } from './components';

export function DocumentActivity({ doc }: { doc: FinancialDocument }) {
  const history = doc.status_history ?? [];
  return (
    <div className="document-activity document-status-history">
      {history.length > 0 && (
        <section aria-label="Cambios de estado">
          <PanelHeading title="Cambios de estado" />
          <div className="table-scroll">
            <table className="document-section-table" aria-label="Cambios de estado del documento">
              <thead>
                <tr>
                  <th scope="col">Estado anterior</th>
                  <th scope="col">Estado actual</th>
                  <th scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {history.map((event, index) => (
                  <tr key={event.occurred_at + ':' + index}>
                    <td>{event.from ?? '—'}</td>
                    <td>{event.to}</td>
                    <td>
                      <time dateTime={event.occurred_at}>
                        {new Date(event.occurred_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </td>
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
