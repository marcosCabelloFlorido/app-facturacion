import type { Company, FinancialDocument } from '../shared/domain';
import { labels } from '../shared/domain';
import { euros, shortDate, plusDays } from './api';
import { invoicePaymentTerms } from './invoice-editor-date';
import { InvoiceLink, OriginalInvoiceReference } from './InvoiceReference';
import { DocumentTotals } from './editor';
import { DocumentSheetLayout } from './DocumentSheetLayout';
import { DocumentSheetLines } from './DocumentSheetLines';
import { documentTaxBreakdown } from '../shared/document-tax-breakdown';

// FUENTE: docs/design-kit/components/07-table.md (TeamModule.tsx:1968–2000).
// «Lectura guiada» con variante en columnas para todos los resúmenes internos.
// Ambas presentaciones conservan el desglose y un único total destacado.
export function DocumentSheet({
  doc,
  company,
  overview = false,
  showIssueDate = false,
}: {
  doc: FinancialDocument;
  company: Company;
  overview?: boolean;
  showIssueDate?: boolean;
}) {
  const ownCompany = doc.company_snapshot || company;
  const purchase = doc.kind === 'purchase' || doc.credit_side === 'purchase';
  const issuer = purchase ? doc.party : ownCompany;
  const recipient = purchase ? ownCompany : doc.party;
  const title = doc.kind === 'credit' && purchase ? labels.purchase_credit : labels[doc.kind];
  const showOperation = doc.operation_date && doc.operation_date !== doc.date;
  const showReference =
    (purchase || doc.kind === 'credit') &&
    doc.reference &&
    (purchase || doc.reference !== doc.number);
  const readOnlyDocument = overview;
  const paymentTermsBesideClient = overview && doc.kind === 'invoice';
  const taxBreakdown = documentTaxBreakdown(doc.lines);
  const paymentDays = invoicePaymentTerms.find((days) => doc.due_date === plusDays(doc.date, days));

  return (
    <DocumentSheetLayout
      label={title + ' ' + (doc.number || 'en borrador')}
      readOnlyDocument={readOnlyDocument}
      invoice={overview}
      heading={
        readOnlyDocument ? (
          <div className="composer-paper-heading">
            <div>
              <h2>{title}</h2>
              <span className="composer-draft">{doc.number || 'Borrador'}</span>
            </div>
            <div className="composer-heading-dates">
              {showIssueDate && (
                <div className="composer-issue-date">
                  <span>Emisión</span>
                  <time dateTime={doc.date}>{shortDate(doc.date)}</time>
                </div>
              )}
              <div className="composer-issue-date">
                <span>{doc.kind === 'quote' ? 'Válido hasta' : 'Vencimiento'}</span>
                <time dateTime={doc.due_date}>{shortDate(doc.due_date)}</time>
              </div>
              <div className="composer-issue-date">
                <span>{doc.kind === 'quote' ? 'Plazo de validez' : 'Plazo de pago'}</span>
                <span className="invoice-readonly-term">
                  {paymentDays === undefined
                    ? 'Personalizado'
                    : paymentDays === 0
                      ? 'Al contado'
                      : paymentDays + ' días'}
                </span>
              </div>
            </div>
          </div>
        ) : undefined
      }
      dateFields={readOnlyDocument ? false : undefined}
      overview={overview}
      issuer={issuer}
      issuerLabel={overview ? (purchase ? 'Proveedor' : 'Emisor') : undefined}
      recipient={recipient}
      recipientLabel={overview && purchase ? 'Tu empresa' : 'Cliente'}
      date={doc.date}
      showIssueDate={showIssueDate}
      dueDate={doc.due_date}
      quote={doc.kind === 'quote'}
      operationDate={showOperation ? doc.operation_date : undefined}
      reference={showReference ? doc.reference : undefined}
      referenceEditor={
        showReference ? (
          doc.kind === 'credit' && doc.original_id ? (
            <InvoiceLink id={doc.original_id}>{doc.reference}</InvoiceLink>
          ) : purchase && doc.kind !== 'credit' ? (
            <OriginalInvoiceReference id={doc.id} reference={doc.reference} />
          ) : undefined
        ) : undefined
      }
      referenceLabel={
        doc.kind === 'credit' ? 'Rectifica a' : purchase ? 'Factura del proveedor' : 'Referencia'
      }
    >
      <div className={overview ? 'invoice-sheet-fields' : 'document-sheet-unwrapped'}>
        <DocumentSheetLines lines={doc.lines} columns={readOnlyDocument} invoice={overview} />
      </div>
      <div className={overview ? 'composer-sheet-footer' : 'document-sheet-unwrapped'}>
        <div className="document-sheet-totals">
          {doc.kind === 'credit' && (
            <p className="document-sheet-credit">Efecto económico: −{euros(doc.total)}</p>
          )}
          <DocumentTotals
            totals={doc}
            taxBreakdown={taxBreakdown}
            retentionRate={doc.retention_rate}
          />
        </div>
      </div>
    </DocumentSheetLayout>
  );
}
