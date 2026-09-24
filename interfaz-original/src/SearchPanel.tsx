import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from './components';

// Both header searches share the same animation and native dialog lifecycle.
export function useSearchPanel() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const pending = useRef(false);
  const afterClose = useRef<(() => void) | undefined>(undefined);
  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback((action?: () => void) => {
    if (pending.current) return;
    pending.current = true;
    afterClose.current = action;
    setClosing(true);
  }, []);
  useEffect(() => {
    if (!closing) return;
    const finish = () => {
      setOpen(false);
      setClosing(false);
      pending.current = false;
      const action = afterClose.current;
      afterClose.current = undefined;
      action?.();
    };
    finish();
  }, [closing]);
  return { open, closing, openSearch, closeSearch };
}

export function SearchPanel({
  title,
  closing,
  onClose,
  children,
}: {
  title: string;
  closing: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      title={title}
      onClose={() => onClose()}
      className={`command-dialog${closing ? ' is-closing' : ''}`}
    >
      {children}
    </Modal>
  );
}
