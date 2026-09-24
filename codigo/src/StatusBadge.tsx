import {
  AlertTriangle,
  CheckCircle,
  CircleDashed,
  Clock,
  ScanEye,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export type StatusBadgeStatus =
  | 'pending'
  | 'failed'
  | 'success'
  | 'in_progress'
  | 'in_review'
  | 'expired'
  | 'submitted';

type StatusBadgeConfig = {
  label: string;
  icon: LucideIcon;
  background: string;
  foreground: string;
};

export const statusBadgeConfig: Record<StatusBadgeStatus, StatusBadgeConfig> = {
  pending: { label: 'Pending', icon: AlertTriangle, background: '#FFF3E8', foreground: '#F0A05A' },
  failed: { label: 'Failed', icon: XCircle, background: '#FFEEEE', foreground: '#D9705F' },
  success: { label: 'Success', icon: CheckCircle, background: '#E8FBF1', foreground: '#4CB86A' },
  in_progress: {
    label: 'In progress',
    icon: CircleDashed,
    background: '#E0F1FF',
    foreground: '#1A8FEA',
  },
  in_review: { label: 'In review', icon: ScanEye, background: '#FFF8DC', foreground: '#EDAA1E' },
  expired: { label: 'Expired', icon: Clock, background: '#F3F3F3', foreground: '#7A7A7A' },
  submitted: { label: 'Submitted', icon: Clock, background: '#F2EFFF', foreground: '#6C3CF0' },
};

export function StatusBadge({ status, label }: { status: StatusBadgeStatus; label?: string }) {
  const config = statusBadgeConfig[status];
  const Icon = config.icon;
  return (
    <span
      className="status-badge"
      style={{ background: config.background, color: config.foreground }}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
      <span className="status-badge-text">{label ?? config.label}</span>
    </span>
  );
}
