import type { MouseEvent } from 'react';

const independentControls = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  '[contenteditable]:not([contenteditable="false"])',
  '[data-row-interactive]',
].join(',');

// Extend the existing read link to the row without replacing its keyboard behavior.
export function openTableRow(
  event: MouseEvent<HTMLTableRowElement>,
  primarySelector = 'a.document-link',
) {
  const row = event.currentTarget;
  const target = event.target;
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(target instanceof Element) ||
    !row.contains(target) ||
    target.closest(independentControls) ||
    row.ownerDocument.getSelection()?.toString()
  )
    return;

  // Clicking the original link also preserves its return-position callbacks.
  row.querySelector<HTMLAnchorElement | HTMLButtonElement>(primarySelector)?.click();
}
