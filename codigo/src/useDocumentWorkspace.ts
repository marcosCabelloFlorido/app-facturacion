import { useEffect, useRef, useState } from 'react';
import { api, navigate, plusDays, today } from './api';
import { invoiceWithSystemDate } from './invoice-editor-date';
import type { DocumentInput, FinancialDocument, Product } from '../shared/domain';
import { contactParty, type Contact } from '../shared/contacts';
import { editorStepIndex, persistedEditorStep } from '../shared/editor-steps';

type Snapshot = { payload: DocumentInput; step: number; documentVersion: number | null };
type FinishAction = 'draft' | 'issue';
type Stored = Snapshot & {
  version: number;
  updated_at?: string;
  finishingVersion?: number;
  finishingAction?: FinishAction;
};
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
export function useDocumentWorkspace({
  id,
  kind,
  userId,
  workspaceId,
}: {
  id?: string;
  kind: DocumentInput['kind'];
  userId: string;
  workspaceId?: string;
}) {
  const [resource] = useState(() => {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const existing = params.get('work');
    if (
      existing &&
      /^(new:(invoice|quote|purchase)(:[0-9a-f-]{36})?|edit:[0-9a-f-]{36}(:[0-9a-f-]{36})?)$/.test(
        existing,
      )
    )
      return existing;
    const key = (id ? 'edit:' + id : 'new:' + kind) + ':' + crypto.randomUUID();
    params.set('work', key);
    history.replaceState(null, '', location.hash.split('?')[0] + '?' + params.toString());
    return key;
  });
  const path = '/working-drafts/' + encodeURIComponent(resource);
  const localKey = `kronjop.working:${userId}:${workspaceId || 'legacy'}:${resource}`;
  const initial: DocumentInput = {
    kind,
    date: today(),
    dueDate: plusDays(today(), 30),
    party: { name: '', taxId: '', address: '', email: '' },
    reference: '',
    notes: '',
    retentionRate: '0',
    lines: [
      {
        description: '',
        quantity: '1',
        unitPrice: '0',
        discount: '0',
        taxRate: '21',
        exemptionReason: '',
      },
    ],
  };
  const [data, setData] = useState<DocumentInput>(initial),
    [step, setStep] = useState(editorStepIndex(0, kind));
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState(''),
    [conflict, setConflict] = useState(false);
  const [retry, setRetry] = useState(0);
  const version = useRef(0),
    documentVersion = useRef<number | null>(null),
    saved = useRef('');
  const latest = useRef<Snapshot>({ payload: data, step, documentVersion: null });
  const queue = useRef<Promise<unknown>>(Promise.resolve()),
    blocked = useRef(false),
    closed = useRef(false),
    alive = useRef(true);
  const touched = useRef(false);
  const finishingVersion = useRef<number | undefined>(undefined);
  const finishingAction = useRef<FinishAction>('draft');
  const [pendingFinish, setPendingFinish] = useState<FinishAction | null>(null);
  const finishBody = () => ({
    version: finishingVersion.current,
    ...(finishingAction.current === 'issue' ? { action: 'issue' } : {}),
  });
  latest.current = {
    payload: data,
    step: persistedEditorStep(step, data.kind),
    documentVersion: documentVersion.current,
  };
  const persistLocal = (snapshot: Snapshot) => {
    try {
      localStorage.setItem(
        localKey,
        JSON.stringify({
          ...snapshot,
          version: version.current,
          finishingVersion: finishingVersion.current,
          finishingAction: finishingAction.current,
        }),
      );
      return true;
    } catch {
      return false;
    }
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    (async () => {
      let local: Stored | null = null;
      try {
        local = JSON.parse(localStorage.getItem(localKey) || 'null');
      } catch {}
      if (local?.finishingVersion) {
        finishingVersion.current = local.finishingVersion;
        finishingAction.current = local.finishingAction || 'draft';
        try {
          const completed = await api<FinancialDocument>(path + '/finish', {
            method: 'POST',
            workspaceId,
            body: finishBody(),
          });
          closed.current = true;
          localStorage.removeItem(localKey);
          navigate('document/' + completed.id);
          return;
        } catch (error) {
          const code = (error as { status: number }).status;
          if (!(code >= 400 && code < 500 && code !== 429)) throw error;
          finishingVersion.current = undefined;
          local.finishingVersion = undefined;
          localStorage.setItem(localKey, JSON.stringify(local));
        }
      }
      let fallback = initial;
      const customerFrom = new URLSearchParams(location.hash.split('?')[1] || '').get(
        'customerFrom',
      );
      if (id) {
        const d = await api<FinancialDocument>('/documents/' + id, { workspaceId });
        if (d.status !== 'draft' || d.kind === 'credit')
          throw new Error('Este documento ya no se puede editar.');
        fallback = {
          kind: d.kind,
          date: d.date,
          dueDate: d.due_date,
          operationDate: d.operation_date || d.date,
          registrationDate: d.registration_date || d.date,
          seriesCode: d.series_code,
          buyerFields: d.buyer_fields,
          party: d.party,
          reference: d.reference,
          notes: d.notes,
          retentionRate: d.retention_rate as DocumentInput['retentionRate'],
          lines: d.lines,
        };
        documentVersion.current = d.version;
      }
      const remote = await api<Stored | null>(path, { workspaceId });
      if (cancelled) return;
      if (
        !id &&
        !remote &&
        !local &&
        (kind === 'invoice' || kind === 'quote' || kind === 'purchase') &&
        customerFrom &&
        /^[0-9a-f-]{36}$/i.test(customerFrom)
      ) {
        const source = await api<FinancialDocument>('/documents/' + customerFrom, { workspaceId });
        if (cancelled) return;
        if (source.kind === kind) fallback = { ...initial, party: source.party };
      }
      let contactStep = 0;
      const contactId = new URLSearchParams(location.hash.split('?')[1] || '').get('contact');
      if (!id && !remote && !local && contactId) {
        if (!/^[0-9a-f-]{36}$/i.test(contactId)) throw new Error('El contacto no es válido.');
        const selected = await api<Contact>('/contacts/' + contactId, { workspaceId });
        if (cancelled) return;
        if (!selected.active)
          throw new Error('Recupera la ficha archivada antes de crear un documento.');
        const expected = kind === 'purchase' ? 'supplier' : 'customer';
        if (selected.type !== expected && selected.type !== 'both')
          throw new Error('El tipo de contacto no corresponde a este documento.');
        fallback = { ...initial, party: contactParty(selected) };
        contactStep = persistedEditorStep(1, kind);
      }
      const productId = new URLSearchParams(location.hash.split('?')[1] || '').get('product');
      if (!id && !remote && !local && productId) {
        const products = await api<Product[]>('/products', { workspaceId });
        if (cancelled) return;
        const product = products.find((item) => item.id === productId);
        if (!product?.active)
          throw new Error('Este artículo ya no está disponible en el catálogo.');
        fallback = {
          ...fallback,
          lines: [
            {
              description: product.description || product.name,
              quantity: '1',
              unitPrice: product.unitPrice,
              discount: '0',
              taxRate: product.taxRate,
              exemptionReason: product.exemptionReason,
            },
          ],
        };
      }
      version.current = remote?.version || 0;
      const remoteSnapshot: Snapshot = {
        payload: remote?.payload || fallback,
        step: remote?.step ?? contactStep,
        documentVersion:
          remote?.documentVersion ??
          (remote as unknown as { document_version?: number })?.document_version ??
          documentVersion.current,
      };
      const source =
        local &&
        local.payload &&
        Array.isArray(local.payload.lines) &&
        local.version === version.current
          ? local
          : remoteSnapshot;
      documentVersion.current = source.documentVersion;
      // Normalise legacy stages without creating an empty draft just by opening the form.
      saved.current = canonical({
        ...remoteSnapshot,
        step: persistedEditorStep(
          editorStepIndex(remoteSnapshot.step, remoteSnapshot.payload.kind),
          remoteSnapshot.payload.kind,
        ),
      });
      touched.current = !!remote || !!local;
      blocked.current = false;
      closed.current = false;
      setConflict(false);
      if (local && local.version !== version.current) {
        // Keep the local edits visible, but require an explicit choice before any overwrite.
        blocked.current = true;
        setConflict(true);
        setStatus('Hay cambios de otra pestaña. Tu copia local sigue disponible.');
        setData(local.payload);
        // Recover every field together, regardless of the saved step.
        setStep(editorStepIndex(local.step, local.payload.kind));
        documentVersion.current = local.documentVersion;
      } else {
        setData(invoiceWithSystemDate(source.payload));
        // Recover every field together, regardless of the saved step.
        setStep(editorStepIndex(source.step, source.payload.kind));
        setStatus(remote || local ? 'Borrador recuperado' : '');
      }
    })()
      .catch((e) => {
        if (!cancelled) setLoadError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, kind, userId, workspaceId, retry]);

  async function flush() {
    const work = queue.current
      .catch(() => {})
      .then(async () => {
        if (blocked.current) throw new Error('Revisa el conflicto antes de guardar.');
        if (closed.current || finishingVersion.current) return;
        const snapshot = latest.current;
        const serialized = canonical(snapshot);
        if (serialized === saved.current && version.current > 0) return;
        persistLocal(snapshot);
        if (alive.current) setStatus('Guardando…');
        try {
          const result = await api<{ version: number }>(path, {
            method: 'PUT',
            workspaceId,
            body: { ...snapshot, version: version.current },
          });
          version.current = result.version;
          saved.current = serialized;
          window.dispatchEvent(new Event('working-draft-saved'));
          persistLocal(latest.current);
          if (alive.current)
            setStatus(
              canonical(latest.current) === serialized ? 'Borrador guardado' : 'Guardando cambios…',
            );
        } catch (e) {
          if ((e as { status: number }).status === 409) {
            blocked.current = true;
            if (alive.current) setConflict(true);
          }
          if (alive.current) setStatus((e as Error).message);
          throw e;
        }
      });
    queue.current = work;
    return work;
  }
  useEffect(() => {
    if (loading || loadError || closed.current || blocked.current || finishingVersion.current)
      return;
    if (canonical(latest.current) === saved.current) return;
    touched.current = true;
    const localSaved = persistLocal(latest.current);
    setStatus(localSaved ? 'Cambios conservados en este dispositivo' : 'Cambios pendientes');
    const timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 650);
    return () => clearTimeout(timer);
  }, [data, step, loading, loadError]);
  useEffect(() => {
    const online = () => {
      if (touched.current && !closed.current) void flush().catch(() => {});
    };
    const leave = () => {
      if (touched.current && !closed.current) persistLocal(latest.current);
    };
    window.addEventListener('online', online);
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('pagehide', leave);
      leave();
      if (touched.current && !closed.current) void flush().catch(() => {});
    };
  }, []);
  async function finish(action: FinishAction = 'draft', payload?: DocumentInput) {
    if (finishingVersion.current && finishingAction.current !== action)
      throw new Error('Reintenta la operación pendiente antes de elegir otra acción.');
    if (!finishingVersion.current) {
      if (payload) {
        latest.current = { ...latest.current, payload };
        setData(payload);
      }
      await flush();
      finishingVersion.current = version.current;
      finishingAction.current = action;
      setPendingFinish(action);
      persistLocal(latest.current);
    }
    let result: FinancialDocument;
    try {
      result = await api<FinancialDocument>(path + '/finish', {
        method: 'POST',
        workspaceId,
        body: finishBody(),
      });
    } catch (error) {
      const code = (error as { status: number }).status;
      if (code >= 400 && code < 500 && code !== 429) {
        finishingVersion.current = undefined;
        setPendingFinish(null);
        persistLocal(latest.current);
      }
      throw error;
    }
    closed.current = true;
    try {
      localStorage.removeItem(localKey);
    } catch {}
    return result;
  }
  async function discard() {
    if (blocked.current || finishingVersion.current)
      throw new Error('Resuelve la operación pendiente antes de descartar el borrador.');
    // Finish queued saves first, then prevent autosave and unmount from recreating this work.
    await flush();
    closed.current = true;
    try {
      await queue.current;
      await api(path, {
        method: 'DELETE',
        workspaceId,
        body: { version: version.current },
      });
      try {
        localStorage.removeItem(localKey);
      } catch {}
      window.dispatchEvent(new Event('working-draft-saved'));
    } catch (error) {
      closed.current = false;
      if ((error as { status: number }).status === 409) {
        blocked.current = true;
        setConflict(true);
      }
      setStatus((error as Error).message);
      throw error;
    }
  }
  function reloadRemote() {
    try {
      localStorage.removeItem(localKey);
    } catch {}
    setRetry((v) => v + 1);
  }
  function downloadRecovery() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(latest.current, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'borrador-recuperacion.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return {
    data,
    setData,
    step,
    setStep,
    loading,
    loadError,
    status,
    conflict,
    pendingFinish,
    finish,
    discard,
    flush,
    retryLoad: () => setRetry((v) => v + 1),
    reloadRemote,
    downloadRecovery,
  };
}
