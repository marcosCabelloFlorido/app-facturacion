import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Tooltip,
  TooltipTrigger,
} from 'react-aria-components';
import { Ellipsis, type LucideIcon } from 'lucide-react';

export type PageAction = {
  label: string;
  /** Related actions share one section in menus with five or more visible options. */
  group?: string;
  icon: LucideIcon;
  href?: string;
  target?: '_blank';
  download?: string;
  onAction?: () => void;
  disabled?: boolean;
  title?: string;
};
export type PageActions = (PageAction | false | null | undefined)[];

/** One consistent, keyboard-accessible place for contextual operations. */
export function ActionsMenu({
  items,
  label,
  light = false,
  triggerLabel,
  triggerRef,
}: {
  items: PageActions;
  label: string;
  light?: boolean;
  triggerLabel?: string;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const localTrigger = useRef<HTMLButtonElement>(null);
  const trigger = triggerRef || localTrigger;
  const [portalContainer, setPortalContainer] = useState<HTMLElement>();
  useEffect(() => {
    // Keep menu actions within the native dialog's interactive layer.
    const dialog = trigger.current?.closest('dialog');
    if (!dialog) return;
    const layer = document.createElement('div');
    layer.className = 'app-select-layer';
    dialog.append(layer);
    setPortalContainer(layer);
    return () => layer.remove();
  }, [trigger]);
  const actions = items.filter((item): item is PageAction => !!item);
  const sections: { id: string; label: string; items: PageAction[] }[] = [];
  for (const item of actions) {
    const group = actions.length >= 5 ? item.group || 'Acciones' : 'Acciones';
    const section = sections.find((entry) => entry.label === group);
    if (section) section.items.push(item);
    else sections.push({ id: 'group:' + group, label: group, items: [item] });
  }
  if (!actions.length) return null;
  return (
    <MenuTrigger isOpen={open} onOpenChange={setOpen}>
      <TooltipTrigger delay={500}>
        <Button
          ref={trigger}
          className={triggerLabel ? 'button' : `actions-trigger${light ? ' on-dark' : ''}`}
          aria-label={label}
        >
          {triggerLabel}
          <Ellipsis size={22} aria-hidden="true" />
        </Button>
        <Tooltip
          className="ui-tooltip"
          placement="bottom"
          UNSTABLE_portalContainer={portalContainer}
        >
          {label}
        </Tooltip>
      </TooltipTrigger>
      <Popover
        className="actions-popover"
        placement="bottom end"
        offset={8}
        UNSTABLE_portalContainer={portalContainer}
      >
        <Menu className="actions-menu" aria-label={label} items={sections}>
          {(section) => (
            <MenuSection
              id={section.id}
              aria-label={section.label}
              className="actions-menu-section"
              items={section.items}
            >
              {(item) => (
                <MenuItem
                  id={item.label}
                  textValue={item.label}
                  className="actions-menu-item"
                  href={item.href}
                  download={item.download}
                  target={item.target}
                  rel={item.target ? 'noreferrer' : undefined}
                  isDisabled={item.disabled}
                  aria-label={item.title ? item.label + '. ' + item.title : undefined}
                  onAction={
                    item.onAction
                      ? () => {
                          setOpen(false);
                          // Restore focus to the trigger before a following dialog takes it.
                          requestAnimationFrame(() => {
                            trigger.current?.focus({ preventScroll: true });
                            item.onAction?.();
                          });
                        }
                      : undefined
                  }
                >
                  <item.icon size={17} aria-hidden="true" />
                  <span title={item.title}>{item.label}</span>
                </MenuItem>
              )}
            </MenuSection>
          )}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
