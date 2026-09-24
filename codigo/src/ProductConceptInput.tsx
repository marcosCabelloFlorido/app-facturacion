import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Product } from '../shared/domain';
import { Field } from './components';
import { formatUnitPrice } from './unit-price';
import { ProductForm } from './ProductForm';
import { useProductMenuPosition } from './useProductMenuPosition';

const searchable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');

// 06-input.md (AbsencesModule.tsx:5049–5070), with the existing ContactLookup list pattern.
export function ProductConceptInput({
  id,
  label,
  value,
  products,
  loading,
  catalogError,
  error,
  disabled,
  multiline = false,
  labelVisible = false,
  placeholder = 'Producto o servicio',
  onChange,
  onSelect,
  onCreated,
}: {
  id: string;
  label: string;
  value: string;
  products: Product[];
  loading: boolean;
  catalogError: string;
  error?: string;
  disabled: boolean;
  multiline?: boolean;
  labelVisible?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (product: Product) => void;
  onCreated: (product: Product) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [creating, setCreating] = useState(false);
  const restoringFocus = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listId = useId();
  const matches = products.filter(
    (product) =>
      product.active &&
      searchable(`${product.name} ${product.description} ${product.sku}`).includes(
        searchable(query.trim()),
      ),
  );
  const expanded = open && !disabled && !creating;
  useProductMenuPosition(root, menu, expanded);
  const TextControl = multiline ? 'textarea' : 'input';

  function showAll() {
    if (open || disabled || creating || restoringFocus.current) return;
    setQuery('');
    setActive(-1);
    setOpen(true);
  }
  function choose(product: Product) {
    onSelect(product);
    setOpen(false);
    setActive(-1);
  }
  function closeCreation() {
    setCreating(false);
    setOpen(false);
    requestAnimationFrame(() => {
      restoringFocus.current = true;
      root.current
        ?.querySelector<HTMLInputElement | HTMLTextAreaElement>('[role="combobox"]')
        ?.focus({ preventScroll: true });
      restoringFocus.current = false;
    });
  }
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [expanded]);
  useEffect(() => {
    if (!expanded || active < 0) return;
    const option = document.getElementById(`${listId}-${active}`);
    const list = option?.parentElement;
    if (!option || !list) return;
    const item = option.getBoundingClientRect();
    const bounds = list.getBoundingClientRect();
    if (item.top < bounds.top) list.scrollTop -= bounds.top - item.top;
    else if (item.bottom > bounds.bottom) list.scrollTop += item.bottom - bounds.bottom;
  }, [active, expanded, listId]);

  useLayoutEffect(() => {
    if (!multiline) return;
    const input = root.current?.querySelector('textarea');
    if (!input) return;
    const resize = () => {
      input.style.height = '0px';
      input.style.height = input.scrollHeight + input.offsetHeight - input.clientHeight + 'px';
    };
    resize();
    let width = input.clientWidth;
    const observer = new ResizeObserver(() => {
      if (input.clientWidth !== width) {
        width = input.clientWidth;
        resize();
      }
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [value, multiline]);

  return (
    <div
      className="product-concept-input"
      ref={root}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Field
        label={label}
        className={labelVisible ? undefined : 'field-label-hidden'}
        error={error}
      >
        <div className="product-concept-control">
          <TextControl
            rows={multiline ? 1 : undefined}
            id={id}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={
              expanded && active >= 0 && matches[active] ? `${listId}-${active}` : undefined
            }
            onFocus={showAll}
            onClick={showAll}
            onChange={(event) => {
              onChange(event.target.value);
              setQuery(event.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Escape' && expanded) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
              } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (!expanded) {
                  showAll();
                  return;
                }
                if (matches.length)
                  setActive((current) =>
                    event.key === 'ArrowDown'
                      ? (current + 1) % matches.length
                      : (current <= 0 ? matches.length : current) - 1,
                  );
              } else if (event.key === 'Enter' && expanded) {
                event.preventDefault();
                if (active >= 0 && matches[active]) choose(matches[active]);
                else setOpen(false);
              }
            }}
          />
          <ChevronDown size={16} aria-hidden="true" />
        </div>
      </Field>
      {expanded && (
        <div className="product-concept-menu" ref={menu}>
          <button
            type="button"
            className="button ghost product-concept-create"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (disabled) return;
              setOpen(false);
              setActive(-1);
              setCreating(true);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Crear producto o servicio
          </button>
          <ul id={listId} role="listbox" aria-label={`Productos para ${label.toLowerCase()}`}>
            {matches.map((product, index) => (
              <li
                key={product.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={active === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(product)}
              >
                <span className="product-concept-name">{product.name}</span>
                <span
                  className="product-concept-price"
                  aria-label={`Precio sin IVA: ${formatUnitPrice(product.unitPrice)} €`}
                >
                  {formatUnitPrice(product.unitPrice)} €
                </span>
              </li>
            ))}
          </ul>
          {!matches.length && (
            <p role="status">
              {loading
                ? 'Cargando catálogo…'
                : catalogError
                  ? 'No se pudo cargar el catálogo. Puedes escribir el concepto.'
                  : 'Sin productos. Puedes escribir el concepto.'}
            </p>
          )}
        </div>
      )}
      {creating && (
        <ProductForm
          initial={{ name: value.trim().slice(0, 200), description: value.trim() }}
          lookupCreation
          onClose={closeCreation}
          onSaved={(product) => {
            onCreated(product);
            choose(product);
            closeCreation();
          }}
        />
      )}
    </div>
  );
}
