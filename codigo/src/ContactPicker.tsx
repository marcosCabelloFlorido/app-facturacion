import { Select } from './Select';
import { dniLengthError, exceedsDniInput, nifError, nifSchema } from '../shared/nif';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  contactSchema,
  type Contact,
  type ContactInput,
  type ContactPage,
} from '../shared/contacts';
import { api } from './api';
import { ErrorBox, Field, Submit } from './components';
import { useModalDialog } from './useModalDialog';
import './contacts.css';

export function ContactPagination({
  data,
  onPage,
  disabled = false,
  iconControls = false,
}: {
  data: Pick<ContactPage, 'count' | 'page' | 'pageSize'>;
  onPage: (page: number) => void;
  disabled?: boolean;
  iconControls?: boolean;
}) {
  if (iconControls && data.count <= data.pageSize) return null;
  if (data.count <= data.pageSize && data.page === 1) return null;
  return (
    <div className={`contact-pagination${iconControls ? ' contact-pagination-icons' : ''}`}>
      <button
        type="button"
        className={iconControls ? 'icon-button' : 'button'}
        aria-label={iconControls ? 'Página anterior' : undefined}
        disabled={disabled || data.page === 1}
        onClick={() => onPage(data.page - 1)}
      >
        {iconControls ? <ChevronLeft size={17} aria-hidden="true" /> : 'Anterior'}
      </button>
      <span>
        Página {data.page} de {Math.max(1, Math.ceil(data.count / data.pageSize))}
      </span>
      <button
        type="button"
        className={iconControls ? 'icon-button' : 'button'}
        aria-label={iconControls ? 'Página siguiente' : undefined}
        disabled={disabled || data.page * data.pageSize >= data.count}
        onClick={() => onPage(data.page + 1)}
      >
        {iconControls ? <ChevronRight size={17} aria-hidden="true" /> : 'Siguiente'}
      </button>
    </div>
  );
}

export { ContactPicker } from './ContactLookup';

export function ContactForm({
  contact,
  initial,
  onClose,
  onSaved,
  readonly = false,
  lookupCreation = false,
  fixedType,
}: {
  contact?: Contact;
  initial?: Partial<ContactInput>;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
  readonly?: boolean;
  lookupCreation?: boolean;
  fixedType?: 'customer' | 'supplier';
}) {
  const [data, setData] = useState<ContactInput>(() => ({
    name: '',
    taxId: '',
    address: '',
    email: '',
    phone: '',
    notes: '',
    type: 'customer',
    ...initial,
    ...contact,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [starting] = useState(() => JSON.stringify(data));
  const lock = useRef(false);
  const dialog = useModalDialog();
  const titleId = useId();
  useLayoutEffect(() => {
    if (Object.keys(errors).length)
      dialog.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);
  const close = () => {
    if (lock.current) return;
    if (
      !readonly &&
      !saved &&
      JSON.stringify(data) !== starting &&
      !confirm('Hay cambios sin guardar en esta ficha. ¿Quieres descartarlos?')
    )
      return;
    onClose();
  };
  const change = (key: keyof ContactInput, value: string) =>
    setData((v) => ({ ...v, [key]: value }));
  return createPortal(
    <dialog
      ref={dialog}
      className="modal contact-modal"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target !== dialog.current) return;
        const bounds = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < bounds.left ||
          e.clientX > bounds.right ||
          e.clientY < bounds.top ||
          e.clientY > bounds.bottom
        )
          close();
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={titleId}>
            {readonly
              ? 'Datos del cliente o proveedor'
              : contact
                ? 'Editar ficha'
                : lookupCreation && !fixedType
                  ? 'Añadir cliente o proveedor'
                  : data.type === 'supplier'
                    ? 'Añadir proveedor'
                    : 'Añadir cliente'}
          </h2>
          {contact && <p>Los cambios se aplican a nuevos documentos.</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Cerrar ficha"
          disabled={busy}
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (lock.current || readonly) return;
          const parsed = contactSchema.safeParse(data);
          setError('');
          if (!parsed.success) {
            const messages: Record<string, string> = {
              name: 'Escribe un nombre de 2 a 160 caracteres.',
              taxId: nifError,
              address: 'Completa la dirección fiscal (3–300 caracteres).',
              email: 'Introduce un correo electrónico válido.',
              phone: 'El teléfono admite hasta 40 caracteres.',
              notes: 'Las notas admiten hasta 2.000 caracteres.',
            };
            setErrors(
              Object.fromEntries(
                parsed.error.issues.map((i) => [
                  i.path[0],
                  messages[String(i.path[0])] || 'Revisa este campo.',
                ]),
              ),
            );
            return;
          }
          lock.current = true;
          setBusy(true);
          setErrors({});
          try {
            const result = await api<Contact>('/contacts' + (contact ? '/' + contact.id : ''), {
              method: contact ? 'PUT' : 'POST',
              body: contact ? { contact: parsed.data, version: contact.version } : parsed.data,
            });
            setSaved(true);
            onSaved(result);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {error && <ErrorBox>{error}</ErrorBox>}
        <fieldset disabled={busy || readonly} className="contact-fieldset">
          <div className="form-grid">
            <Field label="Nombre o razón social" error={errors.name}>
              <input
                autoFocus
                autoComplete="organization"
                required
                maxLength={160}
                value={data.name}
                onChange={(e) => change('name', e.target.value)}
              />
            </Field>
            <Field label="NIF / identificador fiscal" error={errors.taxId}>
              <input
                required
                maxLength={30}
                value={data.taxId}
                readOnly={lookupCreation && nifSchema.safeParse(initial?.taxId).success}
                onChange={(e) => {
                  if (exceedsDniInput(e.target.value)) {
                    setErrors((current) => ({ ...current, taxId: dniLengthError }));
                    return;
                  }
                  change('taxId', e.target.value);
                  setErrors((current) => ({ ...current, taxId: '' }));
                }}
                onBlur={() => {
                  const parsed = nifSchema.safeParse(data.taxId);
                  if (parsed.success) change('taxId', parsed.data);
                }}
              />
            </Field>
          </div>
          <Field
            label="Dirección fiscal"
            hint="Incluye calle, código postal, localidad y país si corresponde."
            error={errors.address}
          >
            <input
              required
              maxLength={300}
              autoComplete="street-address"
              value={data.address}
              onChange={(e) => change('address', e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Correo electrónico (opcional)" error={errors.email}>
              <input
                type="email"
                autoComplete="email"
                value={data.email}
                onChange={(e) => change('email', e.target.value)}
              />
            </Field>
            <Field label="Teléfono (opcional)" error={errors.phone}>
              <input
                type="tel"
                autoComplete="tel"
                maxLength={40}
                value={data.phone}
                onChange={(e) => change('phone', e.target.value)}
              />
            </Field>
          </div>
          {!fixedType && (
            <Field label="Tipo de ficha" className="field-filled">
              <Select value={data.type} onChange={(e) => change('type', e.target.value)}>
                <option value="customer">Cliente</option>
                <option value="supplier">Proveedor</option>
                <option value="both">Cliente y proveedor</option>
              </Select>
            </Field>
          )}
          <Field label="Notas internas (opcional)" error={errors.notes}>
            <textarea
              rows={2}
              maxLength={2000}
              value={data.notes}
              onChange={(e) => change('notes', e.target.value)}
            />
          </Field>
        </fieldset>
        <div className="modal-actions">
          {!readonly && (
            <Submit busy={busy}>
              {contact ? 'Guardar cambios' : lookupCreation ? 'Guardar y usar' : 'Guardar ficha'}
            </Submit>
          )}
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
