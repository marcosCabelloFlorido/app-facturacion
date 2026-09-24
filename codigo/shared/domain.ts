import { ibanSchema } from './iban';
import { Decimal } from 'decimal.js';
import { z } from 'zod';

export const money = (value: Decimal.Value) =>
  new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
const decimal = (max: number, digits = 4) =>
  z
    .string()
    .regex(
      new RegExp(`^\\d{1,10}(\\.\\d{1,${digits}})?$`),
      'Introduce un número positivo con punto decimal',
    )
    .refine((v) => {
      try {
        return new Decimal(v).lte(max);
      } catch {
        return false;
      }
    }, `El máximo es ${max}`);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Fecha inválida');
export const partySchema = z.object({
  name: z.string().trim().min(2).max(160),
  taxId: z.string().trim().min(3).max(30),
  address: z.string().trim().min(3).max(300),
  email: z.union([z.email(), z.literal('')]).default(''),
});
export const lineSchema = z
  .object({
    description: z.string().trim().min(1).max(500),
    quantity: decimal(1000000).refine((v) => {
      try {
        return new Decimal(v).gt(0);
      } catch {
        return false;
      }
    }, 'La cantidad debe ser mayor que cero'),
    unitPrice: decimal(10000000),
    discount: decimal(100, 2).default('0'),
    taxRate: z.enum(['0', '4', '10', '21']),
    exemptionReason: z.string().trim().max(300).default(''),
  })
  .refine(
    (v) => v.taxRate !== '0' || v.exemptionReason.length >= 3,
    'Indica el motivo del IVA 0 %',
  );
export const documentSchema = z
  .object({
    kind: z.enum(['invoice', 'quote', 'purchase']),
    date: dateSchema,
    dueDate: dateSchema,
    operationDate: dateSchema.optional(),
    registrationDate: dateSchema.optional(),
    seriesCode: z
      .string()
      .regex(/^[A-Z][A-Z0-9]{1,11}$/)
      .nullable()
      .optional(),
    buyerFields: z
      .object({
        purchaseOrder: z.string().trim().max(120).optional(),
        costCenter: z.string().trim().max(120).optional(),
        contract: z.string().trim().max(120).optional(),
      })
      .optional(),
    party: partySchema,
    reference: z.string().trim().max(100).default(''),
    notes: z.string().trim().max(4000).default(''),
    retentionRate: z.enum(['0', '7', '15', '19']).default('0'),
    lines: z.array(lineSchema).min(1).max(100),
  })
  .refine(
    (v) => v.dueDate >= v.date,
    'El vencimiento no puede ser anterior a la fecha del documento',
  );
export const companySchema = partySchema.extend({
  iban: ibanSchema,
  phone: z.string().trim().max(40).default(''),
  website: z.string().trim().max(160).default(''),
  paymentTerms: z.string().trim().max(500).default('Pago mediante transferencia bancaria.'),
  currency: z.literal('EUR').default('EUR'),
});
export const productSchema = z.object({
  sku: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(500).default(''),
  unitPrice: decimal(10000000),
  taxRate: z.enum(['0', '4', '10', '21']),
  exemptionReason: z.string().trim().max(300).default(''),
  unit: z.string().trim().min(1).max(20).default('ud.'),
  active: z.boolean().default(true),
});
export type LineInput = z.infer<typeof lineSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type Company = z.infer<typeof companySchema>;
export type Product = z.infer<typeof productSchema> & { id: string };
export type User = {
  surname?: string;
  secondSurname?: string;
  avatar?: string | null;
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
};
export function calculate(lines: LineInput[], retentionRate = '0') {
  let net = new Decimal(0),
    tax = new Decimal(0);
  const calculated = lines.map((line) => {
    const base = new Decimal(
      money(
        new Decimal(line.quantity)
          .mul(line.unitPrice)
          .mul(new Decimal(1).minus(new Decimal(line.discount).div(100))),
      ),
    );
    const vat = new Decimal(money(base.mul(line.taxRate).div(100)));
    net = net.plus(base);
    tax = tax.plus(vat);
    return { ...line, net: money(base), tax: money(vat), total: money(base.plus(vat)) };
  });
  const retention = new Decimal(money(net.mul(retentionRate).div(100)));
  return {
    lines: calculated,
    net: money(net),
    tax: money(tax),
    retention: money(retention),
    total: money(net.plus(tax).minus(retention)),
    calculationVersion: 'line-half-up-v1',
  };
}
export const labels: Record<string, string> = {
  invoice: 'Factura',
  quote: 'Presupuesto',
  purchase: 'Compra',
  credit: 'Rectificativa',
  purchase_credit: 'Abono de proveedor',
  draft: 'Borrador',
  issued: 'Emitida',
  recorded: 'Contabilizada',
  sent: 'Confirmado',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  converted: 'Convertido',
  unpaid: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagada',
  bank: 'Transferencia',
  cash: 'Efectivo',
  card: 'Tarjeta',
  admin: 'Administrador',
  operator: 'Gestor',
  viewer: 'Consulta',
};
export type DocumentStatusChange = { from: string | null; to: string; occurred_at: string };
export type FinancialDocument = {
  id: string;
  kind: 'invoice' | 'quote' | 'purchase' | 'credit';
  status: string;
  number: string | null;
  version: number;
  date: string;
  due_date: string;
  operation_date: string | null;
  registration_date: string | null;
  series_code: string | null;
  credit_side: 'sale' | 'purchase';
  buyer_fields: { purchaseOrder?: string; costCenter?: string; contract?: string };
  party: z.infer<typeof partySchema>;
  reference: string;
  notes: string;
  retention_rate: string;
  net: string;
  tax: string;
  retention: string;
  total: string;
  balance: string;
  settled: string;
  lines: ReturnType<typeof calculate>['lines'];
  company_snapshot: Company | null;
  original_id: string | null;
  converted_id?: string | null;
  created_at: string;
  payments?: Payment[];
  status_history?: DocumentStatusChange[];
  audit?: { action: string; created_at: string; actor: string }[];
};
export type Payment = {
  credit_side?: 'sale' | 'purchase';
  id: string;
  document_id: string;
  number: string;
  party_name: string;
  party_tax_id?: string;
  kind: string;
  amount: string;
  date: string;
  method: string;
  reference: string;
  reversed_at: string | null;
  reversal_date: string | null;
};
