import { labels, type FinancialDocument } from '../shared/domain';

const documentRoute =
  /^document\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\?[^#]*)?$/i;

export function documentSettingsHref(
  section: 'templates' | 'mail',
  doc: { id: string; kind: FinancialDocument['kind'] },
  route: string,
): string {
  const params = new URLSearchParams(route.split('?')[1]);
  if (params.get('view') === 'delivery') params.set('view', 'summary');
  if (section === 'mail') params.set('delivery', 'mail');
  else params.delete('delivery');
  return (
    '#settings/' +
    section +
    '?' +
    new URLSearchParams({
      returnTo: 'document/' + doc.id + '?' + params,
      documentKind: doc.kind,
    })
  );
}

export function settingsDocumentBackLink(route: string) {
  const params = new URLSearchParams(route.split('?')[1]);
  const returnTo = params.get('returnTo');
  if (!returnTo || !documentRoute.test(returnTo)) return undefined;
  const kind = params.get('documentKind');
  const label =
    kind === 'invoice' || kind === 'quote' || kind === 'purchase' || kind === 'credit'
      ? labels[kind]
      : 'Documento';
  return { href: '#' + returnTo, label };
}
