import { useId } from 'react';

export function QuantityInput({
  id,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = useId();
  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      <label className="field-label" htmlFor={id}>
        Cantidad
      </label>
      <div className="quantity-control">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error && (
        <small id={errorId} className="field-error-message" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
