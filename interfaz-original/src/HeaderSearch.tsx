import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { SearchPanel, useSearchPanel } from './SearchPanel';
import { today } from './api';
import {
  decodeSearch,
  encodeSearch,
  interpretListSearch,
  searchDisplay,
  searchPlanLabels,
  textSearchPlan,
  type SearchPlan,
  type SearchScope,
} from '../shared/advanced-search';

export function useHeaderSearch(value: string) {
  const panel = useSearchPanel();
  const { open, openSearch, closeSearch } = panel;
  const [text, setText] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  const show = useCallback(() => {
    setText(value);
    openSearch();
  }, [value, openSearch]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== 'k'
      )
        return;
      if (
        !open &&
        document.querySelector(
          'dialog[open], [role="dialog"]:not([aria-hidden="true"]):not([inert])',
        )
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (open) closeSearch();
      else show();
    };
    window.addEventListener('keydown', listener, true);
    return () => window.removeEventListener('keydown', listener, true);
  }, [open, show, closeSearch]);
  return { ...panel, text, setText, input, show };
}

export function HeaderSearchField({
  state,
  label,
  placeholder,
  inputLabel = label,
  value,
  preview,
  onSubmit,
  onClear,
}: {
  state: ReturnType<typeof useHeaderSearch>;
  label: string;
  placeholder: string;
  inputLabel?: string;
  value: string;
  preview?: ReactNode;
  onSubmit: () => boolean | void;
  onClear: () => void;
}) {
  const { open, closing, closeSearch, text, setText, input, show } = state;
  const previewId = useId();
  const submit = () => {
    if (!closing && onSubmit() !== false) closeSearch();
  };
  return (
    <>
      <button
        type="button"
        className="command-trigger"
        aria-label={label}
        title={value ? `${label} · ${value}` : label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <Search size={16} aria-hidden="true" />
        <span>Buscar</span>
      </button>
      {open && (
        <SearchPanel title={label} closing={closing} onClose={closeSearch}>
          <form
            className="command-search"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div role="search" className="search-field">
              <Search size={18} aria-hidden="true" />
              <input
                ref={input}
                aria-label={inputLabel}
                aria-describedby={preview ? previewId : undefined}
                placeholder={placeholder}
                autoComplete="off"
                enterKeyHint="search"
                maxLength={150}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (!event.nativeEvent.isComposing) submit();
                }}
              />
            </div>
            {(preview || !!value) && (
              <div className="command-results">
                {preview && <div id={previewId}>{preview}</div>}
                {!!value && (
                  <button type="button" disabled={closing} onClick={() => closeSearch(onClear)}>
                    <span>Quitar búsqueda</span>
                  </button>
                )}
              </div>
            )}
          </form>
        </SearchPanel>
      )}
    </>
  );
}

export function HeaderListSearch({
  scope,
  label,
  placeholder,
  value,
  onApply,
  onClear,
}: {
  scope: SearchScope;
  label: string;
  placeholder: string;
  value: string;
  onApply: (value: string) => void;
  onClear: () => void;
}) {
  const state = useHeaderSearch(searchDisplay(value));
  const { text, closeSearch } = state;
  const interpreted = interpretListSearch(text, scope, today());
  let saved: SearchPlan | null = null;
  let savedError = '';
  try {
    saved = decodeSearch(value, scope);
  } catch (error) {
    savedError = (error as Error).message;
  }
  const applied = !!saved && saved.phrase === text;
  const apply = (asText = false) => {
    if (applied && !asText) return true;
    if (!asText && interpreted.kind === 'error') return false;
    const next = !text.trim()
      ? ''
      : asText || interpreted.kind === 'literal'
        ? textSearchPlan(text, scope)
        : encodeSearch(interpreted.plan);
    closeSearch(() => onApply(next));
    return true;
  };
  const preview =
    savedError || (text.trim() && (applied || interpreted.kind !== 'literal')) ? (
      <div className="sales-search-preview">
        {savedError && <p role="alert">{savedError}</p>}
        {interpreted.kind === 'error' && !applied && (
          <p role="alert">
            Búsqueda no aplicada. {interpreted.error} Se mantienen los resultados anteriores.
          </p>
        )}
        {(applied || interpreted.kind === 'filters') && (
          <p role="status">
            {(applied ? searchPlanLabels(saved!) : interpreted.labels).join(' · ')}
          </p>
        )}
        {!applied && text.trim() && (
          <button type="button" className="quiet-link" onClick={() => apply(true)}>
            Buscar como texto
          </button>
        )}
      </div>
    ) : null;
  return (
    <HeaderSearchField
      state={state}
      label={label}
      placeholder={placeholder}
      value={searchDisplay(value)}
      preview={preview}
      onSubmit={() => apply()}
      onClear={onClear}
    />
  );
}
