import type { FinancialDocument } from '../shared/domain';

import { DocumentLinesTable } from './DocumentLinesTable';
import { formatUnitPrice } from './unit-price';

const documentNumber = (value: string) =>
  Number(value).toLocaleString('es-ES', { maximumFractionDigits: 4 });
export function DocumentSheetLines({
  lines,
  invoice = false,
}: {
  lines: FinancialDocument['lines'];
  columns?: boolean;
  invoice?: boolean;
}) {
  return (
    <DocumentLinesTable invoice={invoice}>
      {lines.map((line, index) => {
        return (
          <tr key={index}>
            <th scope="row" className="line-concept">
              <span className="line-value">{line.description}</span>
              {Number(line.discount) > 0 && (
                <small className="concept-discount">
                  Descuento: −{documentNumber(line.discount)} %
                </small>
              )}
              {line.exemptionReason && <small>{line.exemptionReason}</small>}
            </th>
            <td className="line-numeric line-quantity">
              <span className="line-value">{documentNumber(line.quantity)}</span>
            </td>
            <td className="line-numeric line-price">
              <span className="line-value">
                {formatUnitPrice(line.unitPrice)}
                {!invoice && ' €'}
              </span>
            </td>
            <td className="line-numeric line-tax">
              <span className="line-value">{documentNumber(line.taxRate)} %</span>
            </td>
          </tr>
        );
      })}
    </DocumentLinesTable>
  );
}
