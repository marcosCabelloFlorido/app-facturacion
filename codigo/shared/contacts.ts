import { z } from 'zod';
import { nifSchema, normalizeNif } from './nif.ts';
import { partySchema, type DocumentInput, type FinancialDocument, type Payment } from './domain.ts';

export const normalizeTaxId = normalizeNif;
export const canSearchContacts = (value: string) => normalizeTaxId(value).length >= 3;
export const contactTaxIdSchema = z
  .string()
  .trim()
  .max(30)
  .transform(normalizeTaxId)
  .pipe(z.string().min(3).max(30));
export const contactAddressSchema = z.object({
  line1: z.string().trim().min(3, 'Completa la calle y el número.').max(160),
  line2: z.string().trim().max(100).default(''),
  postalCode: z.string().trim().max(20).default(''),
  city: z.string().trim().min(1, 'Completa la localidad.').max(80),
  region: z.string().trim().max(80).default(''),
  country: z.string().trim().max(60).default('España'),
});
export type ContactAddress = z.infer<typeof contactAddressSchema>;
export function contactAddressLines(address: ContactAddress): string[] {
  return [
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    [
      address.region.toLocaleLowerCase('es') === address.city.toLocaleLowerCase('es')
        ? ''
        : address.region,
      address.country,
    ]
      .filter(Boolean)
      .join(' · '),
  ].filter(Boolean);
}
export const contactPersonSchema = z.object({
  name: z.string().trim().min(2, 'Completa el nombre.').max(160),
  role: z.string().trim().max(100).default(''),
  email: z
    .string()
    .trim()
    .pipe(z.union([z.email(), z.literal('')]))
    .default(''),
  phone: z.string().trim().max(40).default(''),
});
export const contactSchema = partySchema
  .extend({
    firstSurname: z.string().trim().max(160).optional(),
    secondSurname: z.string().trim().max(160).optional(),
    taxId: nifSchema,
    email: z
      .string()
      .trim()
      .pipe(z.union([z.email(), z.literal('')]))
      .default(''),
    phone: z.string().trim().max(40).default(''),
    notes: z.string().trim().max(2000).default(''),
    type: z.enum(['customer', 'supplier', 'both']).default('customer'),
    addressDetails: contactAddressSchema.optional(),
    contactName: z.string().trim().max(160).optional(),
    people: z.array(contactPersonSchema).max(20).optional(),
    addresses: z
      .array(
        contactAddressSchema.extend({
          label: z.string().trim().min(1, 'Pon un nombre a esta dirección.').max(80),
          purpose: z.enum(['delivery', 'billing', 'office']).default('delivery'),
        }),
      )
      .max(20)
      .optional(),
    paymentDays: z.number().int().min(0).max(365).optional(),
    quoteValidityDays: z.number().int().min(0).max(365).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.addressDetails && contactAddressLines(value.addressDetails).join(', ').length > 300)
      ctx.addIssue({
        code: 'custom',
        path: ['addressDetails'],
        message: 'La dirección completa admite hasta 300 caracteres.',
      });
  })
  .transform((value) =>
    value.addressDetails
      ? { ...value, address: contactAddressLines(value.addressDetails).join(', ') }
      : value,
  );
export type ContactInput = z.infer<typeof contactSchema>;
export type Contact = ContactInput & {
  id: string;
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};
export type ContactPage = {
  rows: (Contact & { balances?: import('./contact-tools').ContactBalances })[];
  count: number;
  page: number;
  pageSize: number;
};
export const contactActivityViews = [
  'sales_net',
  'purchases_net',
  'receivable',
  'payable',
  'documents',
  'invoice',
  'quote',
  'quotes_pending',
  'purchase',
  'credit',
  'payments',
  'funds',
] as const;
export type ContactActivityView = (typeof contactActivityViews)[number];
export type ContactDocument = Pick<
  FinancialDocument,
  | 'id'
  | 'kind'
  | 'status'
  | 'number'
  | 'date'
  | 'due_date'
  | 'credit_side'
  | 'reference'
  | 'total'
  | 'balance'
> & {
  description: string;
  convertedInvoice: { id: string; number: string | null; status: string } | null;
};
export type ContactFund = {
  id: string;
  direction: 'receipt' | 'payment';
  amount: string;
  available: string;
  date: string;
  method: string;
  reference: string;
};
export type ContactActivity = {
  summary: {
    sales: string;
    purchases: string;
    receivable: string;
    payable: string;
    quotes: number;
    pendingQuotes: number;
  };
  documents: ContactDocument[];
  payments: Payment[];
  funds: ContactFund[];
  count: number;
  page: number;
  pageSize: number;
};
export const contactLabels = {
  customer: 'Cliente',
  supplier: 'Proveedor',
  both: 'Cliente y proveedor',
};
// Copy only document fields. Contact edits must never rewrite saved document snapshots.
export function contactParty(
  contact: Pick<ContactInput, 'name' | 'taxId' | 'address' | 'email'>,
): DocumentInput['party'] {
  return {
    name: contact.name,
    taxId: contact.taxId,
    address: contact.address,
    email: contact.email,
  };
}
