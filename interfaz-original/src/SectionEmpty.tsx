import type { ReactNode } from 'react';

export function SectionEmpty({
  icon,
  message,
  action,
}: {
  icon: ReactNode;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-empty">
      {icon}
      <p>{message}</p>
      {action}
    </div>
  );
}
