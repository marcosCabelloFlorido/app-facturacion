import { documentDeadlineLabel } from './document-deadline';
import { PaymentCreation } from './PaymentCreation';
import { DocumentDeliveryModal } from './Communications';
import { ContactDocumentNavigation } from './ContactDocumentNavigation';
import { documentNavigationSource } from './record-navigation';
import { SalesDocumentNavigation } from './SalesDocumentNavigation';
import { PaymentRecordNavigation } from './PaymentRecordNavigation';
import { DocumentActivity } from './DocumentActivity';
import { DocumentMovements } from './DocumentMovements';
import { IssueDocumentForm } from './IssueDocumentForm';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  Check,
  Download,
  Eye,
  FilePlus,
  FileText,
  Mail,
  Paperclip,
  Send,
  Trash2,
  Undo2,
  Wallet,
  X,
} from 'lucide-react';
import { api, downloadUrl, navigate, today } from './api';
import {
  Badge,
  ErrorBox,
  Field,
  Loading,
  Modal,
  Submit,
  useRemote,
  type Notify,
} from './components';
import { ActionsMenu } from './ActionsMenu';
import { TubelightNavbar } from './components/tubelight-navbar';
import { labels, type Company, type FinancialDocument } from '../shared/domain';
export { DocumentEditor } from './editor';
import { DocumentPreview } from './DocumentPreview';
import { DocumentFolioSheet } from './DocumentFolioSheet';
import { CreditForm, DocumentSchedule } from './FinancePanels';
import { DocumentFiles } from './Files';
import { DocumentRequirements } from './BuyerRequirements';
import { documentReturnRoute } from '../shared/due-dates';
import {
  getSalesWorkflowAction,
  getPurchaseWorkflowAction,
  getDocumentStatus,
} from './document-status';
import './document-detail-modal.css';
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
// Pestañas del modal de detalle. "value" sincroniza con la URL (?view=), "label"
// es el texto mostrado por TubelightNavbar (que usa el propio label como id visual).
type DetailTab = { value: string; label: string; icon: typeof FileText };

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
  const [closing, setClosing] = useState(false);
  const refresh = () => {
    setModal('');
    setRevision((v) => v + 1);
  };
  const requestClose = (to: string) => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => navigate(to), 160);
  };
  // La hoja folio sale inmediatamente; el panel lateral se monta/desmonta con
  // un frame de margen para poder animar su entrada y salida en CSS puro.
  const [panelView, setPanelView] = useState<string | null>(view !== 'summary' ? view : null);
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (view === 'summary') {
      setPanelOpen(false);
      if (panelView) timer = setTimeout(() => setPanelView(null), 260);
    } else {
      setPanelView(view);
      raf = requestAnimationFrame(() => setPanelOpen(true));
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
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
  const ownCompany = doc.company_snapshot || company;
  const issuer = purchase ? doc.party : ownCompany;
  const confirmed = doc.status !== 'draft';
  const paymentAction = getPurchaseWorkflowAction(doc) || getSalesWorkflowAction(doc);
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
  const titleText =
    (commercial && doc.party.name.trim()) ||
    doc.number ||
    (doc.kind === 'quote'
      ? 'Presupuesto en borrador'
      : doc.kind === 'purchase'
        ? 'Compra en borrador'
        : doc.kind === 'credit'
          ? 'Rectificativa en borrador'
          : 'Factura en borrador');
  const tabs: DetailTab[] = [
    { value: 'summary', label: 'Resumen', icon: FileText },
    ...(confirmed && doc.kind !== 'quote'
      ? [{ value: 'schedule', label: 'Vencimientos', icon: CalendarClock }]
      : []),
    { value: 'files', label: 'Archivos adjuntos', icon: Paperclip },
    { value: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
    { value: 'activity', label: 'Actividad', icon: Activity },
  ];
  return (
    <>
      <Modal
        title={titleText}
        onClose={() => requestClose(back)}
        className={`document-detail-modal${closing ? ' is-closing' : ''}`}
      >
        <div className="document-detail-toolbar">
          <div className="document-detail-toolbar-top">
            <div className="document-detail-toolbar-group">
              <Badge doc={doc} />
              {doc.number && (
                <span
                  className="document-heading-number"
                  aria-label={'Número de documento: ' + doc.number}
                >
                  {doc.number}
                </span>
              )}
            </div>
            <div className="document-detail-toolbar-group">
              <div className="document-detail-nav">{recordNavigation}</div>
              <ActionsMenu
                light
                label={`Acciones de ${titleText}`}
                items={[
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
                    onAction: () =>
                      void action('quote', { action: 'reject' }, 'Presupuesto rechazado.'),
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
            </div>
          </div>
          <div className="document-detail-toolbar-main">
            {issuer.name.trim() && (
              <div className="document-detail-issuer">
                <span className="eyebrow">Emisor</span>
                <div className="document-detail-identity-row">
                  <strong>{issuer.name}</strong>
                </div>
                {(issuer.address || issuer.email || issuer.taxId) && (
                  <div className="document-detail-identity-lines">
                    {issuer.address && <span>{issuer.address}</span>}
                    {issuer.email && <span>{issuer.email}</span>}
                    {issuer.taxId && <span>{issuer.taxId}</span>}
                  </div>
                )}
              </div>
            )}
            <div className="document-detail-meta">
              {!(doc.kind === 'invoice' && getDocumentStatus(doc).settled) && (
                <span className="document-detail-deadline">
                  {documentDeadlineLabel(doc, today())}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="document-detail-body">
          <TubelightNavbar
            className="document-detail-navbar"
            items={tabs.map((tab) => ({ name: tab.label, icon: tab.icon }))}
            activeTab={tabs.find((tab) => tab.value === view)?.label}
            onTabChange={(name) => {
              const tab = tabs.find((item) => item.label === name);
              if (tab) setView(tab.value);
            }}
          />
          {actionError && <ErrorBox>{actionError}</ErrorBox>}
          <div className={`folio-stage${panelView ? ' has-panel' : ''}`}>
            <div className="folio-sheet-wrap">
              <DocumentFolioSheet doc={doc} company={company} />
            </div>
            {panelView && (
              <div className={`folio-side-panel-wrap${panelOpen ? ' is-open' : ''}`}>
                <div className="folio-side-panel">
                  {panelView === 'schedule' && confirmed && doc.kind !== 'quote' && (
                    <DocumentSchedule doc={doc} readonly={readonly} revision={revision} />
                  )}
                  {panelView === 'files' && (
                    <DocumentFiles
                      id={doc.id}
                      readonly={readonly}
                      onChange={() => setRevision((v) => v + 1)}
                    />
                  )}
                  {panelView === 'movements' && <DocumentMovements key={doc.id} doc={doc} />}
                  {panelView === 'activity' && <DocumentActivity key={doc.id} doc={doc} />}
                </div>
              </div>
            )}
          </div>
          {view === 'summary' && doc.kind === 'invoice' && (
            <DocumentRequirements id={doc.id} revision={revision} />
          )}
        </div>
      </Modal>
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
