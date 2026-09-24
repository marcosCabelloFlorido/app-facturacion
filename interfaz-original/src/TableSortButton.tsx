import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export function TableSortButton({
  label,
  direction,
  onToggle,
}: {
  label: string;
  direction?: 'ascending' | 'descending';
  onToggle: () => void;
}) {
  const Icon =
    direction === 'descending'
      ? ChevronDown
      : direction === 'ascending'
        ? ChevronUp
        : ChevronsUpDown;
  const action =
    'Ordenar por ' +
    label.toLowerCase() +
    (direction === 'descending' ? ' de menor a mayor' : ' de mayor a menor');
  return (
    <button
      type="button"
      className={'table-sort-button' + (direction ? ' is-sorted' : '')}
      onClick={onToggle}
      aria-label={action}
      title={action}
    >
      <span>{label}</span>
      <Icon size={13} strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
}
