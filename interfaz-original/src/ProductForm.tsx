import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { productSchema, type Product } from '../shared/domain';
import { api } from './api';
import { ErrorBox, Field, Modal, Submit } from './components';
import { Select } from './Select';
import './product-form.css';

export function ProductForm({
  product,
  initial,
  lookupCreation = false,
  onClose,
  onSaved,
}: {
  product?: Product;
  initial?: Partial<Omit<Product, 'id'>>;
  lookupCreation?: boolean;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const [data, setData] = useState<Omit<Product, 'id'>>(() => ({
    sku: '',
    name: '',
    description: '',
    unitPrice: '0',
    taxRate: '21',
    unit: 'ud.',
    exemptionReason: '',
    active: true,
    ...initial,
    ...product,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const lock = useRef(false);
  const focusInvalid = useRef(false);
  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }, []);
  useLayoutEffect(() => {
    if (!focusInvalid.current) return;
    focusInvalid.current = false;
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);
  const field = (key: keyof typeof data, value: string | boolean) => {
    setData((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError('');
  };
  const close = () => {
    if (!lock.current) onClose();
  };
  return createPortal(
    <Modal
      title={
        product
          ? 'Editar artículo'
          : lookupCreation
            ? 'Crear producto o servicio'
            : 'Nuevo artículo'
      }
      className="product-modal"
      restoreFocus={!lookupCreation}
      onClose={close}
    >
      <form
        ref={form}
        noValidate
        onKeyDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (lock.current) return;
          const parsed = productSchema.safeParse(data);
          const nextErrors: Record<string, string> = {};
          const messages: Record<string, string> = {
            sku: 'Introduce un código de hasta 40 caracteres.',
            name: 'Escribe un nombre de 2 a 200 caracteres.',
            description: 'La descripción admite hasta 500 caracteres.',
            unitPrice: 'Introduce un precio de 0 a 10.000.000, con hasta 4 decimales.',
            taxRate: 'Selecciona un tipo de IVA.',
            unit: 'Introduce una unidad de hasta 20 caracteres.',
            exemptionReason: 'Indica el motivo del IVA 0 % (3–300 caracteres).',
          };
          if (!parsed.success)
            for (const issue of parsed.error.issues) {
              const key = String(issue.path[0]);
              nextErrors[key] = messages[key] || 'Revisa este campo.';
            }
          if (data.taxRate === '0' && data.exemptionReason.trim().length < 3)
            nextErrors.exemptionReason = messages.exemptionReason;
          setError('');
          setErrors(nextErrors);
          if (!parsed.success || Object.keys(nextErrors).length) {
            focusInvalid.current = true;
            return;
          }
          lock.current = true;
          setBusy(true);
          try {
            const result = await api<{ id: string }>(
              '/products' + (product ? '/' + product.id : ''),
              {
                method: product ? 'PUT' : 'POST',
                body: parsed.data,
              },
            );
            onSaved({ ...parsed.data, id: result.id });
          } catch (error) {
            setError((error as Error).message);
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {error && <ErrorBox>{error}</ErrorBox>}
        <fieldset className="product-fieldset" disabled={busy}>
          <div className="form-grid">
            <Field label="Código / SKU" error={errors.sku}>
              <input
                required
                autoFocus
                maxLength={40}
                value={data.sku}
                onChange={(event) => field('sku', event.target.value)}
              />
            </Field>
            <Field label="Nombre" error={errors.name}>
              <input
                required
                maxLength={200}
                value={data.name}
                onChange={(event) => field('name', event.target.value)}
              />
            </Field>
          </div>
          <Field label="Descripción" error={errors.description}>
            <textarea
              rows={2}
              maxLength={500}
              value={data.description}
              onChange={(event) => field('description', event.target.value)}
            />
          </Field>
          <div className="form-grid three product-pricing-fields">
            <Field label="Precio sin IVA" error={errors.unitPrice}>
              <input
                inputMode="decimal"
                required
                value={data.unitPrice}
                onChange={(event) => field('unitPrice', event.target.value.replace(',', '.'))}
              />
            </Field>
            <Field label="IVA" error={errors.taxRate}>
              <Select
                value={data.taxRate}
                onChange={(event) => field('taxRate', event.target.value)}
              >
                {['21', '10', '4', '0'].map((value) => (
                  <option key={value} value={value}>
                    {value} %
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unidad" error={errors.unit}>
              <input
                required
                maxLength={20}
                value={data.unit}
                onChange={(event) => field('unit', event.target.value)}
              />
            </Field>
          </div>
          {data.taxRate === '0' && (
            <Field label="Motivo del IVA 0 %" error={errors.exemptionReason}>
              <input
                required
                minLength={3}
                maxLength={300}
                value={data.exemptionReason}
                onChange={(event) => field('exemptionReason', event.target.value)}
              />
            </Field>
          )}
          {!lookupCreation && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={data.active}
                onChange={(event) => field('active', event.target.checked)}
              />
              Artículo activo
            </label>
          )}
        </fieldset>
        <div className="modal-actions">
          <Submit busy={busy}>{lookupCreation ? 'Guardar y usar' : 'Guardar artículo'}</Submit>
        </div>
      </form>
    </Modal>,
    document.body,
  );
}
