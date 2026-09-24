import { useState, type ReactNode } from 'react';
import { downloadUrl } from './api';
import { Modal, useRemote } from './components';

export function InvoiceLink({
  id,
  children,
  newTab = false,
}: {
  id: string;
  children: ReactNode;
  newTab?: boolean;
}) {
  return (
    <a
      className="invoice-reference"
      href={'#document/' + id + '?from=' + encodeURIComponent(location.hash.slice(1))}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      title={newTab ? 'Ver factura en otra pestaña' : 'Ver factura'}
    >
      {children}
    </a>
  );
}

type OriginalFile = { id: string; filename: string; mime: string };
export function OriginalInvoiceReference({ id, reference }: { id: string; reference: string }) {
  const { data, error } = useRemote<OriginalFile[]>('/documents/' + id + '/files');
  const [open, setOpen] = useState(false);
  if (error || !data?.length) return <>{reference}</>;
  const fileLink = (file: OriginalFile, label: string) => (
    <a
      className="invoice-reference"
      href={downloadUrl('/files/' + file.id + '?inline=1')}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir archivo adjunto en otra pestaña"
    >
      {label}
    </a>
  );
  if (data.length === 1) return fileLink(data[0], reference);
  return (
    <>
      <button
        type="button"
        className="invoice-reference"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Ver archivos adjuntos"
        onClick={() => setOpen(true)}
      >
        {reference}
      </button>
      {open && (
        <Modal title="Archivos adjuntos" onClose={() => setOpen(false)}>
          {data.map((file) => (
            <p key={file.id}>{fileLink(file, file.filename)}</p>
          ))}
        </Modal>
      )}
    </>
  );
}
