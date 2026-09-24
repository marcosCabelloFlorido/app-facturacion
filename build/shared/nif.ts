import { z } from 'zod';

export const nifError = 'Introduce un NIF español válido (DNI, NIE o entidad).';
export const dniLengthError = 'El DNI debe tener 8 números y una letra.';
export function exceedsDniInput(value: string): boolean {
  const match = /^(\d{8,})([A-Z]*)$/.exec(normalizeNif(value).replace(/^ES/, ''));
  return !!match && (match[1].length > 8 || match[2].length > 1);
}
export function normalizeNif(value: string): string {
  return value
    .replace(/[\s.-]/g, '')
    .toUpperCase()
    .replace(/^ES(?=[A-Z0-9]{9}$)/, '');
}

// DNI checks format only; other Spanish identifiers retain their control validation.
// DNI/NIE: Ministerio del Interior, cálculo del dígito de control del NIF-NIE.
// Entity prefixes: Orden EHA/451/2008.
export function isValidNif(value: string): boolean {
  const nif = normalizeNif(value);
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  if (/^\d{8}[A-Z]$/.test(nif)) return true;
  if (/^[XYZ]\d{7}[A-Z]$/.test(nif)) {
    const number = Number(String('XYZ'.indexOf(nif[0])) + nif.slice(1, 8));
    return nif[8] === letters[number % 23];
  }
  if (/^[KLM]\d{7}[A-Z]$/.test(nif)) return nif[8] === letters[Number(nif.slice(1, 8)) % 23];
  if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(nif)) return false;
  let sum = 0;
  for (let position = 1; position <= 7; position++) {
    const value = Number(nif[position]) * (position % 2 ? 2 : 1);
    sum += Math.floor(value / 10) + (value % 10);
  }
  const digit = (10 - (sum % 10)) % 10;
  const letter = 'JABCDEFGHI'[digit];
  if ('ABEH'.includes(nif[0])) return nif[8] === String(digit);
  if ('NPQRSW'.includes(nif[0])) return nif[8] === letter;
  return nif[8] === String(digit) || nif[8] === letter;
}

// Partial identifiers and names remain searchable; complete identifier-like input is checked.
export function invalidNifSearch(value: string): boolean {
  const normalized = normalizeNif(value);
  return (
    normalized.length >= 9 &&
    /^(?:\d{7,}|[A-Z]\d{6,}|[A-Z]{2}(?:\d|[A-Z]\d|[A-Z]{2}\d))/.test(normalized) &&
    !isValidNif(normalized)
  );
}
export const nifSchema = z
  .string()
  .trim()
  .max(30, nifError)
  .transform(normalizeNif)
  .refine(isValidNif, nifError);
