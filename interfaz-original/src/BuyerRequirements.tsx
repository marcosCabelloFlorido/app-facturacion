import { Select } from './Select';
import './creation.css';
import { ContactForm } from './ContactPicker';
import { normalizeTaxId, type Contact, type ContactPage } from '../shared/contacts';
import { ClipboardList } from 'lucide-react';
import { SectionEmpty } from './SectionEmpty';
import { useEffect, useState } from 'react';
import { api } from './api';
import {
  Field,
  PanelHeading,
  Modal,
  Submit,
  ErrorBox,
  Loading,
  useRemote,
  type Notify,
} from './components';
import { buyerFieldNames } from '../shared/buyer-requirements';
type Policy = {
  tax_id: string;
  name: string;
  version: number;
  required_fields: string[];
  severity: string;
  notes: string;
};
export function BuyerPolicies({
  notify,
  creating,
  onCreatingChange,
  onHasItemsChange,
}: {
  notify: Notify;
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
  onHasItemsChange?: (hasItems: boolean) => void;
}) {
  const [revision, setRevision] = useState(0),
    [form, setForm] = useState<Policy | null>(null),
    [restoreModalFocus, setRestoreModalFocus] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const { data, error: loadError, loading } = useRemote<Policy[]>('/buyer-policies', revision);
  useEffect(() => {
    onHasItemsChange?.(!loadError && !!data?.length);
    return () => onHasItemsChange?.(false);
  }, [data, loadError, onHasItemsChange]);
  const activeForm: Policy = form ?? {
    tax_id: '',
    name: '',
    version: 0,
    required_fields: [],
    severity: 'warning',
    notes: '',
  };
  const closeForm = () => {
    setForm(null);
    setError('');
    onCreatingChange(false);
  };
  const openForm = (policy: Policy, restoreFocus: boolean) => {
    setError('');
    setRestoreModalFocus(restoreFocus);
    setForm(policy);
  };
  return (
    <section className="panel buyer-policies">
      <PanelHeading title="Requisitos del comprador" />
      {loadError && <ErrorBox>{loadError}</ErrorBox>}
      {loading && <Loading />}
      {!loading && !loadError && data?.length === 0 && (
        <SectionEmpty
          icon={<ClipboardList size={24} strokeWidth={1.5} aria-hidden="true" />}
          message="No hay requisitos del comprador"
          action={
            <button type="button" className="button" onClick={() => onCreatingChange(true)}>
              Añadir requisito
            </button>
          }
        />
      )}
      {data?.map((p) => (
        <div className="recovery-row" key={p.tax_id}>
          <div>
            <strong>{p.name}</strong>
            <p>
              {p.tax_id} · Versión {p.version} ·{' '}
              {p.severity === 'block' ? 'Impide emitir si falta algo' : 'Aviso'}
              <br />
              {p.required_fields.map((k) => buyerFieldNames[k]).join(', ') ||
                'Sin campos obligatorios'}
            </p>
          </div>
          <button
            type="button"
            className="button"
            onClick={(event) => openForm({ ...p }, event.detail === 0)}
          >
            Modificar
          </button>
        </div>
      ))}
      {(creating || form) && (
        <Modal
          title="Requisitos del comprador"
          className="buyer-policies-modal creation-dialog editor-page"
          restoreFocus={creating || restoreModalFocus}
          onClose={() => {
            if (!busy) closeForm();
          }}
        >
          <form
            className="creation-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!activeForm.tax_id || !activeForm.name) {
                setError('Selecciona un cliente.');
                return;
              }
              setBusy(true);
              setError('');
              try {
                await api('/buyer-policies/' + encodeURIComponent(activeForm.tax_id), {
                  method: 'PUT',
                  body: {
                    name: activeForm.name,
                    version: activeForm.version,
                    requiredFields: activeForm.required_fields,
                    severity: activeForm.severity,
                    notes: activeForm.notes,
                  },
                });
                closeForm();
                setRevision((v) => v + 1);
                notify('Requisitos guardados.');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="creation-content">
              {error && <ErrorBox>{error}</ErrorBox>}
              <BuyerClientFields
                policy={activeForm}
                busy={busy}
                onSelect={(contact) => {
                  const taxId = normalizeTaxId(contact.taxId);
                  const existing = data?.find((policy) => normalizeTaxId(policy.tax_id) === taxId);
                  setError('');
                  setForm(
                    existing
                      ? { ...existing }
                      : { ...activeForm, tax_id: taxId, name: contact.name },
                  );
                }}
              />
              <fieldset className="buyer-fieldset">
                <legend>Campos necesarios</legend>
                {Object.entries(buyerFieldNames).map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={activeForm.required_fields.includes(key)}
                      onChange={(e) =>
                        setForm({
                          ...activeForm,
                          required_fields: e.target.checked
                            ? [...activeForm.required_fields, key]
                            : activeForm.required_fields.filter((k) => k !== key),
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <Field label="Si faltan datos">
                <Select
                  value={activeForm.severity}
                  onChange={(e) => setForm({ ...activeForm, severity: e.target.value })}
                >
                  <option value="warning">Mostrar aviso</option>
                  <option value="block">Impedir emisión</option>
                </Select>
              </Field>
              <Field label="Origen o explicación del requisito" className="field-filled">
                <textarea
                  value={activeForm.notes}
                  maxLength={1000}
                  onChange={(e) => setForm({ ...activeForm, notes: e.target.value })}
                />
              </Field>
            </div>
            <div className="wizard-actions">
              <Submit busy={busy}>Guardar requisitos</Submit>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
function BuyerClientFields({
  policy,
  busy,
  onSelect,
}: {
  policy: Policy;
  busy: boolean;
  onSelect: (contact: Contact) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [creatingContact, setCreatingContact] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const editing = policy.version > 0;
  useEffect(() => {
    if (editing) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const rows: Contact[] = [];
        let page = 1;
        while (!controller.signal.aborted) {
          const result = await api<ContactPage>(
            `/contacts?status=active&type=all&pageSize=50&page=${page}`,
            { signal: controller.signal },
          );
          rows.push(...result.rows);
          if (!result.rows.length || page * result.pageSize >= result.count) break;
          page += 1;
        }
        if (!controller.signal.aborted) setContacts(rows);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [editing]);
  return (
    <>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="form-grid buyer-client-fields">
        <Field label="Identificador fiscal" className="field-filled">
          <input readOnly value={policy.tax_id} />
        </Field>
        <Field label="Cliente">
          {editing ? (
            <input readOnly value={policy.name} />
          ) : (
            <Select
              required
              searchable
              actions={[
                { label: 'Crear cliente o proveedor', onAction: () => setCreatingContact(true) },
              ]}
              value={policy.tax_id}
              triggerLabel={policy.name || undefined}
              placeholder={loading ? 'Cargando contactos…' : 'Seleccionar cliente'}
              disabled={busy || editing || loading || !!error}
              onChange={(event) => {
                const contact = contacts.find(
                  (item) => normalizeTaxId(item.taxId) === event.target.value,
                );
                if (contact) onSelect(contact);
              }}
            >
              <option value="">Seleccionar cliente</option>
              {policy.tax_id &&
                !contacts.some((item) => normalizeTaxId(item.taxId) === policy.tax_id) && (
                  <option value={policy.tax_id}>
                    {policy.name} · {policy.tax_id}
                  </option>
                )}
              {contacts.map((contact) => (
                <option key={contact.id} value={normalizeTaxId(contact.taxId)}>
                  {contact.name} · {contact.taxId}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {!editing && !loading && !error && !contacts.length && (
        <p className="muted">No hay clientes ni proveedores activos.</p>
      )}
      {creatingContact && (
        <ContactForm
          lookupCreation
          onClose={() => setCreatingContact(false)}
          onSaved={(contact) => {
            setContacts((current) =>
              [...current.filter((item) => item.id !== contact.id), contact].sort((a, b) =>
                a.name.localeCompare(b.name, 'es'),
              ),
            );
            onSelect(contact);
            setCreatingContact(false);
          }}
        />
      )}
    </>
  );
}
export function DocumentRequirements({ id, revision }: { id: string; revision: number }) {
  const { data, error } = useRemote<{
    policy: { name: string; version: number; notes: string } | null;
    missing: { key: string; label: string; source: string; correction: string }[];
    blocked: boolean;
  }>('/documents/' + id + '/requirements', revision);
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data?.policy) return null;
  return (
    <section className="panel">
      <PanelHeading
        title="Revisión del comprador"
        description={`${data.policy.name} · Requisitos, versión ${data.policy.version}`}
      />
      {data.missing.length ? (
        <>
          <p className={data.blocked ? 'error-box' : 'notice'}>
            {data.blocked
              ? 'Completa los requisitos antes de emitir.'
              : 'Hay requisitos pendientes de revisar.'}
          </p>
          {data.missing.map((m) => (
            <p key={m.key}>
              <strong>{m.label}</strong>
              <br />
              {m.correction}
            </p>
          ))}
        </>
      ) : (
        <p>Los requisitos documentales se cumplen.</p>
      )}
      {data.policy.notes && <p className="muted small">{data.policy.notes}</p>}
    </section>
  );
}
