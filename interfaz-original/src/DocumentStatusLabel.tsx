export function DocumentStatusLabel({ status, tone }: { status: string; tone?: string }) {
  const variant =
    tone ??
    ([
      'Cobrada',
      'Pagada',
      'Devuelta',
      'Aceptado',
      'Aceptada',
      'Confirmado',
      'Aprobada',
      'Aprobado',
    ].includes(status)
      ? 'solid'
      : ['Vencida', 'Caducado'].includes(status)
        ? 'overdue'
        : '');
  return (
    <span className={`badge document-status ${variant}`}>
      <span className="badge-dot" aria-hidden="true" />
      {status}
    </span>
  );
}
