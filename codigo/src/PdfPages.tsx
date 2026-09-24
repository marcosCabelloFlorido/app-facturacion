import { useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ErrorBox, Loading } from './components';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPages({ url }: { url: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setPdf(null);
    setError('');
    const task = getDocument({ url, withCredentials: true });
    task.promise
      .then((value) => {
        if (active) setPdf(value);
      })
      .catch(() => {
        if (active) setError('No se pudo cargar el PDF.');
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [url, retry]);
  return (
    <div className="pdf-pages" role="region" aria-label="Vista previa PDF" tabIndex={0}>
      {error ? (
        <div>
          <ErrorBox>{error}</ErrorBox>
          <button type="button" className="button" onClick={() => setRetry((v) => v + 1)}>
            Reintentar
          </button>
        </div>
      ) : !pdf ? (
        <Loading />
      ) : (
        Array.from({ length: pdf.numPages }, (_, index) => (
          <PdfPage key={url + ':' + retry + ':' + index} pdf={pdf} number={index + 1} />
        ))
      )}
    </div>
  );
}

function PdfPage({ pdf, number }: { pdf: PDFDocumentProxy; number: number }) {
  const host = useRef<HTMLElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [width, setWidth] = useState(0);
  const [text, setText] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.floor(entries[0].contentRect.width)),
    );
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    pdf
      .getPage(number)
      .then(async (value) => {
        if (!active) return;
        setPage(value);
        const content = await value.getTextContent();
        if (active)
          setText(
            content.items
              .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
              .join(''),
          );
      })
      .catch(() => {
        if (active) setError('No se pudo leer esta página. Abre el PDF para consultarla.');
      });
    return () => {
      active = false;
    };
  }, [pdf, number]);
  useEffect(() => {
    if (!page || !width) return;
    let active = true;
    setReady(false);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(viewport.width * density);
    canvas.height = Math.ceil(viewport.height * density);
    const task = page.render({ canvas, viewport, transform: [density, 0, 0, density, 0, 0] });
    task.promise
      .then(() => {
        if (!active) return;
        const old = host.current?.querySelector('canvas');
        if (old) old.replaceWith(canvas);
        else host.current?.append(canvas);
        setReady(true);
      })
      .catch((reason) => {
        if (active && reason.name !== 'RenderingCancelledException')
          setError('No se pudo mostrar esta página. Abre el PDF para consultarla.');
      });
    return () => {
      active = false;
      task.cancel();
    };
  }, [page, width]);
  return (
    <section
      ref={host}
      className="pdf-page"
      aria-label={`Página ${number} de ${pdf.numPages}`}
      data-rendered={ready || undefined}
    >
      <span className="sr-only">{text}</span>
      {error ? <ErrorBox>{error}</ErrorBox> : !ready && <Loading />}
    </section>
  );
}
