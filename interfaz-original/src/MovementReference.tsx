// Labels produced by the demo seed carry no operation-specific information.
export function visibleMovementReference(value?: string | null): string {
  const reference = value?.trim() || '';
  if (
    /^(?:(?:pago|cobro) ficticio(?: · DEMO-[A-Z0-9-]+)?|(?:pago|cobro) de demostración)$/i.test(
      reference,
    )
  )
    return '';
  return reference === 'Primer plazo · DEMO' ? 'Primer plazo' : reference;
}

export function MovementReference({
  value,
  as: Tag = 'small',
  prefix = '',
}: {
  value?: string | null;
  as?: 'small' | 'span';
  prefix?: string;
}) {
  const reference = visibleMovementReference(value);
  return reference ? <Tag>{prefix + reference}</Tag> : null;
}
