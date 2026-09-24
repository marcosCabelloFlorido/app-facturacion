import type { StatusBadgeStatus } from './StatusBadge';
import { StatusPill } from './StatusPill';

const STATUS_VARIANT: Record<string, StatusBadgeStatus> = {
  Borrador: 'expired',
  Emitida: 'submitted',
  Pendiente: 'pending',
  Parcial: 'in_progress',
  Contabilizada: 'success',
  Confirmado: 'success',
  Aceptado: 'success',
  Aceptada: 'success',
  Aprobada: 'success',
  Aprobado: 'success',
  Convertido: 'success',
  Cobrada: 'success',
  Devuelta: 'success',
  Pagada: 'success',
  Rechazado: 'failed',
  Vencida: 'failed',
  Caducado: 'failed',
  Activo: 'success',
  Archivado: 'expired',
  Cobro: 'success',
  Pago: 'success',
  Revertido: 'failed',
};

export function DocumentStatusLabel({ status, tone }: { status: string; tone?: string }) {
  const variant: StatusBadgeStatus =
    STATUS_VARIANT[status] ?? (tone === 'solid' ? 'success' : tone === 'overdue' ? 'failed' : 'expired');
  return <StatusPill status={variant} label={status} />;
}
