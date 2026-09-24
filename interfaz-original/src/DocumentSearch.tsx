import { navigate } from './api';
import { HeaderSearchField, useHeaderSearch } from './HeaderSearch';
import { useSalesSearch } from './useSalesSearch';
import { salesQueryParams, type DocumentQuery } from '../shared/sales-tools';
import type { SalesSearchFilters } from '../shared/sales-search';

export function DocumentSearch({
  kind = 'sales',
  value = '',
  applied,
  workspaceId,
}: {
  kind?: 'sales' | 'quote' | 'purchase';
  value?: string;
  applied?: Partial<DocumentQuery>;
  workspaceId?: string;
}) {
  const state = useHeaderSearch(value);
  const { text, open, closeSearch } = state;
  const section = kind === 'quote' ? 'quotes' : kind === 'purchase' ? 'purchases' : 'sales';
  const label =
    kind === 'quote'
      ? 'Buscar presupuestos'
      : kind === 'purchase'
        ? 'Buscar compras y gastos'
        : 'Buscar facturas';
  const apply = (filters: SalesSearchFilters, phrase: string, literal = false) => {
    const params = salesQueryParams({ kind, ...filters, search: literal ? phrase : '', page: 1 });
    params.set('view', 'list');
    if (!literal && phrase.trim()) params.set('phrase', phrase);
    closeSearch(() => navigate(section + '?' + params));
  };
  const search = useSalesSearch({
    enabled: true,
    kind,
    open,
    text,
    workspaceId,
    applied: value === text ? applied : undefined,
    literalApplied: !!value && value === text && !applied,
    showApplyAction: false,
    onApply: apply,
    onLiteral: (phrase) => apply({ status: 'all', sort: 'default' }, phrase, true),
  });
  return (
    <HeaderSearchField
      state={state}
      label={label}
      placeholder="NIF, nombre o petición…"
      inputLabel="NIF, nombre o petición"
      value={value}
      preview={text.trim() ? search.preview : null}
      onSubmit={search.submit}
      onClear={() => navigate(section + '?view=list&status=all')}
    />
  );
}
