import { Select } from './Select';
import { useRef } from 'react';
import { transitionContent } from './navigation-motion';

// FUENTE: kit-design-v2/components/04-section-layout.md;
// EmployeeModuleLayout.tsx:296–446. Mismo contenido en aside y selector móvil.
export function SectionNavigation({
  label,
  items,
  value,
  onChange,
  routeDriven = false,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  routeDriven?: boolean;
}) {
  const nav = useRef<HTMLElement>(null);
  const select = (next: string) => {
    if (next === value) return;
    if (routeDriven) return onChange(next);
    transitionContent(() => onChange(next), {
      target: () => nav.current?.nextElementSibling as HTMLElement | null,
      direction:
        items.findIndex((item) => item.value === next) >
        items.findIndex((item) => item.value === value)
          ? 'forward'
          : 'back',
      scope: 'section',
    });
  };
  return (
    <nav ref={nav} className="section-navigation" aria-label={label}>
      <div className="section-navigation-desktop">
        {items.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-current={item.value === value ? 'page' : undefined}
            onClick={() => select(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="section-navigation-mobile">
        <Select aria-label={label} value={value} onChange={(event) => select(event.target.value)}>
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
    </nav>
  );
}
