import type { ReactNode } from 'react';
import type { Company, DocumentInput } from '../shared/domain';
import './document-sheet.css';

const documentDate = (value: string) => value.split('-').reverse().join('/');

function PartyDetails({ party }: { party: DocumentInput['party'] }) {
  return (
    <div className="document-sheet-address">
      {party.taxId && <p>{party.taxId}</p>}
      {party.address && <p>{party.address}</p>}
      {party.email && <p>{party.email}</p>}
    </div>
  );
}

// Shared "Lectura guiada" layout. FUENTE: 07-table.md (TeamModule.tsx:1968-2000),
// adapted in SISTEMA_VISUAL.md. The editor places its fields inside this same sheet.
export function DocumentSheetLayout({
  label,
  heading,
  overview = false,
  readOnlyDocument = false,
  invoice = false,
  issuer,
  recipient,
  recipientLabel = 'Cliente',
  date,
  showIssueDate = false,
  dueDate,
  quote = false,
  operationDate,
  reference,
  referenceLabel = 'Referencia',
  issuerLabel,
  issuerAction,
  issuerEditor,
  dateEditor,
  dateAction,
  referenceEditor,
  recipientAction,
  dueDateAction,
  recipientEditor,
  dueDateEditor,
  dateFields,
  children,
}: {
  label: string;
  heading?: ReactNode;
  overview?: boolean;
  readOnlyDocument?: boolean;
  invoice?: boolean;
  issuer: Company | DocumentInput['party'];
  recipient: Company | DocumentInput['party'];
  recipientLabel?: string;
  date: string;
  showIssueDate?: boolean;
  dueDate: string;
  quote?: boolean;
  operationDate?: string | null;
  reference?: string;
  referenceLabel?: string;
  issuerLabel?: string;
  issuerAction?: ReactNode;
  issuerEditor?: ReactNode;
  dateEditor?: ReactNode;
  dateAction?: ReactNode;
  referenceEditor?: ReactNode;
  recipientAction?: ReactNode;
  dueDateAction?: ReactNode;
  recipientEditor?: ReactNode;
  dueDateEditor?: ReactNode;
  dateFields?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={
        (readOnlyDocument
          ? 'document-sheet-stage document-readonly-view'
          : 'document-sheet-stage') + (invoice ? ' document-sheet-invoice' : '')
      }
    >
      <article
        className={`document-sheet${overview ? ' document-sheet-overview' : ''}`}
        aria-label={label}
      >
        {heading}
        <header className="document-sheet-header">
          <div className="document-sheet-issuer">
            {issuerLabel && !issuerEditor && (
              <div className="document-sheet-caption">
                <p className="document-sheet-label">{issuerLabel}</p>
                {issuerAction}
              </div>
            )}
            {issuerEditor ?? (
              <>
                <h2>{issuer.name}</h2>
                <PartyDetails party={issuer} />
              </>
            )}
          </div>
        </header>
        <div className="document-sheet-parties">
          <section className="document-sheet-recipient" aria-label={recipientLabel}>
            {!recipientEditor && (
              <div className="document-sheet-caption">
                <p className="document-sheet-label">{recipientLabel}</p>
                {recipientAction}
              </div>
            )}
            {recipientEditor ?? (
              <>
                <h3>{recipient.name}</h3>
                <PartyDetails party={recipient} />
              </>
            )}
          </section>
          <div className="document-sheet-meta">
            {dateFields ?? (
              <dl className="document-sheet-dates">
                {showIssueDate && (
                  <div>
                    <dt className="document-sheet-caption">
                      <span>Emisión</span>
                      {!overview && dateAction}
                    </dt>
                    <dd>
                      {dateEditor ?? <time dateTime={date}>{documentDate(date)}</time>}
                      {overview && dateAction}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="document-sheet-caption">
                    <span>{quote ? 'Válido hasta' : 'Vencimiento'}</span>
                    {!overview && dueDateAction}
                  </dt>
                  <dd>
                    {dueDateEditor ?? <time dateTime={dueDate}>{documentDate(dueDate)}</time>}
                    {overview && dueDateAction}
                  </dd>
                </div>
              </dl>
            )}
            {(operationDate || reference || referenceEditor) && (
              <dl className="document-sheet-references">
                {operationDate && (
                  <div>
                    <dt>Operación</dt>
                    <dd>
                      <time dateTime={operationDate}>{documentDate(operationDate)}</time>
                    </dd>
                  </div>
                )}
                {(reference || referenceEditor) && (
                  <div>
                    <dt>{referenceLabel}</dt>
                    <dd>{referenceEditor ?? reference}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
        {children}
      </article>
    </div>
  );
}
