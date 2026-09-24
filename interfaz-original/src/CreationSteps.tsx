import { Check } from 'lucide-react';

export function CreationSteps({
  names,
  step,
  availableStep,
  disabled = false,
  onChange,
  label = 'Pasos del documento',
}: {
  names: string[];
  step: number;
  availableStep: number;
  disabled?: boolean;
  onChange: (step: number) => void;
  label?: string;
}) {
  return (
    <nav className="editor-steps" aria-label={label}>
      {names.map((name, index) => (
        <button
          key={name}
          type="button"
          disabled={disabled || index > availableStep}
          aria-current={index === step ? 'step' : undefined}
          onClick={() => onChange(index)}
        >
          <span aria-hidden="true">{index < step ? <Check size={15} /> : index + 1}</span>
          {name}
        </button>
      ))}
    </nav>
  );
}
