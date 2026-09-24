import { useRef, useState } from 'react';
import { ArrowRight, Check, FileText, Send, Trash2, X } from 'lucide-react';
import { ActionsMenu } from './ActionsMenu';
import { IssueDocumentForm } from './IssueDocumentForm';
import { api, navigate, today } from './api';
import { workingDraftRoute, type DocumentListItem } from '../shared/document-list';
import type { FinancialDocument } from '../shared/domain';
import { quoteActions, type QuoteAction } from './quote-workflow';

const actions = {
  edit: { label: 'Continuar borrador', icon: FileText },
  issue: { label: 'Confirmar presupuesto', icon: Send },
  accept: { label: 'Marcar como aceptado', icon: Check },
  reject: { label: 'Marcar como rechazado', icon: X },
  convert: { label: 'Convertir en factura', icon: ArrowRight },
  invoice: { label: 'Ver factura creada', icon: ArrowRight },
};
export function QuoteRowActions({
  doc,
  onSaved,
  onError,
  onDiscard,
}: {
  doc: DocumentListItem;
  onSaved: (message: string, invoiceId?: string) => void;
  onError: (message: string) => void;
  onDiscard?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [issuing, setIssuing] = useState<FinancialDocument | null>(null);
  async function perform(action: QuoteAction) {
    if (lock.current) return;
    if (action === 'edit') {
      navigate('workingDraft' in doc ? workingDraftRoute(doc) : 'edit/' + doc.id);
      return;
    }
    if (action === 'invoice' && !('workingDraft' in doc) && doc.converted_id) {
      navigate(
        'document/' + doc.converted_id + '?from=' + encodeURIComponent(location.hash.slice(1)),
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    onError('');
    try {
      const fresh = await api<FinancialDocument>('/documents/' + doc.id);
      if (!quoteActions(fresh, today()).includes(action))
        throw new Error('El estado del presupuesto ha cambiado. Revisa las acciones disponibles.');
      if (action === 'issue') {
        setIssuing(fresh);
        return;
      }
      const result = await api<FinancialDocument>('/documents/' + doc.id + '/quote', {
        method: 'POST',
        body: { action, ...(action === 'convert' ? { date: today() } : {}) },
      });
      onSaved(
        action === 'convert'
          ? 'Borrador de factura creado.'
          : action === 'accept'
            ? 'Presupuesto aceptado.'
            : 'Presupuesto rechazado.',
        action === 'convert' ? result.id : undefined,
      );
    } catch (error) {
      onError((error as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <span aria-busy={busy}>
        <ActionsMenu
          label={
            'Acciones de ' +
            (doc.number || 'borrador') +
            ' de ' +
            (doc.party.name || 'destinatario pendiente')
          }
          items={[
            ...quoteActions(doc, today()).map((action) => ({
              ...actions[action],
              disabled: busy,
              onAction: () => void perform(action),
            })),
            doc.status === 'draft' &&
              !!onDiscard && {
                label: 'Descartar borrador',
                icon: Trash2,
                disabled: busy,
                onAction: onDiscard,
              },
          ]}
        />
        {busy && (
          <span className="sr-only" role="status">
            Actualizando presupuesto…
          </span>
        )}
      </span>
      {issuing && (
        <IssueDocumentForm
          doc={issuing}
          onClose={() => setIssuing(null)}
          onSaved={() => {
            setIssuing(null);
            onSaved('Presupuesto confirmado.');
          }}
        />
      )}
    </>
  );
}
