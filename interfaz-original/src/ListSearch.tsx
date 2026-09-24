import {
  decodeSearch,
  encodeSearch,
  interpretListSearch,
  searchDisplay,
  searchExamples,
  searchPlanLabels,
  textSearchPlan,
  type SearchPlan,
  type SearchScope,
} from '../shared/advanced-search';
import { today } from './api';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Tooltip, TooltipTrigger } from 'react-aria-components';

// FUENTE: 08-toolbar.md, AbsencesModule.tsx:2910–2911; adaptación aprobada en ventas.
export function ListToolbar({
  label,
  filterLabel,
  searchLabel,
  filterCount,
  filtersOpen,
  onOpenFilters,
  disclosure,
  search,
  tools,
  context,
  searchEnabled = true,
}: {
  searchEnabled?: boolean;
  tools?: ReactNode;
  context?: ReactNode;
  label: string;
  filterLabel: string;
  searchLabel?: string;
  filterCount: number;
  filtersOpen: boolean;
  onOpenFilters: () => void;
  disclosure?: ReturnType<typeof useListSearch>;
  search?: Omit<ListSearchProps, 'disclosure' | 'label' | 'inline'>;
}) {
  const filterDescription =
    filterCount > 0
      ? `${filterLabel}, ${filterCount} ${filterCount === 1 ? 'filtro aplicado' : 'filtros aplicados'}`
      : filterLabel;
  return (
    <div className="module-list-toolbar" role="group" aria-label={label}>
      {context}
      {tools}
      <TooltipTrigger delay={400} isDisabled={filtersOpen}>
        <Button
          className="list-tool-button list-filter-button"
          aria-label={filterDescription}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          data-active={filterCount > 0 || undefined}
          onPress={onOpenFilters}
        >
          <SlidersHorizontal size={18} strokeWidth={1.4} aria-hidden="true" />
          {filterCount > 0 && (
            <span className="list-tool-count" aria-hidden="true">
              {filterCount}
            </span>
          )}
        </Button>
        <Tooltip className="ui-tooltip" placement="bottom end">
          {filterDescription}
        </Tooltip>
      </TooltipTrigger>
      {searchEnabled && search && disclosure && searchLabel && (
        <ListSearch {...search} disclosure={disclosure} label={searchLabel} inline />
      )}
    </div>
  );
}

export function useListSearch(initialOpen = false, onOpen?: () => void, keyboardEnabled = true) {
  const [open, setOpen] = useState(initialOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const openSearch = useCallback(() => {
    setOpen(true);
    onOpen?.();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [onOpen]);
  const closeSearch = () => {
    setOpen(false);
    requestAnimationFrame(() => menuRef.current?.focus());
  };
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!keyboardEnabled) return;
    const listener = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k' &&
        !document.querySelector(
          'dialog[open], [role="dialog"]:not([aria-hidden="true"]):not([inert])',
        )
      ) {
        if (event.isComposing || (!inputRef.current && !menuRef.current)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openSearch();
      }
    };
    window.addEventListener('keydown', listener, true);
    return () => window.removeEventListener('keydown', listener, true);
  }, [openSearch, keyboardEnabled]);
  return { open, openSearch, closeSearch, inputRef, menuRef, id };
}

type ListSearchProps = {
  scope?: SearchScope;
  onAdvanced?: (value: string) => void;
  disclosure: ReturnType<typeof useListSearch>;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit?: (value: string) => unknown;
  preview?: ReactNode;
  keepOpenOnSubmit?: boolean;
  inline?: boolean;
};

