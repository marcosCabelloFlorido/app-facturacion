import { decodeSearch, normalizedSearchText, type SearchScope } from '../shared/advanced-search.ts';
import { AppError } from './db.ts';
export function readSearch(value: string, scope: SearchScope) {
  try {
    return decodeSearch(value, scope);
  } catch (error) {
    throw new AppError(400, (error as Error).message);
  }
}
type Columns = {
  text: string;
  date?: string;
  amount?: string;
  status?: Record<string, string>;
  direction?: string;
  method?: string;
};
export function searchWhere(
  value: string,
  scope: SearchScope,
  columns: Columns,
  params: unknown[],
) {
  const plan = readSearch(value, scope),
    f = plan?.filters || { text: value };
  const conditions: string[] = [];
  const bind = (value: unknown) => {
    params.push(value);
    return '$' + params.length;
  };
  if (f.text) conditions.push(textSearchWhere(f.text, columns.text, params));
  for (const [key, op, column] of [
    ['from', '>=', columns.date],
    ['to', '<=', columns.date],
    ['minTotal', '>=', columns.amount],
    ['maxTotal', '<=', columns.amount],
  ] as const) {
    if (f[key]) {
      if (!column) throw new AppError(400, 'Este filtro no está disponible en esta vista.');
      conditions.push(`${column} ${op} ${bind(f[key])}`);
    }
  }
  for (const key of ['direction', 'method'] as const)
    if (f[key]) {
      if (!columns[key]) throw new AppError(400, 'Este filtro no está disponible en esta vista.');
      conditions.push(`${columns[key]}=${bind(f[key])}`);
    }
  if (f.status) {
    const status = columns.status?.[f.status];
    if (!status) throw new AppError(400, 'Estado no disponible.');
    conditions.push(status);
  }
  return conditions.length ? conditions.join(' AND ') : 'true';
}
export function searchOrder(
  value: string,
  scope: SearchScope,
  normal: string,
  date: string,
  amount: string,
) {
  const sort = readSearch(value, scope)?.filters.sort;
  if (sort === 'date_asc' || sort === 'due_asc') return `${date} ASC,${normal}`;
  if (sort === 'due_desc') return `${date} DESC,${normal}`;
  if (sort === 'total_asc') return `${amount} ASC,${normal}`;
  if (sort === 'total_desc') return `${amount} DESC,${normal}`;
  return normal;
}

export function textSearchWhere(text: string, column: string, params: unknown[]) {
  const expression = `translate(lower(${column}),'áéíóúüñ','aeiouun')`;
  return (
    normalizedSearchText(text)
      .split(' ')
      .filter(Boolean)
      .map((word) => {
        params.push(word);
        return `strpos(${expression},$${params.length})>0`;
      })
      .join(' AND ') || 'true'
  );
}
