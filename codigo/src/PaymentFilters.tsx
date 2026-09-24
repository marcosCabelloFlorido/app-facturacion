import { literalSearch } from '../shared/advanced-search';
import { useState } from 'react';
import { Field, Modal } from './components';
import { Select } from './Select';
import { navigate } from './api';
import { parseDueSort, paymentReturnRoute } from '../shared/due-dates';

// FUENTE: 15-side-panel-filters.md, reutiliza la estructura aprobada de ListFilters.
export function PaymentFilters({
  tab,
  status,
  direction,
  search,
  onClose,
}: {
  tab: string;
  status: string;
  direction: string;
  search: string;
  onClose: () => void;
}) {
  const [view, setView] = useState(tab);
  const from = paymentReturnRoute(new URLSearchParams(location.hash.split('?')[1]).get('from'));
  const sort = parseDueSort(new URLSearchParams(location.hash.split('?')[1]).get('sort'));
  const [nextStatus, setStatus] = useState(status);
  const [nextDirection, setDirection] = useState(direction);
  return (
    <Modal title="Filtros de cobros y pagos" onClose={onClose} sidePanel>
      <form
        className="side-panel-form"
        onSubmit={(event) => {
          event.preventDefault();
          const params = new URLSearchParams({
            tab: view,
            ...(from ? { from } : {}),
            ...(view === 'pending' && sort !== 'default' ? { sort } : {}),
            ...(literalSearch(search) ? { search: literalSearch(search) } : {}),
            ...(view === 'pending' ? { status: nextStatus, direction: nextDirection } : {}),
          });
          onClose();
          navigate('payments?' + params);
        }}
      >
        <div className="side-panel-body">
          <button
            type="button"
            className="quiet-link"
            onClick={() => {
              setStatus('all');
              setDirection('all');
            }}
          >
            Limpiar filtros
          </button>
          <Field label="Vista">
            <Select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="pending">Vencimientos pendientes</option>
              <option value="history">Movimientos registrados</option>
              <option value="funds">Anticipos y fondos</option>
            </Select>
          </Field>
          {view === 'pending' && (
            <>
              <Field label="Estado">
                <Select value={nextDirection} onChange={(e) => setDirection(e.target.value)}>
                  <option value="all">Cobros y pagos</option>
                  <option value="receivable">Por cobrar</option>
                  <option value="payable">Por pagar</option>
                </Select>
              </Field>
              <Field label="Vencimiento">
                <Select value={nextStatus} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">Todos los pendientes</option>
                  <option value="overdue">Atrasados</option>
                  <option value="upcoming">Hoy y próximos</option>
                </Select>
              </Field>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button type="submit" className="button primary">
            Aplicar filtros
          </button>
        </div>
      </form>
    </Modal>
  );
}
