import { Check, X } from 'lucide-react';

export function ToggleSwitch({
  checked,
  label,
  disabled = false,
  animatedIndicators = false,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  animatedIndicators?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      className={`toggle-switch${animatedIndicators ? ' toggle-switch-animated-indicators' : ''}`}
      aria-label={label}
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <span className="toggle-switch-track" aria-hidden="true">
        {animatedIndicators ? (
          <>
            <X className="toggle-switch-icon toggle-switch-icon-off" />
            <Check className="toggle-switch-icon toggle-switch-icon-on" />
          </>
        ) : null}
        <span className="toggle-switch-thumb" />
      </span>
    </button>
  );
}
