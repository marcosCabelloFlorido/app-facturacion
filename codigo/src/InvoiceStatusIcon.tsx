import {
  CircleCheck,
  CircleAlert,
  CircleSlash2,
  Circle,
  Clock3,
  FilePenLine,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

const statusIcons: Record<string, LucideIcon> = {
  Borrador: FilePenLine,
  Pendiente: Clock3,
  Parcial: CircleSlash2,
  Vencida: CircleAlert,
  Cobrada: CircleCheck,
  Devuelta: Undo2,
};

export function InvoiceStatusIcon({ status }: { status: string }) {
  const Icon = statusIcons[status] || Circle;
  return (
    <span className="invoice-status-icon" role="img" aria-label={status} title={status}>
      <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
    </span>
  );
}
