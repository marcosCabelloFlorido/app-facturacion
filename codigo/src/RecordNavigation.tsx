import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ErrorBox } from './components';

export function RecordNavigation({
  label,
  collection,
  position,
  count,
  previous,
  next,
  previousAction,
  nextAction,
  loading = false,
  error = '',
  onRetry,
  context,
  variant = 'plain',
}: {
  label: string;
  collection: string;
  position?: number | null;
  count?: number;
  previous?: string;
  next?: string;
  previousAction?: () => void;
  nextAction?: () => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  context?: string;
  variant?: 'default' | 'plain';
}) {
  const arrow = (href: string | undefined, forward: boolean) => {
    const Icon = forward ? ChevronRight : ChevronLeft;
    const name = label + (forward ? ' siguiente' : ' anterior');
    const props = {
      className: 'icon-button document-navigation-arrow',
      'aria-label': name,
      title: name,
    };
    const action = forward ? nextAction : previousAction;
    const available = !loading && !error && !!position;
    return href && available ? (
      <a {...props} href={href}>
        <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
      </a>
    ) : (
      <button {...props} type="button" onClick={action} disabled={!action || !available}>
        <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
      </button>
    );
  };
  return (
    <nav
      className={
        'sales-document-navigation' + (variant === 'plain' ? ' document-navigation-plain' : '')
      }
      aria-label={'Recorrer ' + collection + ' del listado'}
    >
      {arrow(previous, false)}
      <span
        className={variant === 'plain' ? 'sr-only' : 'document-navigation-position'}
        role="status"
        aria-atomic="true"
      >
        {loading ? (
          <>
            <span aria-hidden="true">…</span>
            <span className="sr-only">Cargando recorrido</span>
          </>
        ) : !error && position ? (
          <>
            <span className="sr-only">{label} </span>
            <strong>{position}</strong>
            {count !== undefined && <span> de {count}</span>}
          </>
        ) : (
          <span aria-hidden="true">—</span>
        )}
      </span>
      {arrow(next, true)}
      {!loading && !error && position && context ? (
        <span className="sr-only">{context}</span>
      ) : null}
      {error && (
        <div className="document-navigation-message">
          <ErrorBox>{error}</ErrorBox>
          {onRetry && (
            <button
              className={variant === 'plain' ? 'button' : 'button dark-ghost'}
              type="button"
              onClick={onRetry}
            >
              Reintentar recorrido
            </button>
          )}
        </div>
      )}
      {!loading && !error && !position && (
        <span className="document-navigation-message" role="status">
          Este registro ya no coincide con los filtros.
        </span>
      )}
    </nav>
  );
}
