import { useState } from 'react';
import { Field, Modal } from './components';
import { Select } from './Select';

export function ImportFilters({
  view,
  readonly,
  onClose,
  onApply,
}: {
  view: string;
  readonly: boolean;
  onClose: () => void;
  onApply: (view: string) => void;
}) {
  const [nextView, setNextView] = useState(view);
  return (
    <Modal title="Filtros de importaciones" onClose={onClose} sidePanel>
      <form
        className="side-panel-form"
        onSubmit={(event) => {
          event.preventDefault();
          onApply(readonly ? 'history' : nextView);
        }}
      >
        <div className="side-panel-body">
          <Field label="Vista">
            <Select value={nextView} onChange={(event) => setNextView(event.target.value)}>
              {!readonly && <option value="prepare">Preparar un archivo</option>}
              <option value="history">Historial de importaciones</option>
            </Select>
          </Field>
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
