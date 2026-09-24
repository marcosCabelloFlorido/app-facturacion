import { decodeSearch, type SearchScope } from './advanced-search';

/** Count applied criteria, grouping both ends of a range as one filter. */
export function countAppliedFilters(
  filters: object,
  options: {
    defaults?: Record<string, string>;
    search?: string;
    scope?: SearchScope;
  } = {},
) {
  let applied: Record<string, unknown> = { ...filters };
  if (options.search && options.scope) {
    try {
      applied = { ...applied, ...decodeSearch(options.search, options.scope)?.filters };
    } catch {
      // An invalid search has no additional applied criteria.
    }
  }
  const defaults = options.defaults || {};
  const active = (key: string) => {
    const value = applied[key];
    return (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      value !== false &&
      value !== 'all' &&
      value !== defaults[key]
    );
  };
  const fields = ['status', 'metric', 'customer', 'type', 'direction', 'method', 'view'];
  const ranges = [
    ['from', 'to'],
    ['dueFrom', 'dueTo'],
    ['minTotal', 'maxTotal'],
  ];
  // Text search, sorting, pagination and a KPI's cutoff date are not separate filters.
  return fields.filter(active).length + ranges.filter((keys) => keys.some(active)).length;
}
