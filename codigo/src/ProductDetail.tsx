import { FileText, Settings2, Trash2 } from 'lucide-react';
import type { Product } from '../shared/domain';
import { euros } from './api';
import { Modal } from './components';
import { DocumentStatusLabel } from './DocumentStatusLabel';
import { ActionsMenu } from './ActionsMenu';
import { RecordNavigation } from './RecordNavigation';
import './document-detail-modal.css';
import './document-folio-sheet.css';

// Ventana modal de detalle de artículo del catálogo: misma cabecera oscura y
// hoja folio que la visualización de facturas, adaptada a los datos del producto.
export function ProductDetailModal({
  product,
  readonly,
  position,
  count,
  previous,
  next,
  loading,
  error,
  onRetry,
  onClose,
  onEdit,
  onDelete,
}: {
  product: Product;
  readonly?: boolean;
  position: number | null;
  count: number;
  previous?: string;
  next?: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal title={product.name} onClose={onClose} className="document-detail-modal">
      <div className="document-detail-toolbar">
        <div className="document-detail-toolbar-top">
          <div className="document-detail-toolbar-group">
            <DocumentStatusLabel status={product.active ? 'Activo' : 'Archivado'} />
            {product.sku && (
              <span
                className="document-heading-number"
                aria-label={'Código de artículo: ' + product.sku}
              >
                {product.sku}
              </span>
            )}
          </div>
          <div className="document-detail-toolbar-group">
            <div className="document-detail-nav">
              <RecordNavigation
                label="Artículo"
                collection="artículos"
                position={position}
                count={count}
                previous={previous}
                next={next}
                loading={loading}
                error={error}
                onRetry={onRetry}
              />
            </div>
            <ActionsMenu
              light
              label={`Acciones de ${product.name}`}
              items={[
                !readonly && {
                  label: 'Editar artículo',
                  group: 'Artículo',
                  icon: Settings2,
                  onAction: onEdit,
                },
                !readonly && {
                  label: 'Eliminar artículo',
                  group: 'Artículo',
                  icon: Trash2,
                  onAction: onDelete,
                },
                !readonly &&
                  product.active && {
                    label: 'Crear factura con este artículo',
                    group: 'Crear documentos',
                    icon: FileText,
                    href: '#new/invoice?product=' + product.id,
                  },
                !readonly &&
                  product.active && {
                    label: 'Crear presupuesto con este artículo',
                    group: 'Crear documentos',
                    icon: FileText,
                    href: '#new/quote?product=' + product.id,
                  },
              ]}
            />
          </div>
        </div>
        <div className="document-detail-toolbar-main">
          <div className="document-detail-issuer">
            <span className="eyebrow">Artículo</span>
            <div className="document-detail-identity-row">
              <strong>{product.name}</strong>
            </div>
            <div className="document-detail-identity-lines">
              <span>{product.unit}</span>
              <span>{product.taxRate} % IVA</span>
            </div>
          </div>
          <div className="document-detail-meta">
            <span className="document-detail-deadline">{euros(product.unitPrice)}</span>
          </div>
        </div>
      </div>
      <div className="document-detail-body">
        <div className="folio-stage">
          <div className="folio-sheet-wrap">
            <article className="folio-sheet" aria-label={'Artículo ' + product.name}>
              <p className="folio-document-meta">
                Artículo {product.sku || 'sin código'} ·{' '}
                {product.active ? 'Activo' : 'Archivado'}
              </p>
              <hr className="folio-rule" />
              <div className="folio-client-row">
                <div className="folio-client">
                  <p className="folio-eyebrow">Artículo</p>
                  <p className="folio-client-name">{product.name}</p>
                  {product.description && (
                    <p className="folio-client-line">{product.description}</p>
                  )}
                </div>
                <div className="folio-grand-total">
                  <p className="folio-eyebrow">Precio sin IVA</p>
                  <p className="folio-grand-total-amount">{euros(product.unitPrice)}</p>
                </div>
              </div>
              <hr className="folio-rule" />
              <dl className="catalog-record-data">
                <div>
                  <dt>Código</dt>
                  <dd>{product.sku || 'Sin código'}</dd>
                </div>
                <div>
                  <dt>Unidad</dt>
                  <dd>{product.unit}</dd>
                </div>
                <div>
                  <dt>IVA</dt>
                  <dd>{product.taxRate} %</dd>
                </div>
                {product.exemptionReason && (
                  <div>
                    <dt>Motivo de exención</dt>
                    <dd>{product.exemptionReason}</dd>
                  </div>
                )}
                <div>
                  <dt>Estado</dt>
                  <dd>{product.active ? 'Activo' : 'Archivado'}</dd>
                </div>
              </dl>
            </article>
          </div>
        </div>
      </div>
    </Modal>
  );
}
