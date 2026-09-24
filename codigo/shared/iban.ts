import { z } from 'zod';

export const ibanFormatError = 'Usa el formato ES79 2100 0813 6101 2345 6789.';
export const ibanPattern = 'ES[0-9]{2}( [0-9]{4}){5}';

// Group partial and complete input without discarding account characters.
export const normalizeIban = (value: string) =>
  value.replace(/\s/g, '').toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';

// Format only: no checksum, bank or account ownership verification.
export function isIbanFormat(value: string): boolean {
  return value === '' || /^ES[0-9]{2}( [0-9]{4}){5}$/.test(value);
}

export const ibanSchema = z.string().max(29).refine(isIbanFormat, ibanFormatError).default('');
