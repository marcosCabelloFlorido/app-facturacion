import type { StatusBadgeStatus } from './StatusBadge';

type StatusPillConfig = {
  label: string;
  dotColor: string;
};

export const statusPillConfig: Record<StatusBadgeStatus, StatusPillConfig> = {
  pending: { label: 'Pending', dotColor: '#F0A05A' },
  failed: { label: 'Failed', dotColor: '#D9705F' },
  success: { label: 'Success', dotColor: '#4CB86A' },
  in_progress: { label: 'In progress', dotColor: '#1A8FEA' },
  in_review: { label: 'In review', dotColor: '#EDAA1E' },
  expired: { label: 'Expired', dotColor: '#7A7A7A' },
  submitted: { label: 'Submitted', dotColor: '#6C3CF0' },
};

export function StatusPill({ status, label }: { status: StatusBadgeStatus; label?: string }) {
  const config = statusPillConfig[status];
  return (
    <span
      className="status-pill"
      style={{
        background: `color-mix(in srgb, ${config.dotColor} 16%, var(--bg))`,
        color: `color-mix(in srgb, ${config.dotColor} 65%, var(--text))`,
      }}
    >
      <span
        className="status-pill-dot"
        style={{ background: config.dotColor }}
        aria-hidden="true"
      />
      <span className="status-pill-text">{label ?? config.label}</span>
    </span>
  );
}
