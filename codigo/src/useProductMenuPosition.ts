import { useLayoutEffect, type RefObject } from 'react';

/** Fit the catalog within the visible paper, including the sticky document header. */
export function useProductMenuPosition(
  root: RefObject<HTMLDivElement | null>,
  menu: RefObject<HTMLDivElement | null>,
  expanded: boolean,
) {
  useLayoutEffect(() => {
    const anchor = root.current;
    const popup = menu.current;
    if (!expanded || !anchor || !popup) return;
    const paper = anchor.closest('.document-sheet');
    const heading = anchor.closest('main')?.querySelector(':scope > .page-heading');
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const bounds = paper?.getBoundingClientRect();
      const style = getComputedStyle(popup);
      const margin = parseFloat(style.getPropertyValue('--space-3')) || 12;
      const gap = parseFloat(style.getPropertyValue('--space-1')) || 4;
      const maximum = parseFloat(style.getPropertyValue('--product-menu-height')) || 224;
      const visibleTop = viewport?.offsetTop || 0;
      const visibleBottom = visibleTop + (viewport?.height || window.innerHeight);
      const top =
        Math.max(visibleTop, bounds?.top || 0, heading?.getBoundingClientRect().bottom || 0) +
        margin;
      const bottom = Math.min(visibleBottom, bounds?.bottom ?? visibleBottom) - margin;
      const below = Math.max(0, bottom - rect.bottom - gap);
      const above = Math.max(0, rect.top - gap - top);
      const list = popup.querySelector('ul');
      const contentHeight =
        (popup.querySelector('button')?.getBoundingClientRect().height || 0) +
        (list?.scrollHeight || 0) +
        (popup.querySelector('p')?.getBoundingClientRect().height || 0) +
        2;
      const upward = below < Math.min(maximum, contentHeight) && above > below;
      popup.dataset.placement = upward ? 'top' : 'bottom';
      // The table scroll area must not clip catalog choices.
      if (anchor.closest('.document-lines-scroll')) {
        const width = Math.min(Math.max(rect.width, 280), window.innerWidth - margin * 2);
        popup.style.position = 'fixed';
        popup.style.width = width + 'px';
        popup.style.minWidth = '0';
        popup.style.left =
          Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)) + 'px';
        popup.style.right = 'auto';
        popup.style.top = upward ? 'auto' : rect.bottom + gap + 'px';
        popup.style.bottom = upward ? window.innerHeight - rect.top + gap + 'px' : 'auto';
      }

      popup.style.setProperty(
        '--product-menu-available',
        `${Math.floor(upward ? above : below)}px`,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(anchor);
    observer.observe(popup);
    if (paper) observer.observe(paper);
    if (heading) observer.observe(heading);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
    };
  }, [root, menu, expanded]);
}
