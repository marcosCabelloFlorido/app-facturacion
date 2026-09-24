import { UnitPriceInput } from './UnitPriceInput';
import { DocumentLinesTable } from './DocumentLinesTable';
import { CreationSteps } from './CreationSteps';
import { transitionContent } from './navigation-motion';
import { invoicePaymentTerms, invoiceWithSystemDate } from './invoice-editor-date';
import { Select } from './Select';
import { documentReturnRoute } from '../shared/due-dates';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  FilePlus2,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { euros, navigate, plusDays, shortDate, setNavigationGuard } from './api';
import { useDocumentWorkspace } from './useDocumentWorkspace';
import { useDocumentHeaderOffset } from './useDocumentHeaderOffset';
import { ContactPicker } from './ContactPicker';
import { ProductConceptInput } from './ProductConceptInput';
import { QuantityInput } from './QuantityInput';
import { LineOptions } from './LineOptions';
import { RetentionControl } from './RetentionControl';
import { EditorDocumentPreview } from './DocumentPreview';
import { DocumentSheetLayout } from './DocumentSheetLayout';
import { SalesCreationAssist } from './SalesCreationAssist';
import { DocumentSheetLines } from './DocumentSheetLines';
import { documentTaxBreakdown } from '../shared/document-tax-breakdown';
import './extended.css';
import './editor.css';
import {
  ErrorBox,
  Field,
  Loading,
  Modal,
  PageHeading,
  PanelHeading,
  useRemote,
  type Notify,
} from './components';
import {
  calculate,
  dateSchema,
  documentSchema,
  type Company,
  type DocumentInput,
  type LineInput,
  type Product,
} from '../shared/domain';

const blankLine = (): LineInput => ({
  description: '',
  quantity: '1',
  unitPrice: '0',
  discount: '0',
  taxRate: '21',
  exemptionReason: '',
});
const normal = (s: string) => s.replace(',', '.');
const sectionFor = (kind: string) =>
  kind === 'quote' ? 'quotes' : kind === 'purchase' ? 'purchases' : 'sales';
const inputMessages: Record<string, string> = {
  name: 'Escribe un nombre de entre 2 y 160 caracteres.',
  taxId: 'Introduce el NIF o identificador fiscal (3–30 caracteres).',
  address: 'Completa la dirección fiscal (3–300 caracteres).',
  email: 'Revisa el formato del correo electrónico.',
  date: 'Introduce una fecha válida.',
  dueDate: 'El vencimiento debe ser igual o posterior a la fecha del documento.',
  reference: 'La referencia admite hasta 100 caracteres.',
  notes: 'Las notas admiten hasta 4.000 caracteres.',
  description: 'Escribe un concepto de hasta 500 caracteres.',
  quantity: 'Introduce una cantidad mayor que 0 y hasta 1.000.000 (máximo 4 decimales).',
  unitPrice: 'Introduce un precio válido, con un máximo de cuatro decimales.',
  discount: 'Introduce un descuento de 0 a 100 % (máximo 2 decimales).',
  exemptionReason: 'Indica el motivo del IVA 0 % (3–300 caracteres).',
  lines: 'Añade entre 1 y 100 conceptos.',
};

