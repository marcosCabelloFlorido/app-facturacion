import { DocumentStatusLabel } from './DocumentStatusLabel';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useEffect,
  useContext,
  useId,
  useState,
  type ReactNode,
  type ReactElement,
  type RefObject,
} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Layers,
  LoaderCircle,
  X,
} from 'lucide-react';
import { api } from './api';
import { Select } from './Select';
import { ActionsMenu, type PageActions, type PageAction } from './ActionsMenu';
import { getDocumentStatus, type StatusDocument } from './document-status';
import { useModalDialog } from './useModalDialog';
import { FeatureDesignContext } from './feature-design-context';
import { featureIcon } from './feature-icons';

export function useRemote<T>(path: string, revision = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<T>(path, { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);
  return { data, error, loading, setData };
}
export function Loading({ compact = false }: { compact?: boolean } = {}) {
  return (
    <div className={`loading${compact ? ' loading-compact' : ''}`} role="status">
      <LoaderCircle className="spin" size={20} /> Cargando datos…
    </div>
  );
}
export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
  compact = false,
  showMessage = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  /** Mensaje explícito para búsquedas, errores o acciones sin registros elegibles. */
  showMessage?: boolean;
}) {
  if (!showMessage) return <>{action}</>;
  return (
    <div className={`empty${compact ? ' empty-compact' : ''}`}>
      <div className="empty-icon">
        <FileText size={25} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Badge({ doc }: { doc: StatusDocument }) {
  const { text, type } = getDocumentStatus(doc);
  return <DocumentStatusLabel status={text} tone={type} />;
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
  sidePanel = false,
  documentPreview = false,
  headerLeading,
  headerActions,
  className = '',
  restoreFocus = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  sidePanel?: boolean;
  documentPreview?: boolean;
  headerLeading?: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  restoreFocus?: boolean;
}) {
  const ref = useModalDialog({ restoreFocus });
  const titleId = useId();
  const descriptionId = useId();
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}${sidePanel ? ' side-panel' : ''}${documentPreview ? ' document-preview' : ''} ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== ref.current) return;
        const bounds = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < bounds.left ||
          e.clientX > bounds.right ||
          e.clientY < bounds.top ||
          e.clientY > bounds.bottom
        )
          onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="modal-head">
        {headerLeading && <div className="modal-header-leading">{headerLeading}</div>}
        <div className="modal-title">
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        {headerActions && <div className="modal-header-actions">{headerActions}</div>}
        <button
          type="button"
          className="icon-button modal-close-button"
          onClick={onClose}
          aria-label="Cerrar ventana"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
  className = '',
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
  error?: string;
}) {
  const messageId = useId();
  const bindDescription = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (node) => {
      if (!isValidElement(node)) return node;
      const child = node as ReactElement<{
        children?: ReactNode;
        'aria-describedby'?: string;
        'aria-invalid'?: boolean;
        'aria-labelledby'?: string;
      }>;
      if (
        child.type === Select ||
        (typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type))
      ) {
        return cloneElement(child, {
          ...(child.type === Select
            ? { 'aria-labelledby': child.props['aria-labelledby'] ?? messageId + '-label' }
            : {}),
          'aria-describedby':
            [
              child.props['aria-describedby'],
              hint ? messageId + '-hint' : '',
              error ? messageId + '-error' : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          'aria-invalid': error ? true : child.props['aria-invalid'],
        });
      }
      return child.props.children
        ? cloneElement(child, {}, bindDescription(child.props.children))
        : child;
    });
  return (
    <div className={`field ${className} ${error ? 'field-error' : ''}`}>
      <label>
        <span className="field-label" id={messageId + '-label'}>
          {label}
        </span>
        {bindDescription(children)}
      </label>
      {hint && <small id={messageId + '-hint'}>{hint}</small>}
      {error && (
        <small id={messageId + '-error'} className="field-error-message" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

export const ModuleHeaderContext = createContext<{ tools?: ReactNode }>({});

export function PageHeading({
  eyebrow,
  title,
  titleLink,
  hideTitle = false,
  backLink,
  subtitleLink,
  description,
  metadata,
  actions,
  status,
  navigation,
  menu,
  primaryAction,
  tools: localTools,
  menuTriggerRef,
  variant = 'module',
  hiddenFeatureShortcuts = [],
}: {
  eyebrow?: string;
  title: string;
  titleLink?: { href: string; label: string; onAction?: () => void };
  hideTitle?: boolean;
  backLink?: { href: string; label: string; onAction?: () => void };
  subtitleLink?: { href: string; label: string };
  description?: string;
  metadata?: ReactNode;
  actions?: ReactNode;
  status?: ReactNode;
  navigation?: ReactNode;
  menu?: PageActions;
  primaryAction?: PageAction | false;
  tools?: ReactNode;
  menuTriggerRef?: RefObject<HTMLButtonElement | null>;
  variant?: 'module' | 'greeting' | 'document';
  hiddenFeatureShortcuts?: string[];
}) {
  const { tools } = useContext(ModuleHeaderContext);
  const featureDesign = useContext(FeatureDesignContext);
  const documentHeading = variant === 'document';
  const headingMetadata = metadata && <p className="module-heading-metadata">{metadata}</p>;
  const headingStatus = status && <div className="module-status">{status}</div>;
  const menuActions: PageActions = [
    primaryAction && { group: 'Crear', ...primaryAction },
    ...(menu ?? []).filter((item) => !primaryAction || !item || item.label !== primaryAction.label),
    ...(featureDesign?.shortcuts
      .filter((item) => !hiddenFeatureShortcuts.includes(item.id))
      .map((item) => ({
        label: item.title,
        group: 'Más funciones',
        icon: featureIcon(item),
        onAction: () => featureDesign.open(item.id),
      })) ?? []),
    featureDesign && {
      label: 'Más funciones',
      group: 'Más funciones',
      icon: Layers,
      onAction: () => featureDesign.open(),
    },
  ];
  return (
    <header
      className={`page-heading${variant === 'greeting' ? ' greeting-heading' : documentHeading ? ' document-heading' : ''}`}
      data-module-header
    >
      <div className="module-title-row">
        <div className="module-title">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className={hideTitle ? 'sr-only' : undefined}>
            {titleLink && !hideTitle ? (
              <a
                className="module-title-link"
                href={titleLink.href}
                title={titleLink.label}
                onClick={(event) => {
                  if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
                    titleLink.onAction?.();
                }}
              >
                {title}
              </a>
            ) : (
              title
            )}
          </h1>
          {backLink && (
            <a
              className="module-subtitle-link module-back-link"
              href={backLink.href}
              aria-label={backLink.label === 'Atrás' ? 'Atrás' : 'Volver a ' + backLink.label}
              onClick={(event) => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
                  backLink.onAction?.();
              }}
            >
              <ArrowLeft size={14} strokeWidth={1.6} aria-hidden="true" />
              <span>{backLink.label}</span>
            </a>
          )}
          {description && <p>{description}</p>}
          {!documentHeading && headingMetadata}
          {/* FUENTE: 03-module-header.md, AbsencesModule.tsx:2865–2880;
              05-button.md, components/ui/button.tsx:7–31. Enlace bajo el título aprobado. */}
          {subtitleLink && (
            <a className="module-subtitle-link" href={subtitleLink.href}>
              <span>{subtitleLink.label}</span>
              <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" />
            </a>
          )}
        </div>
        <div className="heading-actions">
          {localTools === undefined ? tools : localTools}
          {actions}
          <ActionsMenu
            items={menuActions}
            label={`Acciones de ${title}`}
            light
            triggerRef={menuTriggerRef}
          />
        </div>
      </div>
      {/* 03-module-header.md: ficha compacta aprobada, fecha y estado en la misma fila. */}
      {documentHeading
        ? (metadata || status) && (
            <div className="module-heading-details">
              {headingMetadata}
              {headingStatus}
            </div>
          )
        : headingStatus}
      {navigation && <div className="module-document-navigation">{navigation}</div>}
    </header>
  );
}
export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a className="text-link" href={'#' + to}>
      {children}
    </a>
  );
}
export function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button className="button primary" type="submit" disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} {children}
    </button>
  );
}
export type NoticeAction = { label: string; to: string };
export type Notify = (message: string, action?: NoticeAction) => void;
