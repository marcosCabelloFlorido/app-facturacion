import { useState } from 'react';
import { api, euros } from './api';
import { ErrorBox, Modal } from './components';
import type { FinancialDocument } from '../shared/domain';

/** Shared confirmation: 16-modal.md, TimeTrackingConfig.tsx:1804–1891. */
export function IssueDocumentForm({
  doc,
  onClose,
  onSaved,
}: {
  doc: FinancialDocument;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function issue() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/documents/' + doc.id + '/issue', {
        method: 'POST',
        body: { version: doc.version },
      });
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={doc.kind === 'quote' ? 'Confirmar presupuesto' : 'Confirmar documento'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="confirmation-summary">
        <strong>{doc.party.name}</strong>
        <span>{euros(doc.total)}</span>
      </div>
      <p className="modal-copy">
        Se asignará un número correlativo y se conservarán los datos del documento.{' '}
        {doc.kind === 'quote'
          ? 'Podrás registrar la aceptación y convertirlo en factura.'
          : doc.kind === 'purchase'
            ? 'La compra quedará contabilizada y podrás registrar su pago.'
            : 'Los cambios posteriores se harán mediante rectificación.'}
      </p>
      <div className="modal-actions">
        <button className="button" disabled={busy} onClick={onClose}>
          Volver a revisar
        </button>
        <button className="button primary" disabled={busy} onClick={() => void issue()}>
          {busy ? 'Confirmando…' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}
