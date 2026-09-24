import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, Paperclip, Trash2 } from 'lucide-react';
import { Button, DropZone, Tooltip, TooltipTrigger } from 'react-aria-components';
import { api } from './api';
import { FilePreview } from './FilePreview';
import { ErrorBox, Loading, PanelHeading, useRemote } from './components';
import { createUploadProgress } from './upload-progress';
import './files.css';
const fileHint = 'PDF, PNG, JPG, CSV o Excel · Máximo 5 MB por archivo';
type UploadItem = {
  key: number;
  filename: string;
  size: number;
  progress: number;
  status: 'queued' | 'uploading' | 'complete' | 'error';
  fileId?: string;
};
type DocumentFile = { id: string; filename: string; size: number };
export function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}
export async function uploadFile(file: File, documentId: string | null = null) {
  if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera 5 MB.');
  return api<{ id: string; filename: string }>('/files', {
    method: 'POST',
    body: { filename: file.name, data: await fileBase64(file), documentId },
  });
}
export function DocumentFiles({
  id,
  readonly,
  onChange,
}: {
  id: string;
  readonly: boolean;
  onChange?: () => void;
}) {
  const [preview, setPreview] = useState<DocumentFile | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const mounted = useRef(true);
  const animations = useRef(new Set<ReturnType<typeof createUploadProgress>>());
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      animations.current.forEach((animation) => animation.stop());
      animations.current.clear();
    };
  }, []);
  const hintId = useId();
  const [uploadStatus, setUploadStatus] = useState('');
  const attachButton = useRef<HTMLButtonElement>(null);
  const focusAfterUpload = useRef<DocumentFile[] | null | undefined>(undefined);

  const [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [fileAction, setFileAction] = useState<string | null>(null);

  const unavailable = busy || fileAction !== null;
  const {
    data,
    error: loadError,
    loading,
    setData,
  } = useRemote<DocumentFile[]>('/documents/' + id + '/files', revision);
  const empty = !loading && !loadError && data?.length === 0;
  const compact = !!data?.length || busy || uploads.some((item) => item.status === 'complete');
  useEffect(() => {
    if (!busy && data) {
      setUploads((items) => items.filter((item) => !data.some((file) => file.id === item.fileId)));
    }
  }, [data, busy]);
  useEffect(() => {
    if (
      focusAfterUpload.current !== undefined &&
      !loading &&
      !unavailable &&
      (focusAfterUpload.current === null || data !== focusAfterUpload.current)
    ) {
      focusAfterUpload.current = undefined;
      attachButton.current?.focus();
    }
  }, [data, loading, unavailable]);

  async function attachFiles(files: Array<File | Promise<File>>) {
    if (!files.length || readonly || unavailable || loading || loadError || uploading.current)
      return;
    uploading.current = true;
    setBusy(true);
    setError('');
    setUploads([]);
    const failures: string[] = [];
    const presentations: Promise<void>[] = [];
    let added = 0;
    const update = (key: number, patch: Partial<UploadItem>) => {
      if (mounted.current)
        setUploads((items) =>
          items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
        );
    };
    try {
      const selected = await Promise.allSettled(files);
      if (mounted.current)
        setUploads(
          selected.flatMap((item, key) =>
            item.status === 'fulfilled'
              ? [
                  {
                    key,
                    filename: item.value.name,
                    size: item.value.size,
                    progress: 0,
                    status: 'queued' as const,
                  },
                ]
              : [],
          ),
        );
      for (const [index, selectedFile] of selected.entries()) {
        if (mounted.current)
          setUploadStatus('Subiendo ' + (index + 1) + ' de ' + selected.length + '…');
        if (selectedFile.status === 'rejected') {
          failures.push('No se pudo leer el archivo ' + (index + 1) + '.');
          continue;
        }
        const file = selectedFile.value;
        update(index, { status: 'uploading' });
        const presentation = mounted.current
          ? createUploadProgress((progress) => {
              update(index, { progress, status: progress === 100 ? 'complete' : 'uploading' });
            })
          : null;
        if (presentation) animations.current.add(presentation);
        try {
          const saved = await uploadFile(file, id);
          update(index, { fileId: saved.id });
          added++;
          if (presentation)
            presentations.push(
              presentation.complete().finally(() => {
                animations.current.delete(presentation);
              }),
            );
        } catch (cause) {
          presentation?.stop();
          if (presentation) animations.current.delete(presentation);
          update(index, { status: 'error' });
          failures.push(file.name + ': ' + (cause as Error).message);
        }
      }
      // Network requests stay sequential; quick files animate together without delaying each request.
      await Promise.all(presentations);
      if (!mounted.current) return;
      setError(failures.join('\n'));
      setUploadStatus(
        added ? (added === 1 ? 'Archivo adjuntado.' : added + ' archivos adjuntados.') : '',
      );
      if (added) {
        setRevision((value) => value + 1);
        onChange?.();
      }
    } finally {
      uploading.current = false;
      if (mounted.current) {
        focusAfterUpload.current = added ? data : null;
        setBusy(false);
      }
    }
  }
  async function changeFile(file: DocumentFile) {
    if (unavailable || loading || uploading.current) return;
    setFileAction(file.id);
    setError('');
    try {
      await api(`/documents/${id}/files/${file.id}`, {
        method: 'DELETE',
      });
      focusAfterUpload.current = data;
      setData((files) => files?.filter((item) => item.id !== file.id) ?? null);
      setUploadStatus('Archivo retirado.');
      onChange?.();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setFileAction(null);
    }
  }
  return (
    <section
      className={`panel document-files${empty ? ' document-files-empty' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => event.preventDefault()}
    >
      <PanelHeading
        title="Archivos adjuntos"
        action={
          !readonly && !loadError && compact ? (
            <TooltipTrigger delay={400} isDisabled={unavailable || loading}>
              <Button
                ref={attachButton}
                type="button"
                className="icon-button icon-button-plain"
                aria-label="Adjuntar archivos"
                aria-describedby={hintId}
                aria-busy={busy}
                isDisabled={unavailable || loading}
                onPress={() => fileInput.current?.click()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} aria-hidden="true" />
                ) : (
                  <Paperclip size={18} aria-hidden="true" />
                )}
              </Button>
              <Tooltip className="ui-tooltip" placement="top">
                Adjuntar archivos · {fileHint}
              </Tooltip>
            </TooltipTrigger>
          ) : undefined
        }
      />
      <span className="sr-only" role="status">
        {uploadStatus}
      </span>
      {(error || loadError) && <ErrorBox>{error || loadError}</ErrorBox>}

      {loading && <Loading compact />}
      {!readonly && empty && !compact && (
        <DropZone
          className="document-files-dropzone"
          aria-label="Subir archivos adjuntos"
          aria-describedby={hintId}
          isDisabled={unavailable || loading}
          getDropOperation={() => 'copy'}
          onDrop={(event) => {
            const files = event.items.filter((item) => item.kind === 'file');
            if (!files.length) return;
            void attachFiles(files.map((file) => file.getFile()));
          }}
        >
          {({ isDropTarget }) => (
            <>
              {busy ? (
                <LoaderCircle className="spin" size={24} aria-hidden="true" />
              ) : (
                <Paperclip size={24} strokeWidth={1.5} aria-hidden="true" />
              )}
              <p className="document-files-dropzone-title">
                {busy
                  ? uploadStatus || 'Subiendo archivos…'
                  : isDropTarget
                    ? 'Suelta los archivos aquí'
                    : 'Arrastra tus archivos aquí'}
              </p>
              <TooltipTrigger delay={400} isDisabled={unavailable || loading}>
                <Button
                  ref={attachButton}
                  type="button"
                  className="button"
                  isDisabled={unavailable || loading}
                  onPress={() => fileInput.current?.click()}
                >
                  Seleccionar archivos
                </Button>
                <Tooltip className="ui-tooltip" placement="bottom">
                  {fileHint}
                </Tooltip>
              </TooltipTrigger>
            </>
          )}
        </DropZone>
      )}
      {uploads.length > 0 && (
        <ul className="document-upload-list" aria-label="Subidas de archivos">
          {uploads.map((item) => (
            <li className="document-upload-row" key={item.key}>
              <span className="document-upload-icon">
                <FileText size={20} aria-hidden="true" />
              </span>
              <div className="document-upload-content">
                <div className="document-upload-title">
                  <span>{item.filename}</span>
                  {item.status === 'complete' ? (
                    <CheckCircle2 size={18} aria-label="Completado" />
                  ) : item.status === 'error' ? (
                    <AlertCircle size={18} aria-label="Error" />
                  ) : (
                    <span className="document-upload-percent">{item.progress} %</span>
                  )}
                </div>
                <p className="document-upload-meta">
                  {Math.ceil(item.size / 1024)} KB ·{' '}
                  {item.status === 'complete'
                    ? 'Completado'
                    : item.status === 'error'
                      ? 'No se ha subido'
                      : item.status === 'queued'
                        ? 'En espera'
                        : 'Subiendo…'}
                </p>
                {item.status !== 'error' && (
                  <progress
                    className="document-upload-progress"
                    max={100}
                    value={item.progress}
                    aria-label={'Subida de ' + item.filename}
                    aria-valuetext={
                      item.status === 'complete' ? 'Completado' : item.progress + ' %'
                    }
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!!data?.length && (
        <div className="table-scroll">
          <table
            className="document-section-table document-attachments-table"
            aria-label="Archivos cargados"
          >
            <thead>
              <tr>
                <th scope="col">Archivo</th>
                <th scope="col" className="numeric">
                  Tamaño
                </th>
                {!readonly && (
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((f) => (
                <tr key={f.id}>
                  <td>
                    {' '}
                    <button
                      type="button"
                      className="document-file-open"
                      title={f.filename}
                      aria-haspopup="dialog"
                      onClick={() => setPreview(f)}
                    >
                      {f.filename}
                    </button>
                  </td>
                  <td className="numeric">{Math.ceil(f.size / 1024)} KB</td>
                  {!readonly && (
                    <td className="numeric">
                      {' '}
                      {!readonly && (
                        <TooltipTrigger delay={400} isDisabled={unavailable || loading}>
                          <Button
                            type="button"
                            className="icon-button icon-button-plain document-file-remove"
                            aria-label={`Eliminar ${f.filename}`}
                            isDisabled={unavailable || loading}
                            isPending={fileAction === f.id}
                            onPress={() => void changeFile(f)}
                          >
                            {fileAction === f.id ? (
                              <LoaderCircle className="spin" size={16} aria-hidden="true" />
                            ) : (
                              <Trash2 size={16} aria-hidden="true" />
                            )}
                          </Button>
                          <Tooltip className="ui-tooltip" placement="top">
                            Eliminar archivo
                          </Tooltip>
                        </TooltipTrigger>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!readonly && (
        <span className="sr-only" id={hintId}>
          {fileHint}
        </span>
      )}
      {!readonly && (
        <input
          ref={fileInput}
          className="document-file-input"
          hidden
          aria-label="Adjuntar archivo"
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
          disabled={unavailable}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            void attachFiles(files);
          }}
        />
      )}
      {preview && <FilePreview key={preview.id} file={preview} onClose={() => setPreview(null)} />}
    </section>
  );
}
