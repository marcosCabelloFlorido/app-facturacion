import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// Kit: panel lateral y secciones opcionales, con apertura por teclado.
export function FilterSection({
  title,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      className="optional-details filter-section"
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary>
        <span>{title}</span>
        <ChevronDown size={16} strokeWidth={1.6} aria-hidden="true" />
      </summary>
      <div className="filter-section-content">{children}</div>
    </details>
  );
}
