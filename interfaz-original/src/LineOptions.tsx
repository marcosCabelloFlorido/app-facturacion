import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { Ellipsis, Trash2 } from 'lucide-react';
import { Field } from './components';

export function LineOptions({
  index,
  discount,
  discountVisible = true,
  error,
  disabled,
  canRemove,
  open,
  onOpenChange,
  onDiscountChange,
  onRemove,
}: {
  index: number;
  discount: string;
  discountVisible?: boolean;
  error?: string;
  disabled: boolean;
  canRemove: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscountChange: (value: string) => void;
  onRemove: () => void;
}) {
  const label = `Opciones del concepto ${index + 1}`;
  return (
    <DialogTrigger isOpen={open && !disabled} onOpenChange={onOpenChange}>
      <Button
        className="actions-trigger"
        aria-label={Number(discount) > 0 ? `${label}, descuento ${discount} %` : label}
        aria-invalid={!!error}
        data-discount-index={index}
        isDisabled={disabled}
      >
        <Ellipsis size={20} aria-hidden="true" />
      </Button>
      <Popover className="actions-popover line-options-popover" placement="bottom end" offset={4}>
        <Dialog aria-label={label} className="line-options-dialog fields-filled">
          {discountVisible && (
            <Field label="Descuento %" error={error}>
              <input
                id={`input-lines.${index}.discount`}
                aria-label={`Descuento % del concepto ${index + 1}`}
                inputMode="decimal"
                autoFocus
                disabled={disabled}
                value={discount}
                onChange={(event) => onDiscountChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpenChange(false);
                  }
                }}
              />
            </Field>
          )}
          <button
            type="button"
            className="icon-button icon-button-plain"
            aria-label="Eliminar concepto"
            title="Eliminar concepto"
            disabled={disabled || !canRemove}
            onClick={() => {
              onOpenChange(false);
              requestAnimationFrame(onRemove);
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
