import type { ReactNode } from 'react';

export function DocumentLinesTable({
  children,
  editable = false,
  invoice = false,
  discount = false,
  discountNote = false,
}: {
  children: ReactNode;
  editable?: boolean;
  invoice?: boolean;
  discount?: boolean;
  discountNote?: boolean;
}) {
  return (
    <div
      className="document-lines-scroll"
      role="region"
      aria-label="Productos y servicios"
      tabIndex={0}
    >
      <table
        className={`document-lines-table${invoice ? ' document-lines-invoice' : ''}${editable ? ' document-lines-editable' : ''}`}
      >
        <caption className="sr-only">Conceptos del documento</caption>
        <thead>
          <tr>
            <th scope="col">Producto o servicio</th>
            <th scope="col" className="line-numeric line-quantity">
              Cantidad
            </th>
            <th scope="col" className="line-numeric line-price">
              Precio unitario
            </th>
            {discount && (
              <th scope="col" className="line-numeric">
                Descuento
              </th>
            )}
            <th scope="col" className="line-numeric line-tax">
              IVA
            </th>
            {editable && (
              <th scope="col" className="line-actions">
                {editable && <span className="sr-only">Acciones</span>}
              </th>
            )}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
