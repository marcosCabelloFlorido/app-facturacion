import { useState } from 'react';
import { ErrorBox, Loading, Modal, useRemote } from './components';
import type { FinancialDocument } from '../shared/domain';
import { PaymentForm } from './documents';
import { IssueDocumentForm } from './IssueDocumentForm';
import { getSalesWorkflowAction, getPurchaseWorkflowAction } from './document-status';

export function DocumentWorkflow({
  id,
  onClose,
  onSaved,
  initialAmount,
}: {
  id: string;
  initialAmount?: string;
  onClose: () => void;
  onSaved: (message?: string) => void;
}) {
  const [retry, setRetry] = useState(0);
  const { data: doc, loading, error } = useRemote<FinancialDocument>('/documents/' + id, retry);
  const action = doc && (getPurchaseWorkflowAction(doc) || getSalesWorkflowAction(doc));
  // Read the current version and balance before acting from a possibly stale list.
  if (loading || error || !doc || !action) {
    return (
      <Modal title="Gestionar documento" onClose={onClose}>
        {loading ? (
          <Loading />
        ) : error ? (
          <>
            <ErrorBox>{error}</ErrorBox>
            <div className="modal-actions">
              <button className="button" onClick={() => setRetry((value) => value + 1)}>
                Reintentar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="modal-copy">
              El estado de este documento ha cambiado. Actualiza el listado.
            </p>
            <div className="modal-actions">
              <button className="button primary" onClick={() => onSaved()}>
                Actualizar listado
              </button>
            </div>
          </>
        )}
      </Modal>
    );
  }
  return action.type === 'issue' ? (
    <IssueDocumentForm
      doc={doc}
      onClose={onClose}
      onSaved={() =>
        onSaved(
          doc.kind === 'purchase' || doc.credit_side === 'purchase'
            ? 'Compra contabilizada.'
            : doc.kind === 'credit'
              ? 'Rectificativa emitida.'
              : 'Factura emitida.',
        )
      }
    />
  ) : (
    <PaymentForm
      salesFlow
      initialAmount={initialAmount}
      doc={doc}
      onClose={onClose}
      onSaved={() =>
        onSaved(
          doc.kind === 'credit'
            ? 'Devolución registrada. Saldo actualizado.'
            : doc.kind === 'purchase'
              ? 'Pago registrado. Saldo actualizado.'
              : 'Cobro registrado. Saldo actualizado.',
        )
      }
    />
  );
}
