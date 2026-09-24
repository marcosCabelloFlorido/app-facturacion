import { lazy, Suspense, useEffect, useState } from 'react';
import { ErrorBox, Loading, Modal } from './components';
import './creation.css';
import { previewPdf } from './communication-download';
import type { DocumentInput } from '../shared/domain';

const PdfPages = lazy(() => import('./PdfPages'));

export function DocumentPreview({
  url,
  title,
  onClose,
  documentStyle = false,
  loading = false,
  error = '',
  onRetry,
}: {
  url?: string;
  title: string;
  onClose: () => void;
  documentStyle?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const source = url ? url + '#view=FitH&navpanes=0' : undefined;
  return (
    <Modal
      title={title}
      documentPreview
      className={documentStyle ? 'creation-dialog document-preview-creation' : undefined}
      onClose={onClose}
    >
      <div className="document-preview-body">
        <div className="document-preview-tools">
          {source && (
            <a
              className="icon-button icon-button-plain document-preview-pdf"
              href={source}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir PDF"
              title="Abrir PDF"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14 2H5v20h14V7l-5-5Z M14 2v5h5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M3 11h18v8H3z" fill="var(--bg-surface, #fff)" />
                <text
                  x="12"
                  y="17"
                  textAnchor="middle"
                  fill="currentColor"
                  fontFamily="Arial, sans-serif"
                  fontSize="7"
                  fontWeight="600"
                >
                  PDF
                </text>
              </svg>
            </a>
          )}
        </div>
        {loading && <Loading />}
        {error && (
          <div>
            <ErrorBox>{error}</ErrorBox>
            <button type="button" className="button" onClick={onRetry}>
              Reintentar
            </button>
          </div>
        )}
        {url && (
          <Suspense fallback={<Loading />}>
            <PdfPages key={url} url={url} />
          </Suspense>
        )}
      </div>
    </Modal>
  );
}

// Render the current editor snapshot without saving, numbering or issuing a document.
export function EditorDocumentPreview({
  snapshot,
  onClose,
}: {
  snapshot: { document: DocumentInput; documentId?: string };
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl('');
    setError('');
    previewPdf('/documents/preview', snapshot, controller.signal)
      .then((value) => {
        objectUrl = value;
        if (controller.signal.aborted) URL.revokeObjectURL(value);
        else setUrl(value);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : 'No se pudo preparar el PDF.');
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [snapshot, retry]);
  return (
    <DocumentPreview
      url={url}
      title="Vista previa"
      loading={!url && !error}
      error={error}
      onRetry={() => setRetry((v) => v + 1)}
      onClose={onClose}
    />
  );
}
