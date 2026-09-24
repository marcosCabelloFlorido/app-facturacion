import { documentReturnRoute } from '../shared/due-dates';
import { contactTaxIdSchema } from '../shared/contacts';

// Documents keep a fiscal snapshot, so resolve the contact by its exact tax ID.
export function contactDetailHref(taxId: string, from?: string): string | undefined {
  const parsed = contactTaxIdSchema.safeParse(taxId);
  if (!parsed.success) return undefined;
  return (
    '#contacts?' +
    new URLSearchParams({
      contact: 'tax:' + parsed.data,
      status: 'all',
      kpis: 'hidden',
      ...(from && documentReturnRoute(from, '') ? { from } : {}),
    }).toString()
  );
}
