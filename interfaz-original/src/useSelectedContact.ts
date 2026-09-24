import { useEffect, useState } from 'react';
import type { Contact } from '../shared/contacts';
import { api } from './api';

export function useSelectedContact(reference: string, revision: number) {
  const [state, setState] = useState({
    reference: '',
    revision: -1,
    contact: null as Contact | null,
    error: '',
    loading: false,
  });

  useEffect(() => {
    if (!reference) return;
    const controller = new AbortController();
    setState({ reference, revision, contact: null, error: '', loading: true });
    const request = reference.startsWith('tax:')
      ? api<{ contact: Contact | null }>(
          '/contacts/lookup?taxId=' + encodeURIComponent(reference.slice(4)),
          { signal: controller.signal },
        ).then((result) => result.contact)
      : api<Contact>('/contacts/' + encodeURIComponent(reference), { signal: controller.signal });
    request
      .then((contact) => {
        if (controller.signal.aborted) return;
        setState({
          reference,
          revision,
          contact,
          error: contact ? '' : 'No se encuentra la ficha de este cliente.',
          loading: false,
        });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setState({ reference, revision, contact: null, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [reference, revision]);

  const current = !!reference && state.reference === reference && state.revision === revision;
  return {
    contact: current ? state.contact : null,
    error: current ? state.error : '',
    loading: !!reference && (!current || state.loading),
  };
}
