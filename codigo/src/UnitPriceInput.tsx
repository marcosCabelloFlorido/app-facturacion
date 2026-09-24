import { useState, type InputHTMLAttributes } from 'react';
import { formatUnitPrice } from './unit-price';

export function UnitPriceInput({ value, onFocus, onBlur, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> & { value: string }) {
  const [editing, setEditing] = useState(false);
  return <input {...props} value={editing ? value : formatUnitPrice(value)}
    onFocus={(event) => { setEditing(true); onFocus?.(event); }}
    onBlur={(event) => { setEditing(false); onBlur?.(event); }} />;
}
