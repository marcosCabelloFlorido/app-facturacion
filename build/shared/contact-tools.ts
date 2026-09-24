import { z } from 'zod';
export const contactSortOptions = [
  ['name_asc', 'Nombre: A a Z'],
  ['name_desc', 'Nombre: Z a A'],
  ['receivable_desc', 'Mayor importe por cobrar'],
  ['payable_desc', 'Mayor importe por pagar'],
  ['due_asc', 'Vencimiento más próximo'],
  ['activity_desc', 'Actividad más reciente'],
] as const;
export const contactSortSchema = z
  .enum(['name_asc', 'name_desc', 'receivable_desc', 'payable_desc', 'due_asc', 'activity_desc'])
  .default('name_asc');
export type ContactSort = z.infer<typeof contactSortSchema>;
export type ContactBalances = {
  receivable: string;
  payable: string;
  overdue_receivable: string;
  overdue_payable: string;
  next_due: string | null;
  last_activity: string | null;
};
export const contactStatementQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    format: z.enum(['pdf', 'xlsx']).default('pdf'),
  })
  .refine((q) => q.from <= q.to, {
    path: ['to'],
    message: 'La fecha final debe ser igual o posterior a la inicial.',
  });
