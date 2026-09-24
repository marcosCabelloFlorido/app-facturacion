import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Company, FinancialDocument } from '../shared/domain';
import { labels } from '../shared/domain';
import { euros, shortDate } from './api';
import { DocumentSheetLines } from './DocumentSheetLines';
import { DocumentTotals } from './editor';
import { documentTaxBreakdown } from '../shared/document-tax-breakdown';
import './document-folio-sheet.css';

// Hoja de factura en formato folio (A4 vertical) para la pestaña "Resumen" del modal.
// Los datos del emisor viven en la cabecera del modal; aquí solo va el cliente.
export function DocumentFolioSheet({
  doc,
  company,
}: {
  doc: FinancialDocument;
  company: Company;
}) {
  const ownCompany = doc.company_snapshot || company;
  const purchase = doc.kind === 'purchase' || doc.credit_side === 'purchase';
  const client = purchase ? ownCompany : doc.party;
  const title = doc.kind === 'credit' && purchase ? labels.purchase_credit : labels[doc.kind];
  const taxBreakdown = documentTaxBreakdown(doc.lines);

  const sheetRef = useRef<HTMLElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const update = () => {
      const scrollable = el.scrollHeight - el.clientHeight > 4;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
      setShowScrollHint(scrollable && !atBottom);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
  }, [doc]);

  return (
    <>
    <article
      className="folio-sheet"
      ref={sheetRef}
      aria-label={title + ' ' + (doc.number || 'en borrador')}
    >
      <p className="folio-document-meta">
        {title} {doc.number || 'Borrador'} · Emisión {shortDate(doc.date)} ·{' '}
        {doc.kind === 'quote' ? 'Válido hasta' : 'Vencimiento'} {shortDate(doc.due_date)}
      </p>
      <hr className="folio-rule" />
      <div className="folio-client-row">
        <div className="folio-client">
          <p className="folio-eyebrow">Cliente</p>
          <p className="folio-client-name">{client.name || 'Sin nombre'}</p>
          {client.address && <p className="folio-client-line">{client.address}</p>}
          {client.email && <p className="folio-client-line">{client.email}</p>}
          {client.taxId && <p className="folio-client-line">{client.taxId}</p>}
        </div>
        <div className="folio-grand-total">
          <p className="folio-eyebrow">Total</p>
          <p className="folio-grand-total-amount">{euros(doc.total)}</p>
        </div>
      </div>
      <hr className="folio-rule" />
      <div className="folio-lines">
        <DocumentSheetLines lines={doc.lines} invoice />
      </div>
      <hr className="folio-rule" />
      <div className="folio-footer">
        <div className="folio-payment-info">
          <p className="folio-payment-heading">Información y detalles de pago</p>
          <p className="folio-payment-line">{ownCompany.paymentTerms}</p>
          {ownCompany.iban && <p className="folio-payment-line">{ownCompany.iban}</p>}
        </div>
        <div className="folio-totals">
          <DocumentTotals totals={doc} taxBreakdown={taxBreakdown} retentionRate={doc.retention_rate} />
        </div>
      </div>
    </article>
    <span className={`folio-scroll-hint${showScrollHint ? ' is-visible' : ''}`} aria-hidden="true">
      <ChevronDown size={18} />
    </span>
    </>
  );
}
