import { documentDeadlineLabel } from './document-deadline';
import { PaymentCreation } from './PaymentCreation';
import { DocumentDeliveryModal } from './Communications';
import { ContactDocumentNavigation } from './ContactDocumentNavigation';
import { documentNavigationSource } from './record-navigation';
import { SalesDocumentNavigation } from './SalesDocumentNavigation';
import { PaymentRecordNavigation } from './PaymentRecordNavigation';
import { DocumentActivity } from './DocumentActivity';
import { DocumentMovements } from './DocumentMovements';
import { Select } from './Select';
import { IssueDocumentForm } from './IssueDocumentForm';
import { useState } from 'react';
import {
  ArrowRight,
  Check,
  Download,
  Eye,
  FilePlus,
  FileText,
  Mail,
  Send,
  Trash2,
  Undo2,
  Wallet,
  X,
} from 'lucide-react';
import { api, downloadUrl, euros, navigate, today } from './api';
import {
  Badge,
  ErrorBox,
  Field,
  Loading,
  Modal,
  PageHeading,
  Submit,
  useRemote,
  type Notify,
} from './components';
import { labels, type Company, type FinancialDocument } from '../shared/domain';
export { DocumentEditor } from './editor';
import { DocumentPreview } from './DocumentPreview';
import { DocumentSheet } from './DocumentSheet';
import { CreditForm, DocumentSchedule } from './FinancePanels';
import { DocumentFiles } from './Files';
import { SectionNavigation } from './SectionNavigation';
import { DocumentRequirements } from './BuyerRequirements';
import { documentReturnRoute } from '../shared/due-dates';
import { contactDetailHref } from './contact-route';
import {
  getSalesWorkflowAction,
  getPurchaseWorkflowAction,
  getDocumentStatus,
} from './document-status';
const normal = (s: string) => s.replace(',', '.');
type Props = { notify: Notify; readonly: boolean };
export function PaymentForm({
  doc,
  onClose,
  onSaved,
  salesFlow = false,
  initialAmount,
  duePosition,
}: {
  doc: FinancialDocument;
  salesFlow?: boolean;
  initialAmount?: string;
  duePosition?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (duePosition !== undefined)
    return <DuePaymentForm doc={doc} position={duePosition} onClose={onClose} onSaved={onSaved} />;
  return (
    <PaymentCreation
      initialDocument={doc}
      initialAmount={initialAmount}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
function DuePaymentForm({
  doc,
  position,
  onClose,
  onSaved,
}: {
  doc: FinancialDocument;
  position: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [retry, setRetry] = useState(0);
  const { data, error, loading } = useRemote<{ rows: { position: number; balance: string }[] }>(
    '/documents/' + doc.id + '/schedule',
    retry,
  );
  const due = data?.rows.find((row) => row.position === position);
  if (loading || error || !due || Number(due.balance) <= 0)
    return (
      <Modal title="Registrar movimiento" onClose={onClose}>
        {loading ? (
          <Loading />
        ) : error ? (
          <>
            <ErrorBox>{error}</ErrorBox>
            <button type="button" className="button" onClick={() => setRetry((v) => v + 1)}>
              Reintentar
            </button>
          </>
        ) : (
          <p>Este vencimiento ya no está pendiente. Actualiza el listado.</p>
        )}
      </Modal>
    );
  return (
    <PaymentCreation
      initialDocument={doc}
      initialAmount={due.balance}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

export function ReversePayment({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Revertir movimiento"
      description="Se conservará el registro original y se generará un asiento de reversión."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api('/payments/' + id + '/reverse', { method: 'POST', body: { date, reason } });
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <ErrorBox>{error}</ErrorBox>}
        <Field label="Fecha de reversión">
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Motivo">
          <textarea
            required
            minLength={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica por qué se revierte el movimiento"
          />
        </Field>
        <div className="modal-actions">
          <Submit busy={busy}>Confirmar reversión</Submit>
        </div>
      </form>
    </Modal>
  );
}
export function DocumentDetail({
  id,
  company,
  notify,
  readonly,
}: Props & { id: string; company: Company }) {
  const [view, setViewState] = useState(() => {
    const requested = new URLSearchParams(location.hash.split('?')[1]).get('view');
    return requested &&
      ['summary', 'schedule', 'files', 'movements', 'activity'].includes(requested)
      ? requested
      : 'summary';
  });
  const setView = (next: string) => {
    const params = new URLSearchParams(location.hash.split('?')[1]);
    params.set('view', next);
    history.replaceState(history.state, '', '#document/' + id + '?' + params);
    setViewState(next);
  };
  const [revision, setRevision] = useState(0);
  const { data: doc, error, loading } = useRemote<FinancialDocument>('/documents/' + id, revision);
  const [modal, setModalState] = useState(() => {
    const requested = new URLSearchParams(location.hash.split('?')[1]).get('delivery');
    return requested === 'mail' ? requested : '';
  });
  const setModal = (next: string) => {
    const params = new URLSearchParams(location.hash.split('?')[1]);
    params.delete('delivery');
    if (params.get('view') === 'delivery') params.set('view', 'summary');
    if (next === 'mail') params.set('delivery', next);
    history.replaceState(history.state, '', '#document/' + id + (params.size ? '?' + params : ''));
    setModalState(next);
  };
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const refresh = () => {
    setModal('');
    setRevision((v) => v + 1);
  };
  async function action(path: string, body: unknown, message: string, destination?: 'returned') {
    setBusy(true);
    setActionError('');
    try {
      const r = await api<FinancialDocument>(`/documents/${id}/${path}`, { method: 'POST', body });
      notify(
        message,
        destination ? { label: 'Abrir borrador', to: 'document/' + r.id } : undefined,
      );
      if (destination)
        navigate('document/' + r.id + '?from=' + encodeURIComponent(location.hash.slice(1)));
      else refresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !doc) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!doc) return null;
  const invoice = doc.kind === 'invoice';
  const purchase = doc.kind === 'purchase' || doc.credit_side === 'purchase';
  const commercial = invoice || doc.kind === 'quote' || purchase;
  const contactHref = commercial
    ? contactDetailHref(doc.party.taxId, location.hash.slice(1))
    : undefined;
  const confirmed = doc.status !== 'draft';
  const paymentAction = getPurchaseWorkflowAction(doc) || getSalesWorkflowAction(doc);
  const draftInvoice = commercial && !confirmed && doc.kind !== 'credit';
  const section =
    doc.kind === 'quote'
      ? 'quotes'
      : doc.kind === 'purchase' || doc.credit_side === 'purchase'
        ? 'purchases'
        : 'sales';
  const from = new URLSearchParams(location.hash.split('?')[1]).get('from');
  const back = documentReturnRoute(from, section);
  const entry = new URLSearchParams(location.hash.split('?')[1]).get('entry');
  const selectedPayment =
    from?.startsWith('payments') && new URLSearchParams(from.split('?')[1]).get('tab') === 'history'
      ? doc.payments?.find((payment) => payment.id === entry)
      : undefined;
  const duePosition =
    from?.startsWith('payments') &&
    new URLSearchParams(from.split('?')[1]).get('tab') !== 'history' &&
    entry?.startsWith(doc.id + ':') &&
    /^\d+$/.test(entry.slice(doc.id.length + 1))
      ? Number(entry.slice(doc.id.length + 1))
      : undefined;
  const recordNavigation = from?.startsWith('payments') ? (
    <PaymentRecordNavigation
      key={id + from + revision}
      id={id}
      from={from}
      view={view}
      entry={new URLSearchParams(location.hash.split('?')[1]).get('entry')}
    />
  ) : from?.startsWith('contacts?') && new URLSearchParams(from.split('?')[1]).has('contact') ? (
    <ContactDocumentNavigation
      key={id + from + revision}
      id={id}
      from={from}
      view={view}
      entry={new URLSearchParams(location.hash.split('?')[1]).get('entry')}
    />
  ) : (
    <SalesDocumentNavigation
      key={id + (from || '') + revision}
      id={id}
      from={documentNavigationSource(section, from)}
      returnTo={from || undefined}
      view={view}
      section={section}
    />
  );
  return (
    <>
      <PageHeading
        variant="document"
        eyebrow={labels[doc.kind].toUpperCase()}
        backLink={{
          href: '#' + back,
          label: 'Atrás',
        }}
        title={
          (commercial && doc.party.name.trim()) ||
          doc.number ||
          (doc.kind === 'quote'
            ? 'Presupuesto en borrador'
            : doc.kind === 'purchase'
              ? 'Compra en borrador'
              : doc.kind === 'credit'
                ? 'Rectificativa en borrador'
                : 'Factura en borrador')
        }
        titleLink={
          contactHref && doc.party.name.trim()
            ? { href: contactHref, label: 'Ver ficha de ' + doc.party.name }
            : undefined
        }
        metadata={
          <span className="document-heading-context">
            <span className="document-heading-dates">
              {doc.number && (
                <span
                  className="document-heading-number"
                  aria-label={'Número de documento: ' + doc.number}
                >
                  {doc.number}
                </span>
              )}
            </span>
            <Badge doc={doc} />
          </span>
        }
        tools={null}
        status={
          doc.kind === 'invoice' && getDocumentStatus(doc).settled ? null : (
            <span className="document-deadline-block">
              {doc.due_date && !(doc.kind === 'invoice' && getDocumentStatus(doc).settled) && (
                <span className="document-deadline-date">
                  {doc.kind === 'quote' ? 'Válido hasta' : 'Vencimiento'} ·{' '}
                  <time dateTime={doc.due_date}>
                    {doc.due_date.slice(0, 10).split('-').reverse().join('/')}
                  </time>
                </span>
              )}
              <span
                className="document-deadline"
                aria-label={'Plazo: ' + documentDeadlineLabel(doc, today())}
              >
                {documentDeadlineLabel(doc, today())}
              </span>
            </span>
          )
        }
        menu={[
          !readonly &&
            selectedPayment &&
            !selectedPayment.reversed_at && {
              label: 'Revertir movimiento',
              group: 'Cobros y pagos',
              icon: Undo2,
              onAction: () => setModal('reverse'),
            },
          !readonly &&
            paymentAction?.type === 'payment' &&
            doc.kind !== 'credit' && {
              label: paymentAction.label,
              group: 'Cobros y pagos',
              icon: Wallet,
              disabled: busy,
              onAction: () => setModal('payment'),
            },
          !readonly &&
            !confirmed && {
              label:
                doc.kind === 'quote'
                  ? 'Confirmar presupuesto'
                  : doc.kind === 'purchase'
                    ? 'Contabilizar compra'
                    : doc.kind === 'credit'
                      ? 'Emitir rectificativa'
                      : 'Emitir factura',
              group: 'Documento',
              icon: Send,
              disabled: busy,
              onAction: () => setModal('issue'),
            },
          !readonly &&
            doc.kind === 'quote' &&
            doc.status === 'sent' && {
              label: 'Marcar como aceptado',
              group: 'Estado del presupuesto',
              icon: Check,
              disabled: busy || doc.due_date < today(),
              title: doc.due_date < today() ? 'El presupuesto ha caducado' : undefined,
              onAction: () => void action('quote', { action: 'accept' }, 'Presupuesto aceptado.'),
            },
          !readonly &&
            doc.kind === 'quote' &&
            doc.status === 'sent' && {
              label: 'Marcar como rechazado',
              group: 'Estado del presupuesto',
              icon: X,
              disabled: busy,
              onAction: () => void action('quote', { action: 'reject' }, 'Presupuesto rechazado.'),
            },
          !readonly &&
            doc.kind === 'quote' &&
            doc.status === 'accepted' && {
              label: 'Convertir en factura',
              group: 'Crear documentos',
              icon: ArrowRight,
              disabled: busy,
              onAction: () =>
                void action(
                  'quote',
                  { action: 'convert', date: today() },
                  'Borrador de factura creado.',
                  'returned',
                ),
            },
          !readonly &&
            confirmed &&
            doc.kind === 'credit' &&
            Number(doc.balance) > 0 && {
              label: 'Registrar devolución',
              group: 'Cobros y pagos',
              icon: Wallet,
              disabled: busy,
              onAction: () => setModal('payment'),
            },
          confirmed && {
            label: readonly ? 'Ver correos' : 'Enviar correo',
            group: 'Consultar y compartir',
            icon: Mail,
            onAction: () => setModal('mail'),
          },
          {
            label: 'Vista previa',
            group: 'Consultar y compartir',
            icon: Eye,
            onAction: () => setModal('preview'),
          },
          {
            label: 'Descargar PDF',
            group: 'Consultar y compartir',
            icon: Download,
            href: downloadUrl(`/documents/${id}/pdf?layout=current`),
            download: `${doc.number || labels[doc.kind].toLowerCase()}.pdf`,
          },
          commercial &&
            confirmed &&
            !readonly &&
            doc.kind !== 'credit' && {
              label:
                doc.kind === 'quote'
                  ? 'Crear otro presupuesto'
                  : purchase
                    ? 'Crear otra compra'
                    : 'Crear otra factura',
              group: 'Crear documentos',
              icon: FilePlus,
              onAction: () =>
                navigate(
                  'new/' +
                    doc.kind +
                    '?work=' +
                    encodeURIComponent('new:' + doc.kind + ':' + crypto.randomUUID()),
                ),
            },
          !readonly &&
            !confirmed &&
            doc.kind !== 'credit' && {
              label: 'Editar borrador',
              group: 'Documento',
              icon: FileText,
              disabled: busy,
              onAction: () => navigate('edit/' + id),
            },
          !readonly &&
            ['invoice', 'purchase'].includes(doc.kind) &&
            confirmed && {
              label: doc.kind === 'purchase' ? 'Registrar abono' : 'Rectificar factura',
              group: 'Crear documentos',
              icon: Undo2,
              onAction: () => setModal('credit'),
            },
          !!doc.converted_id && {
            label: 'Ver factura creada',
            group: 'Consultar y compartir',
            icon: ArrowRight,
            href:
              '#document/' +
              doc.converted_id +
              '?from=' +
              encodeURIComponent(location.hash.slice(1)),
          },
          !!doc.original_id && {
            label: 'Ver factura original',
            group: 'Consultar y compartir',
            icon: FileText,
            href: '#document/' + doc.original_id,
          },
          !readonly &&
            !confirmed && {
              label: 'Descartar borrador',
              group: 'Descartar',
              icon: Trash2,
              onAction: () => setModal('delete'),
              disabled: busy,
            },
        ]}
      />
      <div className="page-content settings-layout document-sections">
        <SectionNavigation
          label="Secciones del documento"
          value={view}
          onChange={setView}
          items={[
            { value: 'summary', label: 'Resumen' },
            ...(confirmed && doc.kind !== 'quote'
              ? [{ value: 'schedule', label: 'Vencimientos' }]
              : []),
            { value: 'files', label: 'Archivos adjuntos' },
            { value: 'movements', label: 'Movimientos' },
            { value: 'activity', label: 'Actividad' },
          ]}
        />
        <div className="settings-main document-section-content">
          {recordNavigation && <div className="document-record-navigation">{recordNavigation}</div>}
          {actionError && <ErrorBox>{actionError}</ErrorBox>}
          {view === 'summary' && (
            <div className="document-summary">
              <DocumentSheet doc={doc} company={company} overview />
              {doc.kind === 'invoice' && <DocumentRequirements id={doc.id} revision={revision} />}
            </div>
          )}
          {view === 'schedule' && confirmed && doc.kind !== 'quote' && (
            <DocumentSchedule doc={doc} readonly={readonly} revision={revision} />
          )}
          {view === 'files' && (
            <DocumentFiles
              id={doc.id}
              readonly={readonly}
              onChange={() => setRevision((v) => v + 1)}
            />
          )}
          {view === 'movements' && <DocumentMovements key={doc.id} doc={doc} />}
          {view === 'activity' && <DocumentActivity key={doc.id} doc={doc} />}
        </div>
      </div>
      {modal === 'preview' && (
        <DocumentPreview
          documentStyle
          url={downloadUrl(`/documents/${id}/pdf?layout=current`)}
          title="Vista previa"
          onClose={() => setModal('')}
        />
      )}
      {modal === 'reverse' && selectedPayment && !readonly && (
        <ReversePayment
          id={selectedPayment.id}
          onClose={() => setModal('')}
          onSaved={() => {
            notify('Movimiento revertido y contabilidad actualizada.');
            refresh();
          }}
        />
      )}
      {confirmed && modal === 'mail' && (
        <DocumentDeliveryModal
          key={id + modal}
          doc={doc}
          readonly={readonly}
          mode={modal}
          notify={notify}
          onClose={() => setModal('')}
        />
      )}
      {modal === 'payment' && (
        <PaymentForm
          duePosition={duePosition}
          salesFlow
          doc={doc}
          onClose={() => setModal('')}
          onSaved={() => {
            notify('Movimiento registrado. Saldo actualizado.', {
              label: 'Ver movimientos',
              to: 'payments?tab=history',
            });
            refresh();
          }}
        />
      )}
      {modal === 'issue' && (
        <IssueDocumentForm
          doc={doc}
          onClose={() => setModal('')}
          onSaved={() => {
            notify('Documento confirmado correctamente.');
            refresh();
          }}
        />
      )}
      {modal === 'credit' && (
        <CreditForm
          doc={doc}
          onClose={() => setModal('')}
          onSaved={(d) => {
            notify('Borrador de rectificativa creado.');
            navigate('document/' + d.id);
          }}
        />
      )}
      {modal === 'delete' && (
        <Modal
          title="Descartar borrador"
          description="El borrador se eliminará. La operación quedará registrada en el historial de auditoría."
          onClose={() => {
            if (!busy) setModal('');
          }}
        >
          {actionError && <ErrorBox>{actionError}</ErrorBox>}
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api('/documents/' + id, { method: 'DELETE' });
                  notify('Borrador descartado.');
                  navigate(back);
                } catch (e) {
                  setActionError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Descartar borrador
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