export function DocumentEditor({
  id,
  kind,
  notify,
  readonly,
  userId,
  workspaceId,
  company,
}: {
  id?: string;
  kind: DocumentInput['kind'];
  notify: Notify;
  readonly: boolean;
  userId: string;
  workspaceId?: string;
  company: Company;
}) {
  const workspace = useDocumentWorkspace({ id, kind, userId, workspaceId });
  const { data, setData, step, setStep, loading, loadError } = workspace;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [more, setMore] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [discountsOpen, setDiscountsOpen] = useState(false);
  const [preview, setPreview] = useState<{ document: DocumentInput; documentId?: string } | null>(
    null,
  );
  const [lineOptions, setLineOptions] = useState<number | null>(null);
  const [visitedStep, setVisitedStep] = useState(0);
  const [editingRecipient, setEditingRecipient] = useState(false);
  const recipientBefore = useRef<DocumentInput['party'] | null>(null);
  const [createdProducts, setCreatedProducts] = useState<Product[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const saving = useRef(false);
  const pendingValidationFocus = useRef(false);
  const {
    data: products,
    loading: productsLoading,
    error: productsError,
  } = useRemote<Product[]>('/products');
  const catalogProducts = [
    ...createdProducts,
    ...(products || []).filter(
      (product) => !createdProducts.some((created) => created.id === product.id),
    ),
  ];
  const purchase = data.kind === 'purchase';
  const quote = data.kind === 'quote';
  const invoice = data.kind === 'invoice';
  const sheetEditor = invoice || quote || purchase;
  useDocumentHeaderOffset(form, sheetEditor && !loading && !loadError && !readonly);
  const hasRecipient = !!(data.party.name.trim() && data.party.address.trim());
  const hasPartyErrors = Object.keys(errors).some((key) => key.startsWith('party.'));
  const showRecipientEditor = sheetEditor && (!hasRecipient || editingRecipient || hasPartyErrors);
  const hasInvoiceConcepts = data.lines.some(
    (line) => line.description.trim() || Number(normal(line.unitPrice)) !== 0,
  );
  const section = sectionFor(data.kind);
  const origin = documentReturnRoute(
    new URLSearchParams(location.hash.split('?')[1]).get('from'),
    section + '?view=list',
  );
  const savedDocument = new URLSearchParams(location.hash.split('?')[1] || '').get(
    quote ? 'savedQuote' : purchase ? 'savedPurchase' : 'savedInvoice',
  );
  const lastStep = sheetEditor ? 2 : 3;
  const names = sheetEditor
    ? [
        purchase ? 'Proveedor' : 'Cliente',
        'Fecha',
        quote
          ? 'Cumplimentar presupuesto'
          : purchase
            ? 'Cumplimentar compra'
            : 'Cumplimentar factura',
      ]
    : [purchase ? 'Proveedor' : 'Cliente', 'Fecha', 'Conceptos', 'Revisión'];
  const titles = [
    purchase ? 'Selecciona el proveedor' : 'Selecciona el cliente',
    quote ? 'Fecha y validez' : 'Fecha y vencimiento',
    sheetEditor
      ? quote
        ? 'Cumplimentar presupuesto'
        : 'Cumplimentar factura'
      : 'Añade los conceptos',
    'Revisión',
  ];
  useEffect(() => {
    if (!loading) setVisitedStep((previous) => Math.max(previous, step));
  }, [step, loading]);
  useEffect(() => {
    if (loading) return;
    setMore(
      (!sheetEditor && !!data.notes) ||
        (!purchase && !!data.reference) ||
        Object.values(data.buyerFields || {}).some(Boolean),
    );
  }, [loading]);
  useEffect(() => {
    if (loading) return;
    const target = showRecipientEditor
      ? form.current?.querySelector<HTMLInputElement>(
          '.invoice-recipient-editor input[role="combobox"]',
        )
      : document.getElementById(
          sheetEditor ? (purchase ? 'input-date' : 'input-dueDate') : 'editor-step-title',
        );
    target?.focus({ preventScroll: editingRecipient });
  }, [step, loading, showRecipientEditor]);
  useEffect(() => {
    if (loading || !pendingValidationFocus.current) return;
    const discountError = /^lines\.(\d+)\.discount$/.exec(Object.keys(errors)[0] || '');
    if (sheetEditor && discountError && (!optionsOpen || !discountsOpen)) {
      setOptionsOpen(true);
      setDiscountsOpen(true);
      return;
    }
    pendingValidationFocus.current = false;
    const invalid = (
      optionsOpen ? document.querySelector('dialog.document-options-modal') : form.current
    )?.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalid?.focus();
  }, [step, errors, loading, sheetEditor, optionsOpen, discountsOpen]);
  function update(patch: Partial<DocumentInput>) {
    setData((v) => ({ ...v, ...patch }));
  }
  function line(index: number, patch: Partial<LineInput>) {
    update({ lines: data.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) });
  }
  let totals: ReturnType<typeof calculate> | null = null;
  try {
    totals = calculate(data.lines, data.retentionRate);
    if (!Number.isFinite(Number(totals.total))) totals = null;
  } catch {
    /* Allow incomplete input while typing. */
  }
  function validate(through = step, input = data) {
    const result = documentSchema.safeParse(input);
    const next: Record<string, string> = {};
    const stepFor = (path: string) =>
      path.startsWith('party')
        ? 0
        : ['date', 'dueDate'].includes(path) || (path === 'reference' && purchase)
          ? 1
          : path.startsWith('lines') || path === 'retentionRate'
            ? 2
            : lastStep;
    if (!result.success)
      for (const issue of result.error.issues) {
        let path = issue.path.join('.') || 'dueDate';
        if (/^lines\.\d+$/.test(path)) path += '.exemptionReason';
        if (stepFor(path) <= through)
          next[path] =
            path === 'dueDate' && sheetEditor && dateSchema.safeParse(input.date).success
              ? `${quote ? 'La validez' : 'El vencimiento'} debe ser igual o posterior al ${shortDate(input.date)}.`
              : inputMessages[path.split('.').at(-1)!] || 'Revisa este campo.';
      }
    if (purchase && !input.reference.trim() && through >= 1)
      next.reference = 'Introduce el número de la factura del proveedor.';
    pendingValidationFocus.current = Object.keys(next).length > 0;
    setErrors(next);
    if (!Object.keys(next).length) {
      setError('');
      return true;
    }
    const first = Object.keys(next)[0];
    if (!sheetEditor) setStep(stepFor(first));
    if (
      Object.keys(next).some(
        (path) =>
          ['notes', 'registrationDate'].includes(path) ||
          (path === 'reference' && !purchase) ||
          path.startsWith('buyerFields.'),
      )
    ) {
      setMore(true);
      if (sheetEditor) setOptionsOpen(true);
    }
    setError('Revisa los campos señalados.');
    return false;
  }
  const control = (path: string) => ({ id: 'input-' + path, 'aria-invalid': !!errors[path] });
  const fieldError = (path: string) => errors[path];
  function goToStep(target: number) {
    if (target > step && !validate(target - 1)) return;
    if (target === step) return;
    transitionContent(
      () => {
        setError('');
        setErrors({});
        if (target !== 0) setEditingRecipient(false);
        setStep(target);
        window.scrollTo(0, 0);
      },
      {
        target: () => document.querySelector('.editor-page'),
        direction: target > step ? 'forward' : 'back',
        scope: 'section',
      },
    );
  }
  function focusLine(index: number) {
    requestAnimationFrame(() =>
      document.getElementById('input-lines.' + index + '.description')?.focus(),
    );
  }
  function addLine() {
    if (busy || data.lines.length >= 100) return;
    const index = data.lines.length;
    update({ lines: [...data.lines, blankLine()] });

    focusLine(index);
  }
  function removeLine(index: number) {
    update({ lines: data.lines.filter((_, i) => i !== index) });

    setErrors({});
    if (sheetEditor)
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLButtonElement>('.add-line')?.focus(),
      );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving.current) return;
    if (step < lastStep) {
      goToStep(step + 1);
      return;
    }
    if (sheetEditor) return;
    await finishDocument('draft');
  }
  async function discardDraft() {
    if (saving.current || workspace.conflict || workspace.pendingFinish) return;
    if (
      !confirm(
        id
          ? '¿Descartar los cambios de edición? El borrador guardado se conservará.'
          : '¿Descartar este borrador?',
      )
    )
      return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await workspace.discard();
      setNavigationGuard(null);
      notify(
        id ? 'Cambios descartados. Se conserva el borrador guardado.' : 'Borrador descartado.',
      );
      navigate(id ? 'document/' + id + '?from=' + encodeURIComponent(origin) : origin);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function finishDocument(action: 'draft' | 'issue', saveAndCreateAnother = false) {
    if (saving.current || workspace.conflict) return;
    const input = workspace.pendingFinish ? data : invoiceWithSystemDate(data);
    if (!workspace.pendingFinish) {
      setData(input);
      if (!validate(lastStep, input)) return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await workspace.finish(action, input);
      setNavigationGuard(null);
      if (result.status !== 'draft') {
        notify(purchase ? 'Compra contabilizada.' : 'Factura emitida.');
        navigate('document/' + result.id + '?from=' + encodeURIComponent(origin));
        return;
      }
      if (!saveAndCreateAnother)
        notify(
          `${quote ? 'Presupuesto guardado' : purchase ? 'Compra guardada' : 'Factura guardada'} en borrador.`,
          { label: 'Abrir borrador', to: 'document/' + result.id },
        );
      if (saveAndCreateAnother) {
        navigate(
          'new/' +
            data.kind +
            '?work=' +
            encodeURIComponent('new:' + data.kind + ':' + crypto.randomUUID()) +
            ((quote ? '&savedQuote=' : purchase ? '&savedPurchase=' : '&savedInvoice=') +
              result.id) +
            '&customerFrom=' +
            encodeURIComponent(result.id),
        );
      } else navigate(section + '?status=draft&highlight=' + result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (readonly) return <ErrorBox>Tu cuenta solo tiene permisos de consulta.</ErrorBox>;
  if (loading) return <Loading />;
  if (loadError)
    return (
      <>
        <ErrorBox>{loadError}</ErrorBox>
        <button type="button" className="button" onClick={workspace.retryLoad}>
          Reintentar
        </button>
      </>
    );
  const recipientPicker = (
    <ContactPicker
      party={data.party}
      type={purchase ? 'supplier' : 'customer'}
      disabled={busy}
      showSelection={!sheetEditor}
      salesFlow={sheetEditor}
      onResolved={() => {
        if (!sheetEditor) return;
        setEditingRecipient(false);
        requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLButtonElement>(
              invoice
                ? '#input-dueDate'
                : purchase
                  ? '[aria-label="Editar proveedor"]'
                  : '[aria-label="Editar cliente"]',
            )
            ?.focus({ preventScroll: !invoice }),
        );
      }}
      error={
        Object.keys(errors).some((key) => key.startsWith('party.'))
          ? sheetEditor
            ? purchase
              ? 'Selecciona un proveedor o completa su ficha para continuar.'
              : 'Selecciona un cliente o completa su ficha para continuar.'
            : 'Consulta el NIF y confirma o completa la ficha para continuar.'
          : undefined
      }
      onSelect={(party) => {
        update({ party });
        if (Object.keys(errors).some((key) => key.startsWith('party.')))
          setErrors((current) =>
            Object.fromEntries(
              Object.entries(current).filter(([key]) => !key.startsWith('party.')),
            ),
          );
      }}
    />
  );
  const dueDateField = (
    <Field
      className={sheetEditor ? 'field-label-hidden' : undefined}
      label={quote ? 'Válido hasta' : 'Vencimiento'}
      error={fieldError('dueDate')}
    >
      <input
        {...control('dueDate')}
        type="date"
        min={data.date}
        value={data.dueDate}
        onChange={(e) => update({ dueDate: e.target.value })}
      />
    </Field>
  );
  const paymentTerms = quote ? [7, 15, 30, 60] : invoicePaymentTerms;
  const validDate = dateSchema.safeParse(data.date).success;
  const selectedTerm = validDate
    ? paymentTerms.find((days) => data.dueDate === plusDays(data.date, days))
    : undefined;
  const paymentTermField = (
    <Field label={quote ? 'Plazo de validez' : 'Plazo de pago'}>
      <Select
        value={selectedTerm === undefined ? 'custom' : String(selectedTerm)}
        disabled={!validDate}
        onChange={(event) => {
          if (event.target.value === 'custom') {
            document.getElementById('input-dueDate')?.focus();
            return;
          }
          update({ dueDate: plusDays(data.date, Number(event.target.value)) });
          setErrors(({ dueDate, ...rest }) => rest);
        }}
      >
        {paymentTerms.map((days) => (
          <option key={days} value={String(days)}>
            {days ? `${days} días` : 'Al contado'}
          </option>
        ))}
        <option value="custom">Personalizado</option>
      </Select>
    </Field>
  );
  const documentDateFields = (
    <div
      className={`invoice-date-fields fields-filled${purchase ? ' document-date-fields-purchase' : quote ? ' document-date-fields-quote' : ''}`}
    >
      {!invoice && (
        <Field
          label={purchase ? 'Fecha de la factura' : 'Fecha del presupuesto'}
          error={fieldError('date')}
        >
          <input
            {...control('date')}
            type="date"
            required
            value={data.date}
            onChange={(event) => {
              const date = event.target.value;
              update({
                date,
                ...(selectedTerm !== undefined && dateSchema.safeParse(date).success
                  ? { dueDate: plusDays(date, selectedTerm) }
                  : {}),
              });
            }}
          />
        </Field>
      )}
      <div className="composer-payment-dates">
        <Field label={quote ? 'Válido hasta' : 'Vencimiento'} error={fieldError('dueDate')}>
          <input
            {...control('dueDate')}
            type="date"
            required
            min={data.date}
            value={data.dueDate}
            onChange={(event) => update({ dueDate: event.target.value })}
          />
        </Field>
        {paymentTermField}
      </div>
      {purchase && (
        <Field label="N.º de factura del proveedor" error={fieldError('reference')}>
          <input
            {...control('reference')}
            required
            maxLength={100}
            value={data.reference}
            onChange={(event) => {
              update({ reference: event.target.value });
              if (event.target.value.trim()) {
                setErrors(({ reference, ...rest }) => rest);
                if (Object.keys(errors).every((key) => key === 'reference')) setError('');
              }
            }}
          />
        </Field>
      )}
    </div>
  );
  const conceptFields = (
    <>
      {errors.lines && <ErrorBox>{errors.lines}</ErrorBox>}
      {sheetEditor ? (
        <DocumentLinesTable editable invoice={sheetEditor}>
          {data.lines.map((l, index) => (
            <tr key={index}>
              <td className="line-concept">
                <ProductConceptInput
                  id={`input-lines.${index}.description`}
                  multiline
                  label={`Producto o servicio ${index + 1}`}
                  placeholder="Busca en el catálogo o escribe"
                  value={l.description}
                  products={catalogProducts}
                  loading={productsLoading}
                  catalogError={productsError}
                  error={fieldError(`lines.${index}.description`)}
                  disabled={busy || !!workspace.pendingFinish}
                  onCreated={(product) => setCreatedProducts((current) => [...current, product])}
                  onChange={(description) => line(index, { description })}
                  onSelect={(product) =>
                    line(index, {
                      description: product.name,
                      unitPrice: product.unitPrice,
                      taxRate: product.taxRate,
                      exemptionReason: product.exemptionReason,
                    })
                  }
                />
                {Number(l.discount) > 0 && (
                  <small className="concept-discount">
                    Descuento: −{Number(l.discount).toLocaleString('es-ES')} %
                  </small>
                )}
                {l.taxRate === '0' && (
                  <Field
                    label="Motivo del IVA 0 %"
                    className="line-exemption-field"
                    error={fieldError(`lines.${index}.exemptionReason`)}
                  >
                    <input
                      {...control(`lines.${index}.exemptionReason`)}
                      value={l.exemptionReason}
                      placeholder="Motivo y referencia aplicable"
                      onChange={(e) => line(index, { exemptionReason: e.target.value })}
                    />
                  </Field>
                )}
              </td>
              <td className="line-numeric line-quantity">
                <QuantityInput
                  id={`input-lines.${index}.quantity`}
                  value={l.quantity}
                  error={fieldError(`lines.${index}.quantity`)}
                  disabled={busy}
                  onChange={(value) => line(index, { quantity: normal(value) })}
                />
              </td>
              <td className="line-numeric line-price">
                <Field
                  label={`Precio unitario del concepto ${index + 1}`}
                  error={fieldError(`lines.${index}.unitPrice`)}
                >
                  <UnitPriceInput
                    {...control(`lines.${index}.unitPrice`)}
                    inputMode="decimal"
                    value={l.unitPrice}
                    onChange={(e) => line(index, { unitPrice: normal(e.target.value) })}
                  />
                </Field>
              </td>
              <td className="line-numeric line-tax">
                <Field label={`IVA del concepto ${index + 1}`}>
                  <Select
                    value={l.taxRate}
                    onChange={(e) =>
                      line(index, { taxRate: e.target.value as LineInput['taxRate'] })
                    }
                  >
                    {['21', '10', '4', '0'].map((v) => (
                      <option key={v} value={v}>
                        {v} %
                      </option>
                    ))}
                  </Select>
                </Field>
              </td>
              <td className="line-actions">
                <button
                  type="button"
                  className="icon-button icon-button-plain"
                  aria-label={`Eliminar concepto ${index + 1}`}
                  title="Eliminar concepto"
                  disabled={busy || !!workspace.pendingFinish || data.lines.length <= 1}
                  onClick={() => removeLine(index)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </DocumentLinesTable>
      ) : (
        <div className="invoice-lines" role="list" aria-label="Conceptos del documento">
          {data.lines.map((l, index) => (
            <div className="line-editor" role="listitem" key={index}>
              <div className="line-editor-title">
                {!sheetEditor && <strong>Concepto {index + 1}</strong>}
                {!sheetEditor && !!products?.some((p) => p.active) && (
                  <Select
                    searchable
                    aria-label={`Elegir del catálogo para concepto ${index + 1}`}
                    value=""
                    onChange={(e) => {
                      const p = products?.find((p) => p.id === e.target.value);
                      if (p)
                        line(index, {
                          description: p.name,
                          unitPrice: p.unitPrice,
                          taxRate: p.taxRate,
                          exemptionReason: p.exemptionReason,
                        });
                    }}
                  >
                    <option value="">Añadir del catálogo</option>
                    {products
                      .filter((p) => p.active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {euros(p.unitPrice)}
                        </option>
                      ))}
                  </Select>
                )}
                {sheetEditor ? (
                  <LineOptions
                    index={index}
                    discount={l.discount}
                    error={fieldError(`lines.${index}.discount`)}
                    disabled={busy || !!workspace.pendingFinish}
                    canRemove={data.lines.length > 1}
                    open={lineOptions === index}
                    onOpenChange={(open) => setLineOptions(open ? index : null)}
                    onDiscountChange={(value) => line(index, { discount: normal(value) })}
                    onRemove={() => removeLine(index)}
                  />
                ) : (
                  <button
                    type="button"
                    className="icon-button"
                    disabled={data.lines.length === 1}
                    aria-label={`Eliminar concepto ${index + 1}`}
                    onClick={() => removeLine(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {sheetEditor ? (
                <ProductConceptInput
                  id={`input-lines.${index}.description`}
                  multiline
                  label={`Producto o servicio ${index + 1}`}
                  labelVisible
                  placeholder="Busca en el catálogo o escribe"
                  value={l.description}
                  products={catalogProducts}
                  loading={productsLoading}
                  catalogError={productsError}
                  error={
                    fieldError(`lines.${index}.description`) ||
                    fieldError(`lines.${index}.unitPrice`)
                  }
                  disabled={busy || !!workspace.pendingFinish}
                  onCreated={(product) => setCreatedProducts((current) => [...current, product])}
                  onChange={(description) => line(index, { description })}
                  onSelect={(product) =>
                    line(index, {
                      description: product.name,
                      unitPrice: product.unitPrice,
                      taxRate: product.taxRate,
                      exemptionReason: product.exemptionReason,
                    })
                  }
                />
              ) : (
                <Field label="Descripción" error={fieldError(`lines.${index}.description`)}>
                  <input
                    {...control(`lines.${index}.description`)}
                    value={l.description}
                    placeholder="Producto o servicio"
                    onChange={(e) => line(index, { description: e.target.value })}
                  />
                </Field>
              )}
              <div className="line-numbers">
                {sheetEditor ? (
                  <QuantityInput
                    id={`input-lines.${index}.quantity`}
                    value={l.quantity}
                    error={fieldError(`lines.${index}.quantity`)}
                    disabled={busy}
                    onChange={(value) => line(index, { quantity: normal(value) })}
                  />
                ) : (
                  <Field label="Cantidad" error={fieldError(`lines.${index}.quantity`)}>
                    <input
                      {...control(`lines.${index}.quantity`)}
                      inputMode="decimal"
                      value={l.quantity}
                      onChange={(e) => line(index, { quantity: normal(e.target.value) })}
                    />
                  </Field>
                )}
                {!sheetEditor && (
                  <Field label="Descuento %" error={fieldError(`lines.${index}.discount`)}>
                    <input
                      {...control(`lines.${index}.discount`)}
                      aria-label={`Descuento % del concepto ${index + 1}`}
                      inputMode="decimal"
                      value={l.discount}
                      onChange={(e) => line(index, { discount: normal(e.target.value) })}
                    />
                  </Field>
                )}
                <Field label="IVA">
                  <Select
                    value={l.taxRate}
                    onChange={(e) =>
                      line(index, { taxRate: e.target.value as LineInput['taxRate'] })
                    }
                  >
                    {['21', '10', '4', '0'].map((v) => (
                      <option key={v} value={v}>
                        {v} %
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {l.taxRate === '0' && (
                <Field
                  label="Motivo del IVA 0 %"
                  error={fieldError(`lines.${index}.exemptionReason`)}
                >
                  <input
                    {...control(`lines.${index}.exemptionReason`)}
                    value={l.exemptionReason}
                    placeholder="Motivo y referencia aplicable"
                    onChange={(e) => line(index, { exemptionReason: e.target.value })}
                  />
                </Field>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`button add-line${sheetEditor ? ' ghost' : ''}`}
        disabled={data.lines.length >= 100}
        onClick={addLine}
        aria-keyshortcuts={sheetEditor ? 'Control+Enter Meta+Enter' : undefined}
      >
        <Plus size={16} />
        Añadir concepto
      </button>
      {!sheetEditor && (
        <RetentionControl
          value={data.retentionRate}
          disabled={busy || !!workspace.pendingFinish}
          onChange={(retentionRate) => update({ retentionRate })}
        />
      )}
    </>
  );
  const notesField = (
    <Field label="Notas visibles en el documento" error={fieldError('notes')}>
      <textarea
        {...control('notes')}
        value={data.notes}
        rows={3}
        placeholder="Condiciones o instrucciones de pago"
        onChange={(e) => update({ notes: e.target.value })}
      />
    </Field>
  );
  const additionalFields = (
    <details
      className="optional-details"
      open={more}
      onToggle={(e) => setMore(e.currentTarget.open)}
    >
      <summary>Datos adicionales</summary>
      <div>
        {!purchase && (
          <Field label="Referencia" error={fieldError('reference')}>
            <input
              {...control('reference')}
              value={data.reference}
              placeholder="Pedido o proyecto"
              onChange={(e) => update({ reference: e.target.value })}
            />
          </Field>
        )}
        {notesField}
        {(['purchaseOrder', 'costCenter', 'contract'] as const).map((key) => (
          <Field
            key={key}
            label={
              {
                purchaseOrder: 'Número de pedido',
                costCenter: 'Centro de coste',
                contract: 'Referencia de contrato',
              }[key]
            }
            error={fieldError(`buyerFields.${key}`)}
          >
            <input
              {...control(`buyerFields.${key}`)}
              maxLength={120}
              value={data.buyerFields?.[key] || ''}
              onChange={(e) =>
                update({
                  buyerFields: { ...data.buyerFields, [key]: e.target.value },
                })
              }
            />
          </Field>
        ))}
        {purchase && (
          <Field label="Fecha de registro contable" error={fieldError('registrationDate')}>
            <input
              {...control('registrationDate')}
              type="date"
              min={data.date}
              value={data.registrationDate || data.date}
              onChange={(e) => update({ registrationDate: e.target.value || undefined })}
            />
          </Field>
        )}
      </div>
    </details>
  );
  const partyEditor = showRecipientEditor ? (
    <div className="invoice-recipient-editor fields-filled">
      <div className="document-sheet-caption">
        <p className="document-sheet-label">{purchase ? 'Proveedor' : 'Cliente'}</p>
      </div>
      {recipientPicker}
      {editingRecipient && recipientBefore.current && (
        <button
          type="button"
          className="button ghost"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            update({ party: recipientBefore.current! });
            setEditingRecipient(false);
            setErrors({});
            requestAnimationFrame(() =>
              form.current
                ?.querySelector<HTMLButtonElement>(
                  purchase ? '[aria-label="Editar proveedor"]' : '[aria-label="Editar cliente"]',
                )
                ?.focus({ preventScroll: true }),
            );
          }}
        >
          Cancelar cambio
        </button>
      )}
    </div>
  ) : undefined;
  const partyAction = !showRecipientEditor && (
    <button
      type="button"
      className="icon-button icon-button-plain"
      aria-label={purchase ? 'Editar proveedor' : 'Editar cliente'}
      title={purchase ? 'Editar proveedor' : 'Editar cliente'}
      onClick={() => {
        recipientBefore.current = structuredClone(data.party);
        setEditingRecipient(true);
      }}
    >
      <Pencil size={14} aria-hidden="true" />
    </button>
  );
  const saveStatus = (
    <>
      {(!sheetEditor ||
        (!!workspace.status &&
          !['Borrador guardado', 'Borrador recuperado'].includes(workspace.status))) && (
        <div className="workspace-save-status" role="status">
          {workspace.status}
        </div>
      )}
      {sheetEditor && savedDocument && /^[0-9a-f-]{36}$/i.test(savedDocument) && (
        <div className="workspace-save-status" role="status">
          Borrador guardado.{' '}
          <a className="text-link" href={'#document/' + savedDocument}>
            Abrir borrador anterior
          </a>
        </div>
      )}
    </>
  );
  return (
    <>
      <PageHeading
        backLink={{
          href: id ? '#document/' + id + '?from=' + encodeURIComponent(origin) : '#' + origin,
          label: 'Atrás',
        }}
        title={
          id
            ? 'Editar borrador'
            : quote
              ? 'Nuevo presupuesto'
              : purchase
                ? 'Nueva compra'
                : 'Nueva factura'
        }
        tools={sheetEditor ? null : undefined}
        hiddenFeatureShortcuts={invoice ? ['recurring'] : []}
        menu={[
          sheetEditor && {
            label:
              busy && workspace.pendingFinish !== 'issue' ? 'Guardando…' : 'Guardar en borrador',
            group: 'Guardar y emitir',
            icon: Save,
            disabled: busy || workspace.conflict || workspace.pendingFinish === 'issue',
            onAction: () => void finishDocument('draft'),
          },
          sheetEditor &&
            !quote && {
              label:
                busy && workspace.pendingFinish === 'issue'
                  ? purchase
                    ? 'Contabilizando…'
                    : 'Emitiendo…'
                  : purchase
                    ? 'Contabilizar compra'
                    : 'Emitir factura',
              group: 'Guardar y emitir',
              icon: Check,
              disabled: busy || workspace.conflict || workspace.pendingFinish === 'draft',
              onAction: () => void finishDocument('issue'),
            },
          sheetEditor && {
            label: 'Vista previa',
            group: 'Revisar y configurar',
            icon: Eye,
            disabled: busy,
            onAction: () => {
              const input = invoiceWithSystemDate(data);
              if (validate(lastStep, input)) setPreview({ document: input, documentId: id });
            },
          },
          sheetEditor &&
            !invoice &&
            step === lastStep && {
              label: quote
                ? 'Guardar y crear otro presupuesto'
                : purchase
                  ? 'Guardar y crear otra compra'
                  : 'Guardar y crear otra factura',
              group: 'Guardar y emitir',
              icon: FilePlus2,
              disabled: busy || workspace.conflict || workspace.pendingFinish === 'issue',
              onAction: () => void finishDocument('draft', true),
            },
          sheetEditor && {
            label: quote
              ? 'Opciones del presupuesto'
              : purchase
                ? 'Opciones de la compra'
                : 'Opciones de la factura',
            group: 'Revisar y configurar',
            icon: SlidersHorizontal,
            onAction: () => {
              setMore(false);
              setDiscountsOpen(false);
              setOptionsOpen(true);
            },
          },
          {
            label: 'Descartar borrador',
            group: 'Descartar',
            icon: Trash2,
            disabled: busy || workspace.conflict || !!workspace.pendingFinish,
            onAction: () => void discardDraft(),
          },
        ]}
      />
      <div
        data-document-kind={data.kind}
        onPointerDownCapture={(event) => {
          if (!sheetEditor || !(event.target instanceof Element)) return;
          const active = document.activeElement;
          if (!(active instanceof HTMLElement) || !event.currentTarget.contains(active)) return;
          // Portalled options and interactive controls manage their own focus.
          if (
            !event.currentTarget.contains(event.target) ||
            event.target.closest(
              'input, textarea, select, button, a, label, [role="option"], [role="listbox"], [role="combobox"]',
            )
          )
            return;
          if (
            active.matches('input, textarea, select, [role="combobox"]') &&
            !active.closest('.field')?.contains(event.target)
          )
            active.blur();
        }}
        className={`page-content editor-page${sheetEditor ? ' editor-page-invoice' : ''}${!sheetEditor && step < 2 ? ' editor-page-intro' : ''}${sheetEditor ? ' editor-page-sheet' : ''}${sheetEditor ? (step < 2 ? ' editor-invoice-compact' : ' editor-invoice-document') : ''}${sheetEditor ? ' editor-single-page document-composer' : ''}`}
      >
        {!sheetEditor && saveStatus}
        {workspace.conflict && (
          <div className="notice">
            <p>Conserva una copia de tus cambios antes de recuperar la versión del servidor.</p>
            <button type="button" className="button" onClick={workspace.downloadRecovery}>
              Descargar mi copia
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                if (
                  confirm(
                    'Se reemplazarán los campos visibles por la versión del servidor. ¿Continuar?',
                  )
                )
                  workspace.reloadRemote();
              }}
            >
              Recuperar versión guardada
            </button>
          </div>
        )}
        {!sheetEditor && (
          <CreationSteps
            names={names}
            step={step}
            availableStep={Math.max(visitedStep, step)}
            disabled={busy || !!workspace.pendingFinish}
            onChange={goToStep}
          />
        )}
        <form
          className="editor-layout"
          onSubmit={submit}
          noValidate
          ref={form}
          aria-busy={busy}
          onKeyDownCapture={
            sheetEditor
              ? (event) => {
                  if (
                    !event.nativeEvent.isComposing &&
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey) &&
                    step === 2 &&
                    event.target instanceof Element &&
                    event.target.closest('.invoice-sheet-fields')
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    addLine();
                  }
                }
              : undefined
          }
          onKeyDown={
            sheetEditor
              ? (event) => {
                  if (event.nativeEvent.isComposing || event.defaultPrevented) return;
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && step === 2) {
                    event.preventDefault();
                    addLine();
                  } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                    event.preventDefault();
                  }
                }
              : undefined
          }
        >
          <fieldset
            className="editor-main editor-fieldset"
            disabled={busy || !!workspace.pendingFinish}
          >
            {error && <ErrorBox>{error}</ErrorBox>}
            {sheetEditor ? (
              <div className="document-summary invoice-editor">
                <h2 id="editor-step-title" className="sr-only" tabIndex={-1}>
                  {names[step]}
                </h2>
                <DocumentSheetLayout
                  invoice={sheetEditor}
                  overview={step === 2}
                  heading={
                    <div className="composer-paper-heading">
                      <div>
                        <h2>{quote ? 'Presupuesto' : purchase ? 'Compra / gasto' : 'Factura'}</h2>
                        <span className="composer-draft">Borrador</span>
                      </div>
                      <div className="composer-heading-dates">{documentDateFields}</div>
                    </div>
                  }
                  label={
                    quote
                      ? 'Presupuesto en edición'
                      : purchase
                        ? 'Compra en edición'
                        : 'Factura en edición'
                  }
                  quote={quote}
                  issuer={purchase ? data.party : company}
                  issuerLabel={purchase ? 'Proveedor' : step === 2 ? 'Emisor' : undefined}
                  recipient={purchase ? company : data.party}
                  recipientLabel={purchase ? 'Tu empresa' : 'Cliente'}
                  dateFields={false}
                  date={data.date}
                  dueDate={data.dueDate}
                  operationDate={
                    data.operationDate && data.operationDate !== data.date
                      ? data.operationDate
                      : undefined
                  }
                  recipientEditor={purchase ? undefined : partyEditor}
                  issuerEditor={purchase ? partyEditor : undefined}
                  recipientAction={purchase ? undefined : partyAction}
                  issuerAction={purchase ? partyAction : undefined}
                >
                  {step === 2 ? (
                    <div className="invoice-sheet-fields fields-filled">{conceptFields}</div>
                  ) : (
                    hasInvoiceConcepts &&
                    (totals ? (
                      <DocumentSheetLines lines={totals.lines} />
                    ) : (
                      <ol className="document-sheet-lines" aria-label="Conceptos del documento">
                        {data.lines
                          .filter((line) => line.description.trim())
                          .map((line, index) => (
                            <li key={index}>
                              <h3 className="document-sheet-concept">{line.description}</h3>
                            </li>
                          ))}
                      </ol>
                    ))
                  )}
                  {(step === 2 || hasInvoiceConcepts) && (
                    <div className="composer-sheet-footer">
                      <div className="document-sheet-totals" aria-live="polite" aria-atomic="true">
                        <DocumentTotals
                          totals={totals}
                          taxBreakdown={totals ? documentTaxBreakdown(totals.lines) : undefined}
                          retentionRate={data.retentionRate}
                        />
                      </div>
                    </div>
                  )}
                </DocumentSheetLayout>
              </div>
            ) : (
              <section
                className="panel wizard-panel"
                key={step}
                aria-labelledby="editor-step-title"
              >
                <h2 id="editor-step-title" tabIndex={-1}>
                  {titles[step]}
                </h2>
                {step === 0 && <>{recipientPicker}</>}
                {step === 1 && (
                  <div className="form-grid editor-date-fields">
                    {!sheetEditor && (
                      <Field label="Fecha del documento" error={fieldError('date')}>
                        <input
                          {...control('date')}
                          type="date"
                          value={data.date}
                          onChange={(e) =>
                            update({
                              date: e.target.value,
                              ...(data.dueDate === plusDays(data.date, 30) && e.target.value
                                ? { dueDate: plusDays(e.target.value, 30) }
                                : {}),
                            })
                          }
                        />
                      </Field>
                    )}
                    {dueDateField}
                    {purchase && (
                      <Field label="N.º de factura del proveedor" error={fieldError('reference')}>
                        <input
                          {...control('reference')}
                          value={data.reference}
                          placeholder="Ej. PROV-2026-042"
                          onChange={(e) => update({ reference: e.target.value })}
                        />
                      </Field>
                    )}
                  </div>
                )}
                {step === 2 && conceptFields}
                {step === 3 && (
                  <>
                    <div className="review-recipient">
                      <div>
                        <small>{purchase ? 'Proveedor' : 'Cliente'}</small>
                        <h3>{data.party.name}</h3>
                        <p>{data.party.taxId}</p>
                        <p>{data.party.address}</p>
                        {data.party.email && <p>{data.party.email}</p>}
                      </div>
                      <button
                        className="button ghost review-edit"
                        type="button"
                        aria-label={purchase ? 'Editar proveedor' : 'Editar cliente'}
                        onClick={() => goToStep(0)}
                      >
                        Editar
                      </button>
                    </div>
                    <div className="review-date-section">
                      <dl className="review-dates">
                        <div>
                          <dt>Fecha</dt>
                          <dd>{shortDate(data.date)}</dd>
                        </div>
                        <div>
                          <dt>{quote ? 'Válido hasta' : 'Vencimiento'}</dt>
                          <dd>{shortDate(data.dueDate)}</dd>
                        </div>
                        {purchase && (
                          <div>
                            <dt>Factura del proveedor</dt>
                            <dd>{data.reference}</dd>
                          </div>
                        )}
                      </dl>
                      <button
                        className="button ghost review-edit"
                        type="button"
                        aria-label="Editar fechas"
                        onClick={() => goToStep(1)}
                      >
                        Editar
                      </button>
                    </div>
                    <div className="review-concepts">
                      <PanelHeading
                        title="Conceptos"
                        action={
                          <button
                            className="button ghost review-edit"
                            type="button"
                            aria-label="Editar conceptos"
                            onClick={() => goToStep(2)}
                          >
                            Editar
                          </button>
                        }
                      />
                      {data.lines.map((l, i) => (
                        <div key={i}>
                          <span>
                            {l.description}
                            <small>
                              {l.quantity} × {euros(l.unitPrice)} · IVA {l.taxRate} %
                              {Number(l.discount) > 0 ? ` · Descuento ${l.discount} %` : ''}
                            </small>
                          </span>
                          <strong>{totals ? euros(totals.lines[i].total) : '—'}</strong>
                        </div>
                      ))}
                    </div>
                    {additionalFields}
                  </>
                )}
              </section>
            )}
          </fieldset>
          {!sheetEditor && step >= 2 && (
            <aside className="editor-summary" aria-label="Totales del documento">
              <section className="panel">
                <PanelHeading title="Total del documento" />
                <DocumentTotals totals={totals} />
              </section>
            </aside>
          )}
          {!(sheetEditor && step === lastStep) && (
            <div className="wizard-actions">
              {step > 0 ? (
                <button
                  type="button"
                  className="button"
                  disabled={busy || !!workspace.pendingFinish}
                  onClick={() => goToStep(step - 1)}
                >
                  <ArrowLeft size={16} />
                  Anterior
                </button>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="button primary"
                disabled={busy || workspace.conflict}
              >
                {step < lastStep ? (
                  <>
                    Continuar
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {busy ? 'Guardando…' : 'Guardar borrador'}
                  </>
                )}
              </button>
            </div>
          )}
          {sheetEditor && step === lastStep && (busy || workspace.pendingFinish) && (
            <p className="muted" role="status">
              {busy
                ? workspace.pendingFinish === 'issue'
                  ? purchase
                    ? 'Contabilizando compra…'
                    : 'Emitiendo factura…'
                  : 'Guardando…'
                : 'No se ha podido confirmar el resultado. Reintenta la misma acción para continuar.'}
            </p>
          )}
        </form>
        {sheetEditor && (
          <div className="composer-save-status">
            {saveStatus}
            {invoice && <SalesCreationAssist data={data} currentId={id} />}
          </div>
        )}
      </div>
      {sheetEditor && optionsOpen && (
        <Modal
          title="Opciones"
          className="document-options-modal"
          onClose={() => setOptionsOpen(false)}
        >
          <fieldset
            className="editor-fieldset document-options-fields"
            disabled={busy || !!workspace.pendingFinish}
          >
            <fieldset className="document-retention-options">
              <legend>Retención</legend>
              <div>
                {(['0', '7', '15', '19'] as const).map((rate) => (
                  <label key={rate}>
                    <input
                      type="radio"
                      name="document-retention"
                      value={rate}
                      checked={Number(data.retentionRate || '0') === Number(rate)}
                      onChange={() => update({ retentionRate: rate })}
                    />
                    {rate === '0' ? 'Sin retención' : `${rate} %`}
                  </label>
                ))}
              </div>
            </fieldset>
            <details
              className="optional-details concept-discounts"
              open={discountsOpen}
              onToggle={(e) => setDiscountsOpen(e.currentTarget.open)}
            >
              <summary>Descuentos por concepto</summary>
              <div>
                {data.lines.map((item, index) => (
                  <Field
                    key={index}
                    label={item.description.trim() || `Concepto ${index + 1}`}
                    error={fieldError(`lines.${index}.discount`)}
                  >
                    <span className="concept-discount-input">
                      <input
                        {...control(`lines.${index}.discount`)}
                        aria-label={`Descuento % del concepto ${index + 1}`}
                        inputMode="decimal"
                        value={item.discount}
                        onChange={(e) => line(index, { discount: normal(e.target.value) })}
                      />
                      <span aria-hidden="true">%</span>
                    </span>
                  </Field>
                ))}
              </div>
            </details>
            {additionalFields}
          </fieldset>
        </Modal>
      )}
      {preview && <EditorDocumentPreview snapshot={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

export function DocumentTotals({
  totals,
  taxBreakdown,
  retentionRate,
}: {
  totals: { net: string; tax: string; retention: string; total: string } | null;
  taxBreakdown?: { rate: string; amount: string }[];
  retentionRate?: string;
}) {
  const totalAmount = totals ? euros(totals.total) : '—';
  const amountLength =
    totalAmount.length > 22
      ? 'amount-extra-long'
      : totalAmount.length > 18
        ? 'amount-long'
        : undefined;
  return (
    <div className="totals">
      <div>
        <span>Base imponible</span>
        <span>{totals ? euros(totals.net) : '—'}</span>
      </div>
      {taxBreakdown?.length ? (
        taxBreakdown.map(({ rate, amount }) => (
          <div key={rate}>
            <span>IVA · {rate} %</span>
            <span>{euros(amount)}</span>
          </div>
        ))
      ) : (
        <div>
          <span>IVA</span>
          <span>{totals ? euros(totals.tax) : '—'}</span>
        </div>
      )}
      {totals && Number(totals.retention) !== 0 && (
        <div>
          <span>
            Retención{retentionRate && Number(retentionRate) > 0 ? ` · ${retentionRate} %` : ''}
          </span>
          <span>−{euros(totals.retention)}</span>
        </div>
      )}
      <div className="grand-total">
        <strong>Total</strong>
        <strong className={amountLength}>{totalAmount}</strong>
      </div>
    </div>
  );
}
