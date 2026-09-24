import { useState } from 'react';
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { ArrowRight, ListTree, X } from 'lucide-react';
import type { ContactActivity, ContactActivityView } from '../shared/contacts';
import { labels } from '../shared/domain';
import { ChapterScrubber, type Chapter } from './ChapterScrubber';
import { ContactPagination } from './ContactPicker';
import { DocumentStatusLabel } from './DocumentStatusLabel';
import { getDocumentStatus } from './document-status';
import { contactDocumentTitle } from './contact-activity';
import { euros, navigate } from './api';
import { Loading } from './components';

export function ContactHistoryExplorer({
  data,
  view,
  route,
  loading,
  error,
  onPage,
  onRetry,
  initialId,
}: {
  data: ContactActivity;
  view: ContactActivityView;
  route: string;
  loading: boolean;
  error: string;
  onPage: (page: number) => void;
  onRetry: () => void;
  initialId?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = (value: string) =>
    new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  const returnRoute = (entry: string) => {
    const params = new URLSearchParams(route.split('?')[1]);
    params.set('activityEntry', entry);
    return 'contacts?' + params.toString();
  };
  const hrefs = new Map<string, string>();
  const documentLink = (id: string, entry: string, payment = false) => {
    hrefs.set(
      entry,
      '#document/' +
        id +
        '?from=' +
        encodeURIComponent(returnRoute(entry)) +
        (payment ? '&entry=' + encodeURIComponent(entry) : ''),
    );
  };
  let chapters: Chapter[];
  if (view === 'payments')
    chapters = data.payments.map((payment) => {
      const receipt =
        payment.kind === 'invoice' ||
        (payment.kind === 'credit' && payment.credit_side === 'purchase');
      documentLink(payment.document_id, payment.id, true);
      return {
        id: payment.id,
        title: payment.number || 'Movimiento',
        meta: date(payment.date),
        description: (
          <>
            <DocumentStatusLabel
              status={payment.reversed_at ? 'Revertido' : receipt ? 'Cobro' : 'Pago'}
            />
            <p className="chapter-amount">
              {receipt ? '+' : '−'}
              {euros(payment.amount)}
            </p>
            <p className="chapter-detail">
              {labels[payment.method]}
              {payment.reference ? ' · ' + payment.reference : ''}
            </p>
          </>
        ),
      };
    });
  else if (view === 'funds')
    chapters = data.funds.map((fund) => ({
      id: fund.id,
      title: fund.direction === 'receipt' ? 'Anticipo recibido' : 'Anticipo entregado',
      meta: date(fund.date),
      description: (
        <>
          <p className="chapter-amount">{euros(fund.amount)}</p>
          <p className="chapter-detail">Disponible: {euros(fund.available)}</p>
          {fund.reference && <p className="chapter-detail">{fund.reference}</p>}
        </>
      ),
    }));
  else
    chapters = data.documents.map((doc) => {
      documentLink(doc.id, doc.id);
      return {
        id: doc.id,
        title: contactDocumentTitle(doc),
        meta: date(doc.date),
        description: (
          <>
            <p className="chapter-detail">
              {doc.kind === 'credit' && doc.credit_side === 'purchase'
                ? labels.purchase_credit
                : labels[doc.kind]}
            </p>
            <DocumentStatusLabel status={getDocumentStatus(doc).text} />
            <p className="chapter-amount">{euros(doc.total)}</p>
          </>
        ),
      };
    });
  const locate = (chapter: Chapter) => {
    setOpen(false);
    const href = hrefs.get(chapter.id);
    if (href) navigate(href.slice(1));
    else
      requestAnimationFrame(() => {
        const row = document.getElementById('contact-activity-' + chapter.id);
        row?.scrollIntoView({ block: 'center', behavior: 'instant' });
        row?.focus({ preventScroll: true });
      });
  };
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button className="contact-history-trigger">
        <ListTree size={16} aria-hidden="true" />
        <span>Explorar historial</span>
      </Button>
      <Popover className="contact-history-popover" placement="bottom end" offset={8}>
        <Dialog aria-label="Explorar historial" className="contact-history-dialog">
          <div className="contact-history-heading">
            <h2>Explorar historial</h2>
            <Button
              className="icon-button"
              aria-label="Cerrar historial"
              onPress={() => setOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>
          {loading ? (
            <Loading compact />
          ) : error ? (
            <div role="alert">
              <p>No se pudo cargar el historial.</p>
              <button className="button" onClick={onRetry}>
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <p className="contact-history-range">
                {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.count)} de {data.count}
              </p>
              <ChapterScrubber
                key={route + ':' + chapters.map((chapter) => chapter.id).join(',')}
                chapters={chapters}
                initialId={initialId}
                onSelect={locate}
                renderAction={(chapter) =>
                  hrefs.has(chapter.id) ? (
                    <a
                      className="chapter-open"
                      href={hrefs.get(chapter.id)}
                      onClick={() => setOpen(false)}
                    >
                      Abrir documento <ArrowRight size={15} aria-hidden="true" />
                    </a>
                  ) : (
                    <button type="button" className="chapter-open" onClick={() => locate(chapter)}>
                      Ver en actividad <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )
                }
              />
            </>
          )}
          <ContactPagination data={data} onPage={onPage} disabled={loading} iconControls />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
