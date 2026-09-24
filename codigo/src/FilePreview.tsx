import { Select } from './Select';
import { lazy, Suspense, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { api, downloadUrl } from './api';
import { ErrorBox, Field, Loading, Modal } from './components';
const PdfPages = lazy(() => import('./PdfPages'));
export type PreviewFile = { id: string; filename: string; mime?: string };
type TablePreview = {
  rows: string[][];
  sheets: string[];
  rowCount: number;
  columnCount: number;
  page: number;
  pageSize: number;
};

export function FilePreview({ file, onClose }: { file: PreviewFile; onClose: () => void }) {
  const [error, setError] = useState('');
  const ext = file.filename.split('.').at(-1)?.toLowerCase();
  const url = downloadUrl('/files/' + file.id + '?inline=1');
  return (
    <Modal
      title={file.filename}
      documentPreview
      className="attachment-preview"
      onClose={onClose}
      headerActions={
        <a
          className="icon-button icon-button-plain"
          href={downloadUrl('/files/' + file.id)}
          aria-label="Descargar archivo"
          title="Descargar archivo"
        >
          <Download size={18} aria-hidden="true" />
        </a>
      }
    >
      <div className="document-preview-body">
        {ext === 'pdf' ? (
          <Suspense fallback={<Loading />}>
            <PdfPages url={url} />
          </Suspense>
        ) : ['png', 'jpg', 'jpeg'].includes(ext || '') ? (
          error ? (
            <ErrorBox>{error}</ErrorBox>
          ) : (
            <div className="attachment-image">
              <img
                src={url}
                alt={file.filename}
                onError={() => setError('No se pudo cargar la imagen.')}
              />
            </div>
          )
        ) : ['csv', 'xlsx'].includes(ext || '') ? (
          <FileTable file={file} />
        ) : (
          <ErrorBox>Este formato no admite vista previa.</ErrorBox>
        )}
      </div>
    </Modal>
  );
}
function columnName(index: number): string {
  let value = index + 1,
    name = '';
  while (value > 0) {
    value--;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}
function FileTable({ file }: { file: PreviewFile }) {
  const [page, setPage] = useState(1),
    [sheet, setSheet] = useState(0),
    [delimiter, setDelimiter] = useState('auto'),
    [encoding, setEncoding] = useState('utf-8');
  const [table, setTable] = useState<TablePreview | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<TablePreview>(
      '/files/' +
        file.id +
        '/preview?' +
        new URLSearchParams({ page: String(page), sheet: String(sheet), delimiter, encoding }),
      { signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted) setTable(value);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message || 'No se pudo leer el archivo.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [file.id, page, sheet, delimiter, encoding, retry]);
  const csv = file.filename.toLowerCase().endsWith('.csv');
  const pages = Math.max(1, Math.ceil((table?.rowCount || 0) / 50));
  return (
    <>
      <div className="attachment-table-tools">
        {csv ? (
          <>
            <Field label="Separador">
              <Select
                value={delimiter}
                onChange={(e) => {
                  setDelimiter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="auto">Automático</option>
                <option value=";">Punto y coma</option>
                <option value=",">Coma</option>
                <option value={'\t'}>Tabulación</option>
              </Select>
            </Field>
            <Field label="Codificación">
              <Select
                value={encoding}
                onChange={(e) => {
                  setEncoding(e.target.value);
                  setPage(1);
                }}
              >
                <option value="utf-8">UTF-8</option>
                <option value="windows-1252">Windows-1252</option>
              </Select>
            </Field>
          </>
        ) : (
          table &&
          table.sheets.length > 1 && (
            <Field label="Hoja">
              <Select
                value={String(sheet)}
                onChange={(e) => {
                  setSheet(Number(e.target.value));
                  setPage(1);
                }}
              >
                {table.sheets.map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
          )
        )}
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <div>
          <ErrorBox>{error}</ErrorBox>
          <button className="button" onClick={() => setRetry((v) => v + 1)}>
            Reintentar
          </button>
        </div>
      ) : (
        table && (
          <>
            <div
              className="table-scroll attachment-table-scroll"
              role="region"
              aria-label="Contenido del archivo"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Fila</th>
                    {Array.from({ length: table.columnCount }, (_, i) => (
                      <th scope="col" key={i}>
                        {columnName(i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={index}>
                      <th scope="row">{(page - 1) * table.pageSize + index + 1}</th>
                      {Array.from({ length: table.columnCount }, (_, i) => (
                        <td key={i}>{row[i] || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {table.rowCount === 0 && <p>La hoja está vacía.</p>}
            </div>
            {pages > 1 && (
              <nav
                className="contact-pagination contact-pagination-icons"
                aria-label="Páginas del archivo"
              >
                <button
                  className="icon-button"
                  disabled={page === 1}
                  aria-label="Página anterior"
                  onClick={() => setPage((v) => v - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <span aria-live="polite">
                  Página {page} de {pages}
                </span>
                <button
                  className="icon-button"
                  disabled={page >= pages}
                  aria-label="Página siguiente"
                  onClick={() => setPage((v) => v + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </nav>
            )}
          </>
        )
      )}
    </>
  );
}
