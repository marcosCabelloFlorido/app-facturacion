import { useEffect, useRef, useState } from 'react';
import { Button, Tooltip, TooltipTrigger } from 'react-aria-components';
import type { FinancialDocument } from '../shared/domain';
import type { DocumentListItem } from '../shared/document-list';
import { api } from './api';
import { invoicePipelineSteps } from './invoice-pipeline';

export function InvoiceStatusPipeline({
  doc,
  status,
  header = false,
}: {
  doc: DocumentListItem;
  status: string;
  header?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openAtPress = useRef(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        clearTimeout(closeTimer.current);
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [open]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 80);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const [detail, setDetail] = useState<FinancialDocument | null>(null);
  const [error, setError] = useState(false);
  const working = 'workingDraft' in doc;
  const history = 'status_history' in doc ? doc.status_history : undefined;
  useEffect(() => {
    if (!open || working || history) return;
    let active = true;
    setError(false);
    setDetail(null);
    api<FinancialDocument>('/documents/' + doc.id).then(
      (value) => {
        if (active) setDetail(value);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [open, working, doc.id, history]);
  const phase =
    doc.status === 'draft'
      ? 0
      : doc.kind === 'quote'
        ? doc.status === 'converted'
          ? 3
          : ['accepted', 'rejected'].includes(doc.status)
            ? 2
            : 1
        : ['Cobrada', 'Pagada', 'Devuelta'].includes(status)
          ? 2
          : 1;
  const pointCount = doc.kind === 'quote' && ['accepted', 'converted'].includes(doc.status) ? 4 : 3;
  const title =
    doc.kind === 'invoice'
      ? 'Recorrido de la factura'
      : doc.kind === 'quote'
        ? 'Recorrido del presupuesto'
        : doc.kind === 'purchase'
          ? 'Recorrido de la compra'
          : 'Recorrido de la rectificativa';
  const steps = invoicePipelineSteps(history ?? detail?.status_history, status, doc.kind);
  return (
    <TooltipTrigger delay={250} closeDelay={80} isOpen={open} onOpenChange={setOpen}>
      <Button
        ref={triggerRef}
        onPointerDownCapture={() => {
          openAtPress.current = open;
        }}
        className={`invoice-pipeline-trigger${header ? ' invoice-pipeline-header' : ''}`}
        aria-label={`Estado: ${status}. ${title}`}
        onHoverStart={show}
        onHoverEnd={hide}
        onFocus={show}
        onBlur={hide}
        onPress={(event) => {
          clearTimeout(closeTimer.current);
          setOpen(event.pointerType === 'keyboard' ? !open : !openAtPress.current);
        }}
      >
        <span className="invoice-pipeline-track" aria-hidden="true">
          {Array.from({ length: pointCount }, (_, index) => index).map((index) => (
            <span
              key={index}
              className={`invoice-pipeline-point${index < phase ? ' is-past' : index === phase ? ' is-current' : ''}`}
            />
          ))}
        </span>
        {header && <span className="invoice-pipeline-label">{status}</span>}
      </Button>
      <Tooltip
        ref={popoverRef}
        className="invoice-pipeline-popover"
        placement={header ? 'bottom' : 'top'}
        shouldFlip={header}
        offset={header ? 8 : 16}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <div className="invoice-pipeline-title">{title}</div>
        {open && !working && !history && !detail && !error ? (
          <p role="status">Cargando historial…</p>
        ) : (
          <>
            {error && (
              <p role="status">
                No se pudo cargar el historial. Vuelve a abrir el recorrido para reintentar.
              </p>
            )}
            <ol className="invoice-pipeline-history">
              {steps.map((step, index) => (
                <li key={index} data-state={step.state}>
                  <span className="invoice-pipeline-history-dot" aria-hidden="true" />
                  <div>
                    <span>{step.label}</span>
                    <small>
                      {step.state === 'current'
                        ? 'Actual'
                        : step.state === 'next'
                          ? 'Pendiente'
                          : 'Completado'}
                      {step.date && (
                        <>
                          {' '}
                          ·{' '}
                          <time dateTime={step.date}>
                            {new Date(step.date).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </time>
                        </>
                      )}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </Tooltip>
    </TooltipTrigger>
  );
}
