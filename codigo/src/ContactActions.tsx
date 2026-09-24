import { useContext, useState, type ReactNode } from 'react';
import { FeatureDesignContext } from './feature-design-context';
import { FeatureDesigns } from './FeatureDesigns';
import { Download, FilePlus, Info, Wallet } from 'lucide-react';
import type { PageActions } from './ActionsMenu';
import { api, downloadUrl, euros, navigate, shortDate, today } from './api';
import { Empty, ErrorBox, Field, Loading, Modal, useRemote } from './components';
import { Select } from './Select';
import { ContactPagination } from './ContactPicker';
import { PaymentForm } from './documents';
import { normalizeTaxId, type Contact, type ContactActivity } from '../shared/contacts';
import type { FinancialDocument } from '../shared/domain';
import { contactStatementQuerySchema } from '../shared/contact-tools';

type Direction = 'receipt' | 'payment';
export function ContactActions({
  contact,
  readonly,
  onSaved,
  children,
  onDetails,
  extraActions = [],
}: {
  extraActions?: PageActions;
  children: (items: PageActions) => ReactNode;
  onDetails?: () => void;
  contact: Contact;
  readonly: boolean;
  onSaved: () => void;
}) {
  const [action, setAction] = useState<Direction | 'statement' | null>(null);
  const [functionsOpen, setFunctionsOpen] = useState(false);
  const featureContext = useContext(FeatureDesignContext);
  const create = (kind: 'invoice' | 'quote' | 'purchase') =>
    navigate(
      `new/${kind}?contact=${contact.id}&from=${encodeURIComponent(location.hash.slice(1))}`,
    );
  return (
    <>
      <FeatureDesignContext.Provider
        value={{
          area: 'contacts',
          shortcuts: featureContext?.shortcuts ?? [],
          open: (id) => {
            if (id) featureContext?.open(id);
            else setFunctionsOpen(true);
          },
        }}
      >
        {children([
          ...extraActions,
          !!onDetails && { label: 'Ver datos', group: 'Contacto', icon: Info, onAction: onDetails },
          !readonly &&
            contact.active &&
            contact.type !== 'supplier' && {
              label: 'Crear factura',
              group: 'Crear documentos',
              icon: FilePlus,
              onAction: () => create('invoice'),
            },
          !readonly &&
            contact.active &&
            contact.type !== 'supplier' && {
              label: 'Crear presupuesto',
              group: 'Crear documentos',
              icon: FilePlus,
              onAction: () => create('quote'),
            },
          !readonly &&
            contact.active &&
            contact.type !== 'customer' && {
              label: 'Registrar compra',
              group: 'Crear documentos',
              icon: FilePlus,
              onAction: () => create('purchase'),
            },
          !readonly && {
            label: 'Registrar cobro',
            group: 'Cobros y pagos',
            icon: Wallet,
            onAction: () => setAction('receipt'),
          },
          !readonly && {
            label: 'Registrar pago',
            group: 'Cobros y pagos',
            icon: Wallet,
            onAction: () => setAction('payment'),
          },
        ])}
      </FeatureDesignContext.Provider>
      {functionsOpen && (
        <FeatureDesigns
          area="contacts"
          onClose={() => setFunctionsOpen(false)}
          directoryActions={[
            {
              id: 'contact-statement',
              title: 'Descargar extracto',
              icon: Download,
              onAction: () => setAction('statement'),
            },
          ]}
        />
      )}
      {action === 'statement' && (
        <ContactStatementDownload contact={contact} onClose={() => setAction(null)} />
      )}
      {(action === 'receipt' || action === 'payment') && !readonly && (
        <ContactPayment
          key={contact.id + action}
          contact={contact}
          direction={action}
          onClose={() => setAction(null)}
          onSaved={() => {
            setAction(null);
            onSaved();
          }}
        />
      )}
    </>
  );
}
function ContactPayment({
  contact,
  direction,
  onClose,
  onSaved,
}: {
  contact: Contact;
  direction: Direction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [retry, setRetry] = useState(0);
  const [documentId, setDocumentId] = useState('');
  const { data, loading, error } = useRemote<ContactActivity>(
    `/contacts/${contact.id}/activity?view=${direction === 'receipt' ? 'receivable' : 'payable'}&page=${page}&search=${encodeURIComponent(search)}`,
    retry,
  );
  if (documentId)
    return (
      <ContactPaymentDocument
        id={documentId}
        contact={contact}
        direction={direction}
        onClose={onClose}
        onBack={() => {
          setDocumentId('');
          setRetry((r) => r + 1);
        }}
        onSaved={onSaved}
      />
    );
  return (
    <Modal
      title={direction === 'receipt' ? 'Registrar cobro' : 'Registrar pago'}
      description={contact.name}
      onClose={onClose}
    >
      <Field label="Buscar documento">
        <input
          type="search"
          value={search}
          maxLength={150}
          placeholder="Número o referencia…"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Field>
      {loading ? (
        <Loading />
      ) : error ? (
        <>
          <ErrorBox>{error}</ErrorBox>
          <button className="button" onClick={() => setRetry((r) => r + 1)}>
            Reintentar
          </button>
        </>
      ) : data?.documents.length ? (
        <>
          <ul className="contact-payment-options">
            {data.documents.map((d) => (
              <li key={d.id}>
                <button className="contact-directory-item" onClick={() => setDocumentId(d.id)}>
                  <span className="contact-directory-identity">
                    <strong>{d.number}</strong>
                    <span>
                      {d.kind === 'credit' ? 'Devolución · ' : ''}Vence {shortDate(d.due_date)}
                    </span>
                  </span>
                  <span className="contact-pending">
                    <span>
                      Pendiente <strong>{euros(d.balance)}</strong>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <ContactPagination data={data} onPage={setPage} />
        </>
      ) : (
        <Empty
          showMessage
          title={direction === 'receipt' ? 'No hay cobros pendientes' : 'No hay pagos pendientes'}
          description={
            search
              ? 'Prueba otro número o referencia.'
              : 'Los documentos saldados y los borradores no aparecen aquí.'
          }
        />
      )}
      <div className="modal-actions">
        <button className="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
function ContactPaymentDocument({
  id,
  contact,
  direction,
  onClose,
  onBack,
  onSaved,
}: {
  id: string;
  contact: Contact;
  direction: Direction;
  onClose: () => void;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { data, loading, error } = useRemote<FinancialDocument>('/documents/' + id);
  const receipt =
    data &&
    (data.kind === 'invoice' || (data.kind === 'credit' && data.credit_side === 'purchase'));
  if (
    !loading &&
    !error &&
    data &&
    Number(data.balance) > 0 &&
    ['issued', 'recorded'].includes(data.status) &&
    normalizeTaxId(data.party.taxId) === normalizeTaxId(contact.taxId) &&
    receipt === (direction === 'receipt')
  )
    return (
      <PaymentForm
        doc={data}
        salesFlow={data.kind === 'invoice'}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  return (
    <Modal title="Registrar movimiento" onClose={onClose}>
      {loading ? (
        <Loading />
      ) : (
        <>
          <ErrorBox>
            {error || 'Este documento ya no tiene saldo pendiente. Actualiza la selección.'}
          </ErrorBox>
          <button className="button" onClick={onBack}>
            Volver a pendientes
          </button>
        </>
      )}
    </Modal>
  );
}
function ContactStatementDownload({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [from, setFrom] = useState(today().slice(0, 4) + '-01-01'),
    [to, setTo] = useState(today());
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal
      title="Descargar extracto"
      description={contact.name}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = contactStatementQuerySchema.safeParse({ from, to, format });
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          if (busy) return;
          setBusy(true);
          setError('');
          try {
            const response = await fetch(
              downloadUrl(`/contacts/${contact.id}/statement?${new URLSearchParams(parsed.data)}`),
              { credentials: 'same-origin' },
            );
            if (!response.ok) {
              const failure = await response.json().catch(() => null);
              throw new Error(
                failure?.message || 'No se pudo generar el extracto. Vuelve a intentarlo.',
              );
            }
            const blob = await response.blob(),
              url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `extracto-${contact.taxId.replace(/[^a-z0-9_-]/gi, '_')}-${from}-${to}.${format}`;
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 30000);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <Field label="Desde">
            <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              required
              min={from || undefined}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field label="Formato" className="span-2">
            <Select value={format} onChange={(e) => setFormat(e.target.value as 'pdf' | 'xlsx')}>
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel</option>
            </Select>
          </Field>
        </div>
        <p className="contact-hint">
          Documentos y movimientos del periodo, con el saldo pendiente actual de todas las fechas.
        </p>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="modal-actions">
          <button type="button" className="button" disabled={busy} onClick={onClose}>
            Cerrar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Generando…' : 'Descargar extracto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
