import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Product } from '../shared/domain';
import { api } from './api';
import { ErrorBox, Modal } from './components';

export function DeleteProduct({
  product,
  onClose,
  onDeleted,
}: {
  product: Product;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <Modal
      title="Eliminar artículo"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          try {
            await api('/products/' + product.id, { method: 'DELETE' });
            onDeleted();
          } catch (cause) {
            setError((cause as Error).message);
            setBusy(false);
          }
        }}
      >
        <p className="modal-copy">
          Se eliminará <strong>{product.name}</strong> ({product.sku}) del catálogo. Los documentos
          existentes conservarán sus conceptos e importes.
        </p>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="modal-actions">
          <button type="submit" className="button primary" disabled={busy}>
            {busy && <LoaderCircle className="spin" size={16} aria-hidden="true" />}
            {busy ? 'Eliminando…' : 'Eliminar artículo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
