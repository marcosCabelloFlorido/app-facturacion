import { Decimal } from 'decimal.js';

export function paymentProjection(balance: string, amount: string) {
  const normalized = amount.trim().replace(',', '.');
  if (!/^\d{1,18}(\.\d{1,2})?$/.test(normalized))
    return { error: 'Introduce un importe con hasta 2 decimales.', remaining: null };
  try {
    const value = new Decimal(normalized),
      pending = new Decimal(balance);
    if (!value.isFinite() || !pending.isFinite() || value.lte(0))
      return { error: 'El importe debe ser mayor que cero.', remaining: null };
    if (value.gt(pending))
      return { error: 'El importe supera el saldo pendiente.', remaining: null };
    return { error: '', remaining: pending.minus(value).toFixed(2) };
  } catch {
    return { error: 'Revisa el importe.', remaining: null };
  }
}
