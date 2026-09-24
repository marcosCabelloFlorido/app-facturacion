import { useEffect, useId, useRef, useState } from 'react';
import { Menu, MenuItem, Popover } from 'react-aria-components';
import { Check, ChevronDown } from 'lucide-react';
import { flushSync } from 'react-dom';
import type { DocumentInput } from '../shared/domain';

const rates = ['7', '15', '19'] as const;

export function RetentionControl({
  value,
  disabled,
  onChange,
}: {
  value: DocumentInput['retentionRate'];
  disabled: boolean;
  onChange: (value: DocumentInput['retentionRate']) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLLabelElement>(null);
  const toggle = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const listId = useId();
  const rateId = useId();
  const active = Number(value) > 0;

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function close() {
    flushSync(() => setOpen(false));
    (opener.current ?? toggle.current)?.focus({ preventScroll: true });
  }

  return (
    <div className="optional-controls retention-control">
      <label ref={anchor}>
        <input
          ref={toggle}
          type="checkbox"
          checked={active || open}
          disabled={disabled}
          aria-controls={open ? listId : undefined}
          aria-describedby={active ? rateId : undefined}
          onChange={(event) => {
            opener.current = event.currentTarget;
            setOpen(event.target.checked);
            if (!event.target.checked) onChange('0');
          }}
        />
        Retención
      </label>
      {active && (
        <button
          type="button"
          className="button ghost retention-rate"
          aria-label={`Cambiar retención: ${value} %`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          onClick={(event) => {
            opener.current = event.currentTarget;
            setOpen(!open);
          }}
        >
          <span id={rateId}>{value} %</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      )}
      <Popover
        className="app-select-popover retention-options"
        triggerRef={anchor}
        isOpen={open && !disabled}
        onOpenChange={setOpen}
        placement="right top"
        offset={8}
        containerPadding={12}
        shouldFlip
        isNonModal
        shouldCloseOnInteractOutside={(element) =>
          !anchor.current?.parentElement?.contains(element)
        }
      >
        <div
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape' || event.key === 'Tab') {
              if (event.key === 'Escape') event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
        >
          <Menu
            id={listId}
            className="app-select-list"
            aria-label="Retenciones disponibles"
            selectionMode="single"
            selectedKeys={active ? [value] : []}
            autoFocus={active ? true : 'first'}
            onAction={(key) => {
              onChange(key as DocumentInput['retentionRate']);
              close();
            }}
          >
            {rates.map((rate) => (
              <MenuItem key={rate} id={rate} textValue={`${rate} %`} className="app-select-option">
                {({ isSelected }) => (
                  <>
                    <span>{rate} %</span>
                    <Check
                      size={16}
                      aria-hidden="true"
                      className={isSelected ? 'app-select-check' : 'app-select-check is-hidden'}
                    />
                  </>
                )}
              </MenuItem>
            ))}
          </Menu>
        </div>
      </Popover>
    </div>
  );
}
