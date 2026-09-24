import { useLayoutEffect, useRef } from 'react';

let openDialogs = 0;
let originalOverflow = '';

// A contact lookup can open a second dialog inside the advance or directory window.
// Restore scrolling only after the last dialog closes, regardless of cleanup order.
export function useModalDialog({ restoreFocus = true }: { restoreFocus?: boolean } = {}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Open the top layer and its backdrop before the underlying content can paint.
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    if (openDialogs++ === 0) originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      if (--openDialogs === 0) document.body.style.overflow = originalOverflow;
      if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [restoreFocus]);
  return ref;
}