function PlainListSearch({
  disclosure,
  label,
  placeholder,
  value,
  onChange,
  onClear,
  onSubmit,
  inline = false,
  preview,
  keepOpenOnSubmit = false,
}: ListSearchProps) {
  if (!inline && !disclosure.open) return null;
  const close = () => {
    onClear();
    disclosure.closeSearch();
  };
  return (
    <div
      className={`list-search${inline ? ' list-search-inline' : ''}`}
      data-open={disclosure.open || undefined}
      data-preview={!!preview || undefined}
      data-extended={keepOpenOnSubmit || undefined}
    >
      {inline && (
        <button
          ref={disclosure.menuRef}
          type="button"
          className="list-tool-button list-search-trigger"
          aria-label={value ? `${label}, búsqueda activa: ${value}` : label}
          title={value ? `Editar búsqueda: ${value}` : label}
          aria-expanded={disclosure.open}
          aria-controls={disclosure.id}
          data-active={!!value || undefined}
          inert={disclosure.open}
          onClick={disclosure.openSearch}
        >
          <Search size={15} strokeWidth={1.4} aria-hidden="true" />
          <span className="list-tool-label">Buscar</span>
          {!!value && <span className="list-tool-dot" aria-hidden="true" />}
        </button>
      )}
      <div
        className="search-field list-search-field"
        id={disclosure.id}
        role="search"
        aria-label={label}
        inert={!disclosure.open}
      >
        <Search size={15} strokeWidth={1.4} aria-hidden="true" />
        <input
          ref={disclosure.inputRef}
          aria-label={label}
          autoComplete="off"
          aria-describedby={preview ? disclosure.id + '-preview' : undefined}
          enterKeyHint="search"
          maxLength={150}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Enter') {
              event.preventDefault();
              const applied = onSubmit?.(value);
              if (applied !== false && !keepOpenOnSubmit) disclosure.closeSearch();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
          }}
        />
        <button
          type="button"
          className="icon-button"
          aria-label="Cerrar y limpiar búsqueda"
          title="Cerrar y limpiar búsqueda"
          onClick={close}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {disclosure.open && preview && <div id={disclosure.id + '-preview'}>{preview}</div>}
    </div>
  );
}

export function ListSearch(props: ListSearchProps) {
  return props.scope ? (
    <AdvancedListSearch {...props} scope={props.scope} />
  ) : (
    PlainListSearch(props)
  );
}
function AdvancedListSearch(props: ListSearchProps & { scope: SearchScope }) {
  const [text, setText] = useState(() => searchDisplay(props.value));
  useEffect(() => {
    setText(searchDisplay(props.value));
  }, [props.value, props.scope]);
  const preview = interpretListSearch(text, props.scope, today());
  let saved: SearchPlan | null = null;
  let savedError = '';
  try {
    saved = decodeSearch(props.value, props.scope);
  } catch (error) {
    savedError = (error as Error).message;
  }
  const applied = !!saved && saved.phrase === text;
  const apply = (asText = false) => {
    if (applied && !asText) return true;
    if (!asText && preview.kind === 'error') return false;
    const value = !text.trim()
      ? ''
      : asText || preview.kind === 'literal'
        ? textSearchPlan(text, props.scope)
        : encodeSearch(preview.plan);
    if (props.onAdvanced) props.onAdvanced(value);
    else {
      props.onChange(value);
      props.onSubmit?.(value);
    }
    return true;
  };
  return (
    <PlainListSearch
      {...props}
      value={text}
      onChange={setText}
      keepOpenOnSubmit
      onSubmit={() => apply()}
      onClear={() => {
        setText('');
        props.onClear();
      }}
      preview={
        <div className="sales-search-preview">
          {savedError && <p role="alert">{savedError}</p>}
          {!text.trim() ? (
            <p>Ej.: {searchExamples[props.scope]}</p>
          ) : (
            <>
              {preview.kind === 'error' && !applied && (
                <p role="alert">
                  Búsqueda no aplicada. {preview.error} Se mantienen los resultados anteriores.
                </p>
              )}
              {(applied || preview.kind === 'filters') && (
                <p role="status">
                  {(applied ? searchPlanLabels(saved!) : preview.labels).join(' · ')}
                </p>
              )}
              <div className="sales-search-preview-actions">
                {!applied && preview.kind !== 'error' && (
                  <button type="button" className="quiet-link" onClick={() => apply()}>
                    Aplicar búsqueda
                  </button>
                )}
                <button type="button" className="quiet-link" onClick={() => apply(true)}>
                  Buscar como texto
                </button>
              </div>
            </>
          )}
        </div>
      }
    />
  );
}
