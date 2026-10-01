const pageAreas = [
  'overview',
  'sales',
  'quotes',
  'purchases',
  'payments',
  'contacts',
  'catalog',
  'accounting',
  'templates',
  'imports',
];

/** Sección principal de la navegación a la que pertenece una ruta. */
export function areaForRoute(route: string, documentSection = ''): string {
  const [page, id] = route.split('?')[0].split('/');
  if (page === 'document' || page === 'edit') return documentSection || 'sales';
  if (page === 'new') return id === 'quote' ? 'quotes' : id === 'purchase' ? 'purchases' : 'sales';
  if (page === 'settings') {
    if (id === 'imports') return 'imports';
    if (['templates', 'mail', 'portal'].includes(id)) return 'templates';
    return 'settings';
  }
  if (page === 'audit') return 'settings';
  return pageAreas.includes(page) ? page : 'overview';
}
