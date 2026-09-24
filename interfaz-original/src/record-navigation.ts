/** Keep the open document section and the return route while changing records. */
export function documentRecordHref(
  id: string,
  from: string,
  view = 'summary',
  entry?: string | null,
) {
  const params = new URLSearchParams({ from });
  if (view !== 'summary') params.set('view', view);
  if (entry) params.set('entry', entry);
  return '#document/' + id + '?' + params;
}

/** A direct or report link uses its document section, keeping any date interval. */
export function documentNavigationSource(section: string, from: string | null) {
  if (from === section || from?.startsWith(section + '?')) return from;
  const params = new URLSearchParams({ view: 'list', status: 'all' });
  const source = new URLSearchParams(from?.split('?')[1]);
  for (const key of ['from', 'to']) {
    const value = source.get(key);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) params.set(key, value);
  }
  return section + '?' + params;
}
