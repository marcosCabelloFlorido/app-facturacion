import type { ReactNode } from 'react';
import { Button, Disclosure, DisclosureGroup, DisclosurePanel } from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import './accordion.css';

export const Accordion = DisclosureGroup;

export function AccordionItem({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Disclosure id={id} className="ui-accordion-item">
      <h2 className="ui-accordion-heading">
        <Button slot="trigger" className="ui-accordion-trigger">
          <span>{title}</span>
          <ChevronDown size={16} aria-hidden="true" className="ui-accordion-chevron" />
        </Button>
      </h2>
      <DisclosurePanel className="ui-accordion-panel" role="region">
        <div className="ui-accordion-body">
          {action && <div className="ui-accordion-actions">{action}</div>}
          <div className="ui-accordion-content">{children}</div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
