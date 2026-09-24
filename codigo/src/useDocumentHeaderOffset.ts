import { useLayoutEffect, type RefObject } from 'react';

/** Keep scroll and sticky actions below the document header at its rendered height. */
export function useDocumentHeaderOffset(form: RefObject<HTMLFormElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const heading = form.current
      ?.closest('main')
      ?.querySelector<HTMLElement>(':scope > .page-heading');
    if (!heading) return;
    const root = document.documentElement;
    const property = '--document-editor-heading-height';
    const previous = root.style.getPropertyValue(property);
    const priority = root.style.getPropertyPriority(property);
    const update = () =>
      root.style.setProperty(property, `${heading.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(heading);
    return () => {
      observer.disconnect();
      if (previous) root.style.setProperty(property, previous, priority);
      else root.style.removeProperty(property);
    };
  }, [form, enabled]);
}
